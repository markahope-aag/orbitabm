'use client'

import { useCallback } from 'react'
import { useCSRFToken } from '@/lib/security/csrf'

/**
 * Security Hook for React Components
 * 
 * Provides client-side security utilities including:
 * - CSRF token management
 * - Secure fetch wrapper
 * - Input sanitization
 * - Content validation
 */

export function useSecurity() {
  const csrfToken = useCSRFToken()
  const isSecure = !!csrfToken && typeof window !== 'undefined' && window.location.protocol === 'https:'

  /**
   * Secure fetch wrapper with CSRF protection
   */
  const secureFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers)
      
      // Add CSRF token for state-changing requests
      if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || 'GET')) {
        headers.set('x-csrf-token', csrfToken)
      }
      
      // Add security headers
      headers.set('X-Requested-With', 'XMLHttpRequest')
      
      // Ensure JSON content type for POST requests
      if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
      }
      
      return fetch(url, {
        ...options,
        headers,
        credentials: 'same-origin', // Include cookies
      })
    },
    [csrfToken]
  )

  /**
   * Sanitize HTML content
   */
  const sanitizeHtml = useCallback((input: string): string => {
    if (!input) return ''
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }, [])

  /**
   * Validate email format
   */
  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  }, [])

  /**
   * Validate URL format
   */
  const validateUrl = useCallback((url: string): boolean => {
    try {
      const urlObj = new URL(url)
      return ['http:', 'https:'].includes(urlObj.protocol)
    } catch {
      return false
    }
  }, [])

  /**
   * Generate secure form data with CSRF protection
   */
  const createSecureFormData = useCallback(
    (data: Record<string, unknown>): FormData => {
      const formData = new FormData()
      
      // Add CSRF token
      if (csrfToken) {
        formData.append('_csrf', csrfToken)
      }
      
      // Add other data
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString())
        }
      })
      
      return formData
    },
    [csrfToken]
  )

  /**
   * Validate file upload security
   */
  const validateFileUpload = useCallback((file: File): { valid: boolean; error?: string } => {
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
    
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' }
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'File size too large (max 10MB)' }
    }
    
    // Check filename for dangerous patterns
    const fileName = file.name.toLowerCase()
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.js', '.vbs']
    
    if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
      return { valid: false, error: 'File extension not allowed' }
    }
    
    return { valid: true }
  }, [])

  /**
   * Report security incident (client-side)
   */
  const reportSecurityIncident = useCallback(
    async (incident: {
      type: 'xss_attempt' | 'csrf_mismatch' | 'invalid_input' | 'suspicious_behavior'
      details?: Record<string, unknown>
    }) => {
      try {
        await secureFetch('/api/security/report', {
          method: 'POST',
          body: JSON.stringify({
            type: incident.type,
            details: incident.details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
          }),
        })
      } catch (error) {
        console.warn('Failed to report security incident:', error)
      }
    },
    [secureFetch]
  )

  return {
    // State
    csrfToken,
    isSecure,
    
    // Methods
    secureFetch,
    sanitizeHtml,
    validateEmail,
    validateUrl,
    createSecureFormData,
    validateFileUpload,
    reportSecurityIncident,
  }
}

/**
 * Hook for secure API calls
 */
export function useSecureApi() {
  const { secureFetch } = useSecurity()

  const get = useCallback(
    (url: string) => secureFetch(url, { method: 'GET' }),
    [secureFetch]
  )

  const post = useCallback(
    (url: string, data: unknown) =>
      secureFetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    [secureFetch]
  )

  const put = useCallback(
    (url: string, data: unknown) =>
      secureFetch(url, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    [secureFetch]
  )

  const del = useCallback(
    (url: string) => secureFetch(url, { method: 'DELETE' }),
    [secureFetch]
  )

  return { get, post, put, delete: del }
}

/**
 * Hook for form security
 */
export function useSecureForm() {
  const { csrfToken, createSecureFormData, sanitizeHtml } = useSecurity()

  /**
   * Create secure form submission handler
   */
  const createSubmitHandler = useCallback(
    (onSubmit: (data: Record<string, string | FormDataEntryValue>) => Promise<void>) =>
      async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const form = event.currentTarget
        const formData = new FormData(form)
        const data: Record<string, string | FormDataEntryValue> = {}
        
        // Extract and sanitize form data
        formData.forEach((value, key) => {
          if (key !== '_csrf') {
            data[key] = typeof value === 'string' ? sanitizeHtml(value) : value
          }
        })
        
        await onSubmit(data)
      },
    [sanitizeHtml]
  )

  return {
    csrfToken,
    createSecureFormData,
    createSubmitHandler,
  }
}