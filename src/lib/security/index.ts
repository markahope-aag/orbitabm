/**
 * Security Utilities Module
 * 
 * Centralized security utilities for OrbitABM including:
 * - Input sanitization
 * - XSS protection
 * - SQL injection prevention
 * - Content validation
 * - Security headers
 */

import { NextRequest, NextResponse } from 'next/server'
import { csrfMiddleware } from './csrf'
import { rateLimitMiddleware, getRateLimitConfig } from './rate-limit'

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  if (!input) return ''
  
  // Basic HTML entity encoding
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize user input for database queries
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>'"&]/g, '') // Remove HTML/script chars
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .slice(0, 1000) // Limit length
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * Validate URL format and whitelist domains
 */
export function isValidUrl(url: string, allowedDomains?: string[]): boolean {
  try {
    const urlObj = new URL(url)
    
    // Only allow HTTPS in production
    if (process.env.NODE_ENV === 'production' && urlObj.protocol !== 'https:') {
      return false
    }
    
    // Check domain whitelist if provided
    if (allowedDomains && allowedDomains.length > 0) {
      return allowedDomains.some(domain => urlObj.hostname.endsWith(domain))
    }
    
    return true
  } catch {
    return false
  }
}

/**
 * Generate secure random string
 */
export function generateSecureToken(length: number = 32): string {
  const crypto = require('crypto')
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Hash sensitive data (passwords, tokens)
 */
export async function hashSensitiveData(data: string): Promise<string> {
  const crypto = require('crypto')
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

/**
 * Verify hashed sensitive data
 */
export async function verifySensitiveData(data: string, hash: string): Promise<boolean> {
  const crypto = require('crypto')
  const [salt, originalHash] = hash.split(':')
  const verifyHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex')
  return originalHash === verifyHash
}

/**
 * Content Security Policy nonce generator
 */
export function generateCSPNonce(): string {
  const crypto = require('crypto')
  return crypto.randomBytes(16).toString('base64')
}

/**
 * Validate file upload security
 */
export function validateFileUpload(file: {
  name: string
  type: string
  size: number
}): { valid: boolean; error?: string } {
  // Allowed file types
  const allowedTypes = [
    'text/csv',
    'application/json',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ]
  
  // Blocked extensions (double extension attacks)
  const blockedExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
    '.js', '.vbs', '.jar', '.php', '.asp', '.jsp'
  ]
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' }
  }
  
  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File size too large (max 10MB)' }
  }
  
  // Check for dangerous extensions
  const fileName = file.name.toLowerCase()
  if (blockedExtensions.some(ext => fileName.includes(ext))) {
    return { valid: false, error: 'File extension not allowed' }
  }
  
  // Check for null bytes (directory traversal)
  if (fileName.includes('\x00')) {
    return { valid: false, error: 'Invalid file name' }
  }
  
  return { valid: true }
}

/**
 * IP address validation and filtering
 */
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

/**
 * Check if IP is from a private network
 */
export function isPrivateIP(ip: string): boolean {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^::1$/,
    /^fe80:/,
  ]
  
  return privateRanges.some(range => range.test(ip))
}

/**
 * Security middleware composer
 */
export function securityMiddleware(request: NextRequest): NextResponse | null {
  // Apply CSRF protection
  const csrfResult = csrfMiddleware(request)
  if (csrfResult) return csrfResult
  
  // Apply rate limiting
  const rateLimitConfig = getRateLimitConfig(request.nextUrl.pathname)
  const rateLimitResult = rateLimitMiddleware(request, rateLimitConfig)
  if (rateLimitResult && rateLimitResult.status === 429) {
    return rateLimitResult
  }
  
  // Continue with the request
  return rateLimitResult || NextResponse.next()
}

/**
 * Security audit logging
 */
export function logSecurityEvent(event: {
  type: 'csrf_violation' | 'rate_limit_exceeded' | 'invalid_input' | 'suspicious_activity'
  ip: string
  userAgent?: string
  path: string
  details?: any
}): void {
  // In production, send to security monitoring service
  console.warn(`[SECURITY] ${event.type}:`, {
    timestamp: new Date().toISOString(),
    ip: event.ip,
    userAgent: event.userAgent,
    path: event.path,
    details: event.details,
  })
}

/**
 * Request validation utilities
 */
export const requestValidation = {
  /**
   * Validate JSON request body
   */
  validateJSON(body: any, maxSize: number = 1024 * 1024): boolean {
    try {
      const jsonString = JSON.stringify(body)
      return jsonString.length <= maxSize
    } catch {
      return false
    }
  },

  /**
   * Validate request headers
   */
  validateHeaders(headers: Headers): boolean {
    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-host',
      'x-original-url',
      'x-rewrite-url',
    ]
    
    for (const header of suspiciousHeaders) {
      if (headers.has(header)) {
        return false
      }
    }
    
    return true
  },

  /**
   * Validate request origin
   */
  validateOrigin(origin: string | null, allowedOrigins: string[]): boolean {
    if (!origin) return true // Allow requests without origin (e.g., mobile apps)
    return allowedOrigins.includes(origin)
  },
}

/**
 * Security configuration
 */
export const securityConfig = {
  // Allowed origins for CORS
  allowedOrigins: [
    'https://orbitabm.com',
    'https://www.orbitabm.com',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
  ],
  
  // Trusted domains for redirects
  trustedDomains: [
    'orbitabm.com',
    'supabase.co',
  ],
  
  // Session configuration
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  },
  
  // File upload limits
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['text/csv', 'application/json', 'image/jpeg', 'image/png'],
  },
}