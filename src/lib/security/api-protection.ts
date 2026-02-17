import { NextRequest, NextResponse } from 'next/server'
import { validateCSRFForAPI } from './csrf'
import { rateLimitMiddleware, getRateLimitConfig } from './rate-limit'
import { logSecurityEvent } from './index'

/**
 * API Route Protection Wrapper
 * 
 * Provides comprehensive security protection for API routes including:
 * - CSRF token validation for state-changing operations
 * - Rate limiting based on endpoint type
 * - Security event logging
 * - Input validation helpers
 */

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

interface RouteHandler {
  (request: NextRequest, context?: Record<string, unknown>): Promise<NextResponse> | NextResponse
}

interface ProtectedRouteOptions {
  requireCSRF?: boolean
  rateLimit?: boolean
  methods?: HTTPMethod[]
  skipValidation?: (request: NextRequest) => boolean
}

/**
 * Wrap an API route with security protections
 */
export function withSecurity(
  handler: RouteHandler,
  options: ProtectedRouteOptions = {}
) {
  const {
    requireCSRF = true,
    rateLimit = true,
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    skipValidation,
  } = options

  return async (request: NextRequest, context?: Record<string, unknown>): Promise<NextResponse> => {
    try {
      // Check if method is allowed
      if (!methods.includes(request.method as HTTPMethod)) {
        return NextResponse.json(
          { error: `Method ${request.method} not allowed` },
          { status: 405 }
        )
      }

      // Skip validation if custom condition is met
      if (skipValidation && skipValidation(request)) {
        return handler(request, context)
      }

      // Apply rate limiting
      if (rateLimit) {
        const rateLimitConfig = getRateLimitConfig(request.nextUrl.pathname)
        const rateLimitResult = rateLimitMiddleware(request, rateLimitConfig)
        
        if (rateLimitResult && rateLimitResult.status === 429) {
          logSecurityEvent({
            type: 'rate_limit_exceeded',
            ip: getClientIP(request),
            userAgent: request.headers.get('user-agent') || undefined,
            path: request.nextUrl.pathname,
            details: { method: request.method },
          })
          return rateLimitResult
        }
      }

      // Apply CSRF protection for state-changing operations
      if (requireCSRF) {
        const csrfValidation = validateCSRFForAPI(request)
        
        if (!csrfValidation.valid) {
          logSecurityEvent({
            type: 'csrf_violation',
            ip: getClientIP(request),
            userAgent: request.headers.get('user-agent') || undefined,
            path: request.nextUrl.pathname,
            details: { 
              method: request.method,
              error: csrfValidation.error,
            },
          })
          
          return NextResponse.json(
            { 
              error: 'CSRF validation failed',
              details: csrfValidation.error,
            },
            { status: 403 }
          )
        }
      }

      // Call the actual handler
      const response = await handler(request, context)
      
      // Add security headers to response
      addSecurityHeaders(response)
      
      return response

    } catch (error) {
      console.error('API route security error:', error)
      
      logSecurityEvent({
        type: 'suspicious_activity',
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        path: request.nextUrl.pathname,
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          method: request.method,
        },
      })
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Add security headers to API responses
 */
function addSecurityHeaders(response: NextResponse): void {
  // Prevent caching of sensitive API responses
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  
  // Content type security
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Prevent embedding in frames
  response.headers.set('X-Frame-Options', 'DENY')
  
  // XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
}

/**
 * Validate request body size and content type
 */
export async function validateRequestBody(
  request: NextRequest,
  options: {
    maxSize?: number
    allowedContentTypes?: string[]
  } = {}
): Promise<{ valid: boolean; error?: string; data?: unknown }> {
  const { maxSize = 1024 * 1024, allowedContentTypes = ['application/json'] } = options
  
  try {
    const contentType = request.headers.get('content-type')
    
    if (!contentType || !allowedContentTypes.some(type => contentType.includes(type))) {
      return {
        valid: false,
        error: `Content-Type must be one of: ${allowedContentTypes.join(', ')}`,
      }
    }
    
    const body = await request.text()
    
    if (body.length > maxSize) {
      return {
        valid: false,
        error: `Request body too large. Maximum size: ${maxSize} bytes`,
      }
    }
    
    if (contentType.includes('application/json')) {
      try {
        const data = JSON.parse(body)
        return { valid: true, data }
      } catch {
        return {
          valid: false,
          error: 'Invalid JSON in request body',
        }
      }
    }
    
    return { valid: true, data: body }
    
  } catch {
    return {
      valid: false,
      error: 'Failed to read request body',
    }
  }
}

/**
 * Predefined security configurations for common API patterns
 */
export const securityConfigs = {
  // Public read-only endpoints
  publicRead: {
    requireCSRF: false,
    rateLimit: true,
    methods: ['GET', 'HEAD', 'OPTIONS'] as HTTPMethod[],
  },
  
  // Protected CRUD operations
  protectedCRUD: {
    requireCSRF: true,
    rateLimit: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HTTPMethod[],
  },
  
  // Authentication endpoints
  auth: {
    requireCSRF: true,
    rateLimit: true,
    methods: ['POST'] as HTTPMethod[],
  },
  
  // File upload endpoints
  upload: {
    requireCSRF: true,
    rateLimit: true,
    methods: ['POST', 'PUT'] as HTTPMethod[],
  },
  
  // Health check and monitoring
  monitoring: {
    requireCSRF: false,
    rateLimit: false,
    methods: ['GET', 'HEAD'] as HTTPMethod[],
  },
} as const

/**
 * Example usage in API routes:
 * 
 * ```typescript
 * import { withSecurity, securityConfigs } from '@/lib/security/api-protection'
 * 
 * async function handler(request: NextRequest) {
 *   // Your API logic here
 *   return NextResponse.json({ success: true })
 * }
 * 
 * export const POST = withSecurity(handler, securityConfigs.protectedCRUD)
 * export const GET = withSecurity(handler, securityConfigs.publicRead)
 * ```
 */