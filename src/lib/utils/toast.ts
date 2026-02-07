/**
 * Toast notification utilities with consistent styling and behavior
 */

import toast from 'react-hot-toast'
import { AppError, normalizeError, getErrorMessage } from './errors'

export interface ToastOptions {
  duration?: number
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  id?: string
}

/**
 * Success toast with consistent styling
 */
export function showSuccessToast(message: string, options?: ToastOptions): string {
  return toast.success(message, {
    duration: options?.duration || 4000,
    position: options?.position || 'top-right',
    id: options?.id,
    style: {
      background: '#10b981',
      color: 'white',
      fontWeight: '500'
    },
    iconTheme: {
      primary: 'white',
      secondary: '#10b981'
    }
  })
}

/**
 * Error toast with consistent styling
 */
export function showErrorToast(error: unknown, options?: ToastOptions): string {
  const normalizedError = normalizeError(error)
  const message = getErrorMessage(normalizedError.code, normalizedError.message)
  
  return toast.error(message, {
    duration: options?.duration || 6000,
    position: options?.position || 'top-right',
    id: options?.id,
    style: {
      background: '#ef4444',
      color: 'white',
      fontWeight: '500'
    },
    iconTheme: {
      primary: 'white',
      secondary: '#ef4444'
    }
  })
}

/**
 * Warning toast with consistent styling
 */
export function showWarningToast(message: string, options?: ToastOptions): string {
  return toast(message, {
    duration: options?.duration || 5000,
    position: options?.position || 'top-right',
    id: options?.id,
    icon: '⚠️',
    style: {
      background: '#f59e0b',
      color: 'white',
      fontWeight: '500'
    }
  })
}

/**
 * Info toast with consistent styling
 */
export function showInfoToast(message: string, options?: ToastOptions): string {
  return toast(message, {
    duration: options?.duration || 4000,
    position: options?.position || 'top-right',
    id: options?.id,
    icon: 'ℹ️',
    style: {
      background: '#3b82f6',
      color: 'white',
      fontWeight: '500'
    }
  })
}

/**
 * Loading toast that can be updated
 */
export function showLoadingToast(message: string, options?: ToastOptions): string {
  return toast.loading(message, {
    position: options?.position || 'top-right',
    id: options?.id,
    style: {
      background: '#6b7280',
      color: 'white',
      fontWeight: '500'
    }
  })
}

/**
 * Update an existing toast (useful for loading states)
 */
export function updateToast(toastId: string, type: 'success' | 'error' | 'loading', message: string): void {
  if (type === 'success') {
    toast.success(message, { id: toastId })
  } else if (type === 'error') {
    toast.error(message, { id: toastId })
  } else if (type === 'loading') {
    toast.loading(message, { id: toastId })
  }
}

/**
 * Dismiss a specific toast
 */
export function dismissToast(toastId: string): void {
  toast.dismiss(toastId)
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts(): void {
  toast.dismiss()
}

/**
 * Promise-based toast that automatically handles loading, success, and error states
 */
export async function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: AppError) => string)
  },
  options?: ToastOptions
): Promise<T> {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: (data: T) => {
        return typeof messages.success === 'function' 
          ? messages.success(data) 
          : messages.success
      },
      error: (error: unknown) => {
        const normalizedError = normalizeError(error)
        return typeof messages.error === 'function'
          ? messages.error(normalizedError)
          : messages.error
      }
    },
    {
      position: options?.position || 'top-right',
      id: options?.id,
      success: {
        duration: options?.duration || 4000,
        style: {
          background: '#10b981',
          color: 'white',
          fontWeight: '500'
        }
      },
      error: {
        duration: 6000,
        style: {
          background: '#ef4444',
          color: 'white',
          fontWeight: '500'
        }
      },
      loading: {
        style: {
          background: '#6b7280',
          color: 'white',
          fontWeight: '500'
        }
      }
    }
  )
}

/**
 * Bulk operation toast helpers
 */
export const bulkToast = {
  /**
   * Show results of a bulk operation (e.g., import, bulk delete)
   */
  showBulkResults(results: { success: number; failed: number; total: number }, operation: string): void {
    if (results.failed === 0) {
      showSuccessToast(`Successfully ${operation} ${results.success} items`)
    } else if (results.success === 0) {
      showErrorToast(`Failed to ${operation} all ${results.total} items`)
    } else {
      showWarningToast(`${operation} completed: ${results.success} succeeded, ${results.failed} failed`)
    }
  },

  /**
   * Show progress for long-running bulk operations
   */
  showBulkProgress(processed: number, total: number, operation: string): string {
    const percentage = Math.round((processed / total) * 100)
    return showLoadingToast(`${operation}: ${processed}/${total} (${percentage}%)`)
  }
}

/**
 * CRUD operation toast helpers
 */
export const crudToast = {
  create: (entityName: string, name?: string) => 
    showSuccessToast(`${entityName}${name ? ` "${name}"` : ''} created successfully`),
  
  update: (entityName: string, name?: string) => 
    showSuccessToast(`${entityName}${name ? ` "${name}"` : ''} updated successfully`),
  
  delete: (entityName: string, name?: string) => 
    showSuccessToast(`${entityName}${name ? ` "${name}"` : ''} deleted successfully`),
  
  createError: (entityName: string, error: unknown) => 
    showErrorToast(error),
  
  updateError: (entityName: string, error: unknown) => 
    showErrorToast(error),
  
  deleteError: (entityName: string, error: unknown) => 
    showErrorToast(error)
}