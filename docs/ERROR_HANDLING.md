# Error Handling & Toast Notifications

This document describes the comprehensive error handling and notification system implemented in OrbitABM.

## Overview

The application now includes:
- **Centralized error handling** with standardized error types and codes
- **Toast notifications** for user feedback on all operations
- **Error boundaries** for React component error recovery
- **Enhanced API routes** with structured error responses
- **Utility functions** for consistent error handling patterns

## Toast Notifications

### Basic Usage

```typescript
import { showSuccessToast, showErrorToast, showWarningToast, showInfoToast } from '@/lib/utils/toast'

// Success notification
showSuccessToast('Company created successfully')

// Error notification
showErrorToast('Failed to save company')

// Warning notification
showWarningToast('Some fields are missing')

// Info notification
showInfoToast('Processing your request...')
```

### Promise-based Toasts

For operations that take time, use `toastPromise` to automatically handle loading, success, and error states:

```typescript
import { toastPromise } from '@/lib/utils/toast'

const handleSave = async () => {
  try {
    await toastPromise(
      saveCompanyOperation(), // Your async operation
      {
        loading: 'Saving company...',
        success: (data) => `Company "${data.name}" saved successfully`,
        error: 'Failed to save company'
      }
    )
  } catch (error) {
    // Error is already displayed via toast
    console.error('Save failed:', error)
  }
}
```

### CRUD Helper Functions

For common CRUD operations, use the built-in helpers:

```typescript
import { crudToast } from '@/lib/utils/toast'

// Success notifications
crudToast.create('Company', 'Acme Corp')  // "Company 'Acme Corp' created successfully"
crudToast.update('Company', 'Acme Corp')  // "Company 'Acme Corp' updated successfully"
crudToast.delete('Company', 'Acme Corp')  // "Company 'Acme Corp' deleted successfully"

// Error notifications
crudToast.createError('Company', error)
crudToast.updateError('Company', error)
crudToast.deleteError('Company', error)
```

## Error Types and Codes

### Standard Error Types

```typescript
import { ApiError, ValidationError, ERROR_CODES } from '@/lib/utils/errors'

// API errors with specific codes
throw new ApiError(
  'Company not found',
  ERROR_CODES.NOT_FOUND,
  404
)

// Validation errors with field details
throw new ValidationError(
  'Invalid form data',
  { name: ['Name is required'], email: ['Invalid email format'] }
)
```

### Common Error Codes

- `UNAUTHORIZED` - User not logged in
- `FORBIDDEN` - Insufficient permissions
- `VALIDATION_ERROR` - Form validation failed
- `NOT_FOUND` - Resource not found
- `DUPLICATE_ENTRY` - Unique constraint violation
- `DATABASE_ERROR` - Database operation failed
- `NETWORK_ERROR` - Network connectivity issues
- `IMPORT_ERROR` - Data import failed
- `FILE_TOO_LARGE` - File exceeds size limit

## Error Boundaries

### Application-Level Error Boundary

The root layout includes an error boundary that catches all unhandled React errors:

```typescript
// Automatically included in layout.tsx
<ErrorBoundary>
  <YourApp />
</ErrorBoundary>
```

### Section-Level Error Boundaries

For specific sections that might fail independently:

```typescript
import { SectionErrorBoundary } from '@/components/ui/ErrorBoundary'

<SectionErrorBoundary 
  title="Company List" 
  onRetry={() => refetchCompanies()}
>
  <CompanyList />
</SectionErrorBoundary>
```

### Higher-Order Component

Wrap components with error boundaries using the HOC:

```typescript
import { withErrorBoundary } from '@/components/ui/ErrorBoundary'

const SafeComponent = withErrorBoundary(MyComponent, {
  fallback: <div>Something went wrong with this component</div>
})
```

## API Client Utilities

### Using the API Client

```typescript
import { apiClient } from '@/lib/utils/api'

// Fetch with automatic error handling
const companies = await apiClient.fetch(
  () => supabase.from('companies').select('*'),
  {
    loadingMessage: 'Loading companies...',
    successMessage: 'Companies loaded',
    errorMessage: 'Failed to load companies'
  }
)

// CRUD operations with built-in messages
const newCompany = await apiClient.create(
  () => supabase.from('companies').insert(data).select().single(),
  'Company'
)

const updatedCompany = await apiClient.update(
  () => supabase.from('companies').update(data).eq('id', id).select().single(),
  'Company'
)

await apiClient.delete(
  () => supabase.from('companies').update({ deleted_at: new Date() }).eq('id', id),
  'Company'
)
```

### Form Validation Helper

```typescript
import { handleFormSubmission } from '@/lib/utils/api'

const handleSave = async () => {
  try {
    await handleFormSubmission(
      formData,
      ['name', 'email'], // required fields
      async () => {
        // Your save operation
        return await supabase.from('companies').insert(formData)
      },
      {
        loadingMessage: 'Saving...',
        successMessage: 'Saved successfully'
      }
    )
  } catch (error) {
    // Validation errors are automatically shown as toasts
  }
}
```

### File Validation

```typescript
import { validateFile } from '@/lib/utils/api'

const handleFileUpload = (file: File) => {
  try {
    validateFile(file, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['text/csv', 'application/json'],
      allowedExtensions: ['csv', 'json']
    })
    
    // File is valid, proceed with upload
  } catch (error) {
    showErrorToast(error)
  }
}
```

## Enhanced API Routes

### Structured Error Responses

All API routes now return consistent error responses:

```typescript
// Success response
{
  data: [...],
  success: true,
  count?: number
}

// Error response
{
  error: "Human-readable error message",
  code: "ERROR_CODE",
  success: false,
  details?: {...} // Additional error details in development
}
```

### Example API Route Implementation

```typescript
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.name) {
      throw new ApiError(
        'Name is required',
        ERROR_CODES.VALIDATION_ERROR,
        400
      )
    }

    const { data, error } = await supabase
      .from('companies')
      .insert(body)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ApiError(
          'Company with this name already exists',
          ERROR_CODES.DUPLICATE_ENTRY,
          409,
          error
        )
      }
      
      throw new ApiError(
        'Failed to create company',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    return NextResponse.json({ data, success: true })
    
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { 
          error: error.message, 
          code: error.code,
          success: false 
        },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: ERROR_CODES.SERVER_ERROR,
        success: false 
      },
      { status: 500 }
    )
  }
}
```

## Best Practices

### 1. Always Use Toast Notifications for User Actions

```typescript
// ✅ Good - User gets feedback
await toastPromise(saveOperation(), {
  loading: 'Saving...',
  success: 'Saved successfully',
  error: 'Save failed'
})

// ❌ Bad - No user feedback
try {
  await saveOperation()
} catch (error) {
  console.error(error) // User doesn't see this
}
```

### 2. Provide Specific Error Messages

```typescript
// ✅ Good - Specific and actionable
throw new ApiError(
  'Company name must be unique within your organization',
  ERROR_CODES.DUPLICATE_ENTRY,
  409
)

// ❌ Bad - Generic and unhelpful
throw new Error('Something went wrong')
```

### 3. Use Error Boundaries for Component Isolation

```typescript
// ✅ Good - Errors don't crash the entire page
<SectionErrorBoundary title="Company List">
  <CompanyList />
</SectionErrorBoundary>

// ❌ Bad - One component error crashes everything
<CompanyList />
```

### 4. Handle Loading States

```typescript
// ✅ Good - User sees loading feedback
const [loading, setLoading] = useState(false)

const handleSave = async () => {
  setLoading(true)
  try {
    await toastPromise(saveOperation(), { ... })
  } finally {
    setLoading(false)
  }
}

// ❌ Bad - No loading feedback
const handleSave = async () => {
  await saveOperation()
}
```

### 5. Validate Input Early

```typescript
// ✅ Good - Validate before API call
if (!formData.name.trim()) {
  showErrorToast('Name is required')
  return
}

// ❌ Bad - Let server handle all validation
await apiCall(formData) // May fail with unclear error
```

## Configuration

### Toast Configuration

The toast system is configured in `src/app/layout.tsx`:

```typescript
<Toaster
  position="top-right"
  reverseOrder={false}
  gutter={8}
  toastOptions={{
    duration: 4000,
    success: { duration: 3000 },
    error: { duration: 5000 }
  }}
/>
```

### Error Boundary Configuration

Error boundaries can be customized with fallback UI and error handlers:

```typescript
<ErrorBoundary
  fallback={<CustomErrorUI />}
  onError={(error, errorInfo) => {
    // Log to external service
    logError(error, errorInfo)
  }}
>
  <YourComponent />
</ErrorBoundary>
```

## Testing Error Handling

### Testing Toast Notifications

```typescript
import { showSuccessToast } from '@/lib/utils/toast'
import { render, screen } from '@testing-library/react'

test('shows success toast on save', async () => {
  const { user } = render(<CompanyForm />)
  
  await user.click(screen.getByText('Save'))
  
  expect(screen.getByText('Company saved successfully')).toBeInTheDocument()
})
```

### Testing Error Boundaries

```typescript
test('error boundary catches component errors', () => {
  const ThrowError = () => {
    throw new Error('Test error')
  }
  
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  )
  
  expect(screen.getByText('Something went wrong')).toBeInTheDocument()
})
```

## Migration Guide

### Updating Existing Components

1. **Add toast imports:**
   ```typescript
   import { toastPromise, showErrorToast } from '@/lib/utils/toast'
   ```

2. **Wrap async operations:**
   ```typescript
   // Before
   const handleSave = async () => {
     try {
       await saveOperation()
       // No user feedback
     } catch (error) {
       console.error(error)
     }
   }
   
   // After
   const handleSave = async () => {
     try {
       await toastPromise(saveOperation(), {
         loading: 'Saving...',
         success: 'Saved successfully',
         error: 'Save failed'
       })
     } catch (error) {
       console.error(error)
     }
   }
   ```

3. **Add error boundaries to critical sections:**
   ```typescript
   <SectionErrorBoundary title="Data Table">
     <DataTable />
   </SectionErrorBoundary>
   ```

### Updating API Routes

1. **Add error handling imports:**
   ```typescript
   import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
   ```

2. **Replace generic error handling:**
   ```typescript
   // Before
   if (error) {
     return NextResponse.json({ error: error.message }, { status: 500 })
   }
   
   // After
   if (error) {
     throw new ApiError(
       'Failed to create resource',
       ERROR_CODES.DATABASE_ERROR,
       500,
       error
     )
   }
   ```

This error handling system provides a robust foundation for user experience and debugging throughout the OrbitABM application.