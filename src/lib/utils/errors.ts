/**
 * Centralized error handling utilities for OrbitABM
 */

export interface AppError {
  code: string
  message: string
  details?: unknown
  statusCode?: number
}

export class ApiError extends Error {
  code: string
  statusCode: number
  details?: unknown

  constructor(message: string, code: string = 'UNKNOWN_ERROR', statusCode: number = 500, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class ValidationError extends Error {
  code: string = 'VALIDATION_ERROR'
  statusCode: number = 400
  fields: Record<string, string[]>

  constructor(message: string, fields: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ValidationError'
    this.fields = fields
  }
}

/**
 * Common error codes used throughout the application
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // Database
  NOT_FOUND: 'NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',

  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',

  // Import/Export
  IMPORT_ERROR: 'IMPORT_ERROR',
  EXPORT_ERROR: 'EXPORT_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',

  // Business Logic
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT'
} as const

/**
 * User-friendly error messages for common error codes
 */
export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.UNAUTHORIZED]: 'You need to be logged in to perform this action.',
  [ERROR_CODES.FORBIDDEN]: 'You don\'t have permission to perform this action.',
  [ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  
  [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ERROR_CODES.REQUIRED_FIELD]: 'This field is required.',
  [ERROR_CODES.INVALID_FORMAT]: 'Please enter a valid value.',
  [ERROR_CODES.DUPLICATE_ENTRY]: 'This entry already exists.',
  
  [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_CODES.DATABASE_ERROR]: 'A database error occurred. Please try again.',
  [ERROR_CODES.CONSTRAINT_VIOLATION]: 'This operation violates data constraints.',
  
  [ERROR_CODES.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
  [ERROR_CODES.TIMEOUT]: 'The request timed out. Please try again.',
  [ERROR_CODES.SERVER_ERROR]: 'A server error occurred. Please try again later.',
  
  [ERROR_CODES.IMPORT_ERROR]: 'Failed to import data. Please check your file and try again.',
  [ERROR_CODES.EXPORT_ERROR]: 'Failed to export data. Please try again.',
  [ERROR_CODES.FILE_TOO_LARGE]: 'File is too large. Please use a smaller file.',
  [ERROR_CODES.INVALID_FILE_FORMAT]: 'Invalid file format. Please use a supported format.',
  
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'You don\'t have sufficient permissions for this action.',
  [ERROR_CODES.OPERATION_NOT_ALLOWED]: 'This operation is not allowed.',
  [ERROR_CODES.RESOURCE_CONFLICT]: 'This resource is currently being used and cannot be modified.'
}

/**
 * Convert various error types to a standardized AppError format
 */
export function normalizeError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof ApiError || error instanceof ValidationError) {
    return {
      code: error.code,
      message: error.message,
      details: error instanceof ApiError ? error.details : error instanceof ValidationError ? error.fields : undefined,
      statusCode: error.statusCode
    }
  }

  // Standard Error
  if (error instanceof Error) {
    return {
      code: ERROR_CODES.SERVER_ERROR,
      message: error.message || 'An unexpected error occurred',
      statusCode: 500
    }
  }

  // String error
  if (typeof error === 'string') {
    return {
      code: ERROR_CODES.SERVER_ERROR,
      message: error,
      statusCode: 500
    }
  }

  // Network/Fetch errors
  if (error && typeof error === 'object' && 'name' in error) {
    const err = error as { name: string; message?: string }
    if (err.name === 'TypeError' || err.name === 'NetworkError') {
      return {
        code: ERROR_CODES.NETWORK_ERROR,
        message: ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
        statusCode: 0
      }
    }
  }

  // Unknown error
  return {
    code: ERROR_CODES.SERVER_ERROR,
    message: 'An unexpected error occurred',
    details: error,
    statusCode: 500
  }
}

/**
 * Get user-friendly error message from error code
 */
export function getErrorMessage(code: string, fallback?: string): string {
  return ERROR_MESSAGES[code] || fallback || 'An unexpected error occurred'
}

/**
 * Check if error is a client-side error (4xx)
 */
export function isClientError(statusCode: number): boolean {
  return statusCode >= 400 && statusCode < 500
}

/**
 * Check if error is a server-side error (5xx)
 */
export function isServerError(statusCode: number): boolean {
  return statusCode >= 500
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(fields: Record<string, string[]>): string {
  const messages = Object.entries(fields)
    .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
    .join('; ')
  
  return messages || 'Validation failed'
}