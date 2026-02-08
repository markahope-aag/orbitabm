import { NextRequest, NextResponse } from 'next/server'

/**
 * Rate Limiting Implementation
 * 
 * Implements rate limiting using a sliding window algorithm with in-memory storage.
 * For production, consider using Redis or another distributed cache.
 */

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Maximum requests per window
  message?: string      // Custom error message
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean     // Don't count failed requests
}

interface RateLimitEntry {
  count: number
  resetTime: number
  requests: number[]
}

// In-memory storage for rate limiting
// In production, use Redis or another distributed cache
const rateLimitStore = new Map<string, RateLimitEntry>()

// Default rate limit configurations for different endpoint types
export const rateLimitConfigs = {
  // Authentication endpoints - stricter limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later.',
  },
  
  // API endpoints - moderate limits
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many API requests, please slow down.',
  },
  
  // File upload endpoints - stricter limits
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many upload requests, please wait before uploading again.',
  },
  
  // General endpoints - lenient limits
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200,
    message: 'Too many requests, please slow down.',
  },
  
  // Password reset - very strict
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset attempts, please try again later.',
  },
} as const

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get real IP from headers (for reverse proxy setups)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'
  
  // For authenticated requests, also include user ID if available
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return `${ip}-${userAgent.slice(0, 50)}` // Truncate user agent
}

/**
 * Clean up expired entries from rate limit store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime <= now) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Sliding window rate limiter
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const clientId = getClientId(request)
  const now = Date.now()
  const windowStart = now - config.windowMs
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup
    cleanupExpiredEntries()
  }
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(clientId)
  
  if (!entry || entry.resetTime <= now) {
    // Create new entry or reset expired entry
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
      requests: [],
    }
  }
  
  // Remove requests outside the current window (sliding window)
  entry.requests = entry.requests.filter(timestamp => timestamp > windowStart)
  entry.count = entry.requests.length
  
  // Check if request is allowed
  const allowed = entry.count < config.maxRequests
  
  if (allowed) {
    // Add current request to the window
    entry.requests.push(now)
    entry.count++
  }
  
  // Update store
  rateLimitStore.set(clientId, entry)
  
  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
  }
}

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(
  request: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  const result = rateLimit(request, config)
  
  if (!result.allowed) {
    const response = NextResponse.json(
      {
        error: config.message || 'Too many requests',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      },
      { status: 429 }
    )
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', result.resetTime.toString())
    response.headers.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString())
    
    return response
  }
  
  // Add rate limit headers to successful responses
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.resetTime.toString())
  
  return response
}

/**
 * Get appropriate rate limit config based on request path
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig {
  // Authentication endpoints
  if (pathname.includes('/auth/') || pathname.includes('/login') || pathname.includes('/signup')) {
    return rateLimitConfigs.auth
  }
  
  // Password reset
  if (pathname.includes('/reset-password') || pathname.includes('/forgot-password')) {
    return rateLimitConfigs.passwordReset
  }
  
  // File upload endpoints
  if (pathname.includes('/upload') || pathname.includes('/import')) {
    return rateLimitConfigs.upload
  }
  
  // API endpoints
  if (pathname.startsWith('/api/')) {
    return rateLimitConfigs.api
  }
  
  // General endpoints
  return rateLimitConfigs.general
}

/**
 * Express-style rate limiter for API routes
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (request: NextRequest) => {
    const result = rateLimit(request, config)
    
    if (!result.allowed) {
      throw new Error(`Rate limit exceeded: ${config.message || 'Too many requests'}`)
    }
    
    return {
      remaining: result.remaining,
      resetTime: result.resetTime,
    }
  }
}

/**
 * Rate limit status for monitoring
 */
export function getRateLimitStats(): {
  totalClients: number
  activeWindows: number
  memoryUsage: number
} {
  const now = Date.now()
  let activeWindows = 0
  
  for (const entry of rateLimitStore.values()) {
    if (entry.resetTime > now) {
      activeWindows++
    }
  }
  
  return {
    totalClients: rateLimitStore.size,
    activeWindows,
    memoryUsage: process.memoryUsage().heapUsed,
  }
}