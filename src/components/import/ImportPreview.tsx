'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react'

interface ValidationIssue {
  row: number
  field: string
  issue: 'missing_required' | 'invalid_lookup' | 'duplicate' | 'invalid_format'
  message: string
  suggestion?: string
}

interface ProcessedRow {
  originalIndex: number
  data: Record<string, unknown>
  issues: ValidationIssue[]
  status: 'valid' | 'warning' | 'error'
}

interface ImportPreviewProps {
  data: Record<string, unknown>[]
  mappings: Array<{ csvHeader: string; dbField: string | null }>
  entityType: string
  onValidationComplete: (processedRows: ProcessedRow[]) => void
}

// Helper functions defined outside component to avoid hoisting issues
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const isValidDate = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  return dateRegex.test(date) && !isNaN(Date.parse(date))
}

const getRequiredFields = (entityType: string): string[] => {
  const requiredFieldsMap: Record<string, string[]> = {
    companies: ['name'],
    contacts: ['first_name', 'last_name'],
    markets: ['name'],
    verticals: ['name'],
    digital_snapshots: ['company', 'snapshot_date']
  }
  return requiredFieldsMap[entityType] || []
}

const validateDataFormats = (data: Record<string, unknown>, issues: ValidationIssue[], rowNumber: number) => {
  // Email validation
  if (data.email && typeof data.email === 'string' && data.email.trim() && !isValidEmail(data.email)) {
    issues.push({
      row: rowNumber,
      field: 'email',
      issue: 'invalid_format',
      message: 'Invalid email format',
      suggestion: 'Use format: user@domain.com'
    })
  }

  // URL validation
  if (data.website && typeof data.website === 'string' && data.website.trim() && !isValidUrl(data.website)) {
    issues.push({
      row: rowNumber,
      field: 'website',
      issue: 'invalid_format',
      message: 'Invalid website URL format',
      suggestion: 'Use format: https://domain.com'
    })
  }

  // Date validation
  if (data.snapshot_date && typeof data.snapshot_date === 'string' && data.snapshot_date.trim() && !isValidDate(data.snapshot_date)) {
    issues.push({
      row: rowNumber,
      field: 'snapshot_date',
      issue: 'invalid_format',
      message: 'Invalid date format',
      suggestion: 'Use format: YYYY-MM-DD'
    })
  }

  // Number validation
  const numberFields = ['estimated_revenue', 'employee_count', 'year_founded', 'google_rating', 'domain_authority']
  numberFields.forEach(field => {
    if (data[field] && typeof data[field] === 'string' && data[field] && isNaN(Number(data[field]))) {
      issues.push({
        row: rowNumber,
        field,
        issue: 'invalid_format',
        message: `Invalid number format for ${field}`,
        suggestion: 'Use numeric values only'
      })
    }
  })
}

export function ImportPreview({ data, mappings, entityType, onValidationComplete }: ImportPreviewProps) {
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([])
  const [isValidating, setIsValidating] = useState(false)

  const validateData = async () => {
    setIsValidating(true)
    
    // Get field mappings
    const fieldMappings = mappings.reduce((acc, mapping) => {
      if (mapping.dbField) {
        acc[mapping.csvHeader] = mapping.dbField
      }
      return acc
    }, {} as Record<string, string>)

    // Define required fields by entity type
    const requiredFields = getRequiredFields(entityType)
    
    // Process each row
    const processed: ProcessedRow[] = data.map((row, index) => {
      const issues: ValidationIssue[] = []
      const mappedData: Record<string, unknown> = {}

      // Map CSV data to database fields
      Object.entries(fieldMappings).forEach(([csvHeader, dbField]) => {
        const value = row[csvHeader]
        mappedData[dbField] = value
      })

      // Validate required fields
      requiredFields.forEach(field => {
        if (!mappedData[field] || String(mappedData[field]).trim() === '') {
          issues.push({
            row: index + 1,
            field,
            issue: 'missing_required',
            message: `Required field '${field}' is missing or empty`,
            suggestion: 'Provide a value for this field'
          })
        }
      })

      // Validate data formats
      validateDataFormats(mappedData, issues, index + 1)

      // Check for duplicates (by name field)
      if (mappedData.name) {
        const nameField = Object.keys(fieldMappings).find(k => fieldMappings[k] === 'name') || ''
        const duplicateIndex = data.findIndex((otherRow: Record<string, unknown>, otherIndex: number) => 
          otherIndex !== index && 
          String(otherRow[nameField] || '').toLowerCase() === 
          String(mappedData.name || '').toLowerCase()
        )
        
        if (duplicateIndex !== -1) {
          issues.push({
            row: index + 1,
            field: 'name',
            issue: 'duplicate',
            message: `Duplicate name found (also in row ${duplicateIndex + 1})`,
            suggestion: 'Choose to skip duplicates or update existing records'
          })
        }
      }

      // Determine row status
      let status: 'valid' | 'warning' | 'error' = 'valid'
      if (issues.some(issue => issue.issue === 'missing_required')) {
        status = 'error'
      } else if (issues.length > 0) {
        status = 'warning'
      }

      return {
        originalIndex: index,
        data: mappedData,
        issues,
        status
      }
    })

    setProcessedRows(processed)
    onValidationComplete(processed)
    setIsValidating(false)
  }

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => validateData(), 0)
  }, [data, mappings, entityType]) // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusIcon = (status: 'valid' | 'warning' | 'error') => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusColor = (status: 'valid' | 'warning' | 'error') => {
    switch (status) {
      case 'valid':
        return 'bg-emerald-50 border-emerald-200'
      case 'warning':
        return 'bg-amber-50 border-amber-200'
      case 'error':
        return 'bg-red-50 border-red-200'
    }
  }

  const validRows = processedRows.filter(row => row.status === 'valid').length
  const warningRows = processedRows.filter(row => row.status === 'warning').length
  const errorRows = processedRows.filter(row => row.status === 'error').length

  if (isValidating) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Validating data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Validation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-slate-500" />
            <div>
              <div className="text-sm font-medium text-slate-700">Total Rows</div>
              <div className="text-2xl font-bold text-slate-900">{processedRows.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <div>
              <div className="text-sm font-medium text-emerald-700">Valid</div>
              <div className="text-2xl font-bold text-emerald-900">{validRows}</div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <div className="text-sm font-medium text-amber-700">Warnings</div>
              <div className="text-2xl font-bold text-amber-900">{warningRows}</div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <div className="text-sm font-medium text-red-700">Errors</div>
              <div className="text-2xl font-bold text-red-900">{errorRows}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Issues List */}
      {(warningRows > 0 || errorRows > 0) && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-900">Validation Issues</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {processedRows
              .filter(row => row.issues.length > 0)
              .slice(0, 20) // Show first 20 rows with issues
              .map((row, index) => (
                <div key={index} className={`border rounded-lg p-3 ${getStatusColor(row.status)}`}>
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(row.status)}
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            Row {row.originalIndex + 1}
                            {row.data.name ? <span> - {String(row.data.name)}</span> : null}
                          </div>
                      <div className="space-y-1 mt-1">
                        {row.issues.map((issue, issueIndex) => (
                          <div key={issueIndex} className="text-sm">
                            <span className="font-medium">{issue.field}:</span> {issue.message}
                            {issue.suggestion && (
                              <div className="text-xs opacity-75 ml-2">
                                💡 {issue.suggestion}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Import Readiness */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h3 className="font-medium text-slate-900 mb-2">Import Summary</h3>
        <div className="text-sm text-slate-600 space-y-1">
          <p>• {validRows} records ready to import</p>
          {warningRows > 0 && <p>• {warningRows} records with warnings (will be imported)</p>}
          {errorRows > 0 && <p>• {errorRows} records with errors (will be skipped)</p>}
        </div>
        
        {errorRows > 0 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-700">
              <strong>Note:</strong> Records with errors will be skipped during import. 
              Fix the issues and re-upload to import those records.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}