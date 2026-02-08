import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

/**
 * CSRF Protection Utilities
 * 
 * Implements Cross-Site Request Forgery (CSRF) protection using the double-submit cookie pattern.
 * This provides protection against CSRF attacks by ensuring that state-changing requests
 * include a valid CSRF token.
 */

const CSRF_TOKEN_HEADER = 'x-csrf-token'
const CSRF_COOKIE_NAME = '__csrf-token'
const CSRF_TOKEN_LENGTH = 32

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * Create a hash of the CSRF token for comparison
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Check if a request path should be exempt from CSRF protection
 */
function isCSRFExempt(pathname: string): boolean {
  const exemptPaths = [
    '/api/health',           // Health check endpoint
    '/api/auth/callback',    // OAuth callback
    '/auth/callback',        // Supabase auth callback
  ]
  
  return exemptPaths.some(path => pathname.startsWith(path))
}

/**
 * Validate CSRF token using double-submit cookie pattern
 */
export function validateCSRFToken(request: NextRequest): boolean {
  // Skip CSRF validation for safe HTTP methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(request.method)) {
    return true
  }

  // Skip CSRF validation for specific exempt paths
  if (isCSRFExempt(request.nextUrl.pathname)) {
    return true
  }

  // For API routes, require CSRF token for state-changing operations
  // This ensures all POST/PUT/PATCH/DELETE operations are protected
  const tokenFromHeader = request.headers.get(CSRF_TOKEN_HEADER)
  const tokenFromCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value

  if (!tokenFromHeader || !tokenFromCookie) {
    return false
  }

  // Compare hashed versions to prevent timing attacks
  const headerHash = hashToken(tokenFromHeader)
  const cookieHash = hashToken(tokenFromCookie)

  return headerHash === cookieHash
}

/**
 * Add CSRF token to response cookies
 */
export function setCSRFToken(response: NextResponse, token: string): NextResponse {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be accessible to JavaScript for form submission
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })

  return response
}

/**
 * Get CSRF token from request cookies
 */
export function getCSRFToken(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null
}

/**
 * CSRF middleware for Next.js
 */
export function csrfMiddleware(request: NextRequest): NextResponse | null {
  // Generate and set CSRF token for new sessions
  const existingToken = getCSRFToken(request)
  
  if (!existingToken) {
    const newToken = generateCSRFToken()
    const response = NextResponse.next()
    return setCSRFToken(response, newToken)
  }

  // Validate CSRF token for state-changing requests
  if (!validateCSRFToken(request)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }

  return null // Continue with request
}

/**
 * Server-side CSRF validation for API routes
 */
export function validateCSRFForAPI(request: NextRequest): { valid: boolean; error?: string } {
  // Skip validation for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(request.method)) {
    return { valid: true }
  }

  // Skip validation for exempt paths
  if (isCSRFExempt(request.nextUrl.pathname)) {
    return { valid: true }
  }

  const tokenFromHeader = request.headers.get(CSRF_TOKEN_HEADER)
  const tokenFromCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value

  if (!tokenFromHeader) {
    return { 
      valid: false, 
      error: 'CSRF token missing from request headers. Include x-csrf-token header.' 
    }
  }

  if (!tokenFromCookie) {
    return { 
      valid: false, 
      error: 'CSRF token missing from cookies. Ensure cookies are enabled.' 
    }
  }

  // Validate token match
  const headerHash = hashToken(tokenFromHeader)
  const cookieHash = hashToken(tokenFromCookie)

  if (headerHash !== cookieHash) {
    return { 
      valid: false, 
      error: 'CSRF token mismatch. Request may be from unauthorized source.' 
    }
  }

  return { valid: true }
}

/**
 * Client-side CSRF token utilities
 */
export const csrfClient = {
  /**
   * Get CSRF token from cookies (client-side)
   */
  getToken(): string | null {
    if (typeof document === 'undefined') return null
    
    const cookies = document.cookie.split(';')
    const csrfCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${CSRF_COOKIE_NAME}=`)
    )
    
    return csrfCookie ? csrfCookie.split('=')[1] : null
  },

  /**
   * Add CSRF token to fetch headers
   */
  addTokenToHeaders(headers: HeadersInit = {}): HeadersInit {
    const token = this.getToken()
    if (!token) return headers

    return {
      ...headers,
      [CSRF_TOKEN_HEADER]: token,
    }
  },

  /**
   * Create fetch wrapper with CSRF protection
   */
  fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = this.addTokenToHeaders(options.headers)
    
    return fetch(url, {
      ...options,
      headers,
    })
  },
}

/**
 * React hook for CSRF token
 */
export function useCSRFToken(): string | null {
  if (typeof window === 'undefined') return null
  return csrfClient.getToken()
}