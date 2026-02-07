/**
 * API utility functions with built-in error handling and toast notifications
 */

import { createClient } from '@/lib/supabase/client'
import { toastPromise, showErrorToast } from './toast'
import { ApiError, ERROR_CODES } from './errors'

export interface ApiOptions {
  showToast?: boolean
  loadingMessage?: string
  successMessage?: string | ((data: unknown) => string)
  errorMessage?: string | ((error: unknown) => string)
}

/**
 * Wrapper for Supabase operations with automatic error handling and toast notifications
 */
export class ApiClient {
  private supabase = createClient()

  /**
   * Fetch data with error handling
   */
  async fetch<T>(
    operation: () => Promise<{ data: T | null; error: unknown }>,
    options: ApiOptions = {}
  ): Promise<T> {
    const {
      showToast = true,
      loadingMessage = 'Loading...',
      successMessage,
      errorMessage = 'Failed to fetch data'
    } = options

    if (showToast && loadingMessage) {
      return toastPromise(
        this.executeOperation(operation),
        {
          loading: loadingMessage,
          success: successMessage || 'Data loaded successfully',
          error: errorMessage
        }
      )
    } else {
      return this.executeOperation(operation)
    }
  }

  /**
   * Create operation with error handling
   */
  async create<T>(
    operation: () => Promise<{ data: T | null; error: unknown }>,
    entityName: string,
    options: Partial<ApiOptions> = {}
  ): Promise<T> {
    return this.fetch(operation, {
      loadingMessage: `Creating ${entityName}...`,
      successMessage: `${entityName} created successfully`,
      errorMessage: `Failed to create ${entityName}`,
      ...options
    })
  }

  /**
   * Update operation with error handling
   */
  async update<T>(
    operation: () => Promise<{ data: T | null; error: unknown }>,
    entityName: string,
    options: Partial<ApiOptions> = {}
  ): Promise<T> {
    return this.fetch(operation, {
      loadingMessage: `Updating ${entityName}...`,
      successMessage: `${entityName} updated successfully`,
      errorMessage: `Failed to update ${entityName}`,
      ...options
    })
  }

  /**
   * Delete operation with error handling
   */
  async delete<T>(
    operation: () => Promise<{ data: T | null; error: unknown }>,
    entityName: string,
    options: Partial<ApiOptions> = {}
  ): Promise<T> {
    return this.fetch(operation, {
      loadingMessage: `Deleting ${entityName}...`,
      successMessage: `${entityName} deleted successfully`,
      errorMessage: `Failed to delete ${entityName}`,
      ...options
    })
  }

  /**
   * Execute the actual Supabase operation
   */
  private async executeOperation<T>(
    operation: () => Promise<{ data: T | null; error: unknown }>
  ): Promise<T> {
    try {
      const { data, error } = await operation()

      if (error) {
        throw this.normalizeSupabaseError(error)
      }

      if (data === null) {
        throw new ApiError(
          'No data returned from operation',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }

      return data
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError(
          'Network error. Please check your connection.',
          ERROR_CODES.NETWORK_ERROR,
          0
        )
      }

      // Generic error
      throw new ApiError(
        'An unexpected error occurred',
        ERROR_CODES.SERVER_ERROR,
        500,
        error
      )
    }
  }

  /**
   * Convert Supabase errors to ApiError instances
   */
  private normalizeSupabaseError(error: unknown): ApiError {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const supabaseError = error as { code: string; message: string; details?: string }
      
      switch (supabaseError.code) {
        case '23505': // Unique constraint violation
          return new ApiError(
            'This item already exists',
            ERROR_CODES.DUPLICATE_ENTRY,
            409,
            supabaseError
          )
        case '23503': // Foreign key violation
          return new ApiError(
            'Cannot perform this operation due to related data',
            ERROR_CODES.CONSTRAINT_VIOLATION,
            400,
            supabaseError
          )
        case '42501': // Insufficient privilege
          return new ApiError(
            'You do not have permission to perform this action',
            ERROR_CODES.FORBIDDEN,
            403,
            supabaseError
          )
        case 'PGRST116': // Not found
          return new ApiError(
            'The requested resource was not found',
            ERROR_CODES.NOT_FOUND,
            404,
            supabaseError
          )
        default:
          return new ApiError(
            supabaseError.message || 'Database error occurred',
            ERROR_CODES.DATABASE_ERROR,
            500,
            supabaseError
          )
      }
    }

    return new ApiError(
      'Database error occurred',
      ERROR_CODES.DATABASE_ERROR,
      500,
      error
    )
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient()

/**
 * Utility function for handling form submissions with validation
 */
export async function handleFormSubmission<T>(
  formData: Record<string, unknown>,
  requiredFields: string[],
  operation: () => Promise<T>,
  options: ApiOptions = {}
): Promise<T> {
  // Validate required fields
  const missingFields = requiredFields.filter(field => 
    !formData[field] || (typeof formData[field] === 'string' && !formData[field].toString().trim())
  )

  if (missingFields.length > 0) {
    const message = `Please fill in required fields: ${missingFields.join(', ')}`
    if (options.showToast !== false) {
      showErrorToast(message)
    }
    throw new ApiError(message, ERROR_CODES.VALIDATION_ERROR, 400)
  }

  return operation()
}

/**
 * Utility for handling file uploads with size and type validation
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number // in bytes
    allowedTypes?: string[]
    allowedExtensions?: string[]
  } = {}
): void {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = [],
    allowedExtensions = []
  } = options

  // Check file size
  if (file.size > maxSize) {
    throw new ApiError(
      `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`,
      ERROR_CODES.FILE_TOO_LARGE,
      400
    )
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw new ApiError(
      `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      ERROR_CODES.INVALID_FILE_FORMAT,
      400
    )
  }

  // Check file extension
  if (allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !allowedExtensions.includes(extension)) {
      throw new ApiError(
        `File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
        ERROR_CODES.INVALID_FILE_FORMAT,
        400
      )
    }
  }
}