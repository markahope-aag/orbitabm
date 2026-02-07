'use client'

import { useState, useEffect } from 'react'

interface ColumnMapping {
  csvHeader: string
  dbField: string | null
}

interface ColumnMapperProps {
  csvHeaders: string[]
  dbFields: { key: string; label: string; required?: boolean }[]
  data: any[]
  onMappingChange: (mappings: ColumnMapping[]) => void
}

export function ColumnMapper({ csvHeaders, dbFields, data, onMappingChange }: ColumnMapperProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([])

  // Auto-map columns on initial load
  useEffect(() => {
    const initialMappings: ColumnMapping[] = csvHeaders.map(header => {
      // Try to find exact match first
      let dbField = dbFields.find(field => 
        field.key.toLowerCase() === header.toLowerCase()
      )?.key || null

      // If no exact match, try partial matches
      if (!dbField) {
        const headerLower = header.toLowerCase()
        dbField = dbFields.find(field => {
          const fieldLower = field.key.toLowerCase()
          return fieldLower.includes(headerLower) || headerLower.includes(fieldLower)
        })?.key || null
      }

      return {
        csvHeader: header,
        dbField
      }
    })

    setMappings(initialMappings)
    onMappingChange(initialMappings)
  }, [csvHeaders, dbFields, onMappingChange])

  const handleMappingChange = (csvHeader: string, dbField: string | null) => {
    const newMappings = mappings.map(mapping =>
      mapping.csvHeader === csvHeader
        ? { ...mapping, dbField }
        : mapping
    )
    setMappings(newMappings)
    onMappingChange(newMappings)
  }

  const getPreviewData = () => {
    return data.slice(0, 5) // Show first 5 rows for preview
  }

  const getMappedDbFields = () => {
    return mappings.map(m => m.dbField).filter(Boolean)
  }

  const getUnmappedRequiredFields = () => {
    const mappedFields = getMappedDbFields()
    return dbFields.filter(field => field.required && !mappedFields.includes(field.key))
  }

  return (
    <div className="space-y-6">
      {/* Column Mapping Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Column Mapping</h3>
        <p className="text-sm text-blue-700">
          Map each CSV column to a database field. Required fields are marked with an asterisk (*).
          Unmapped columns will be ignored during import.
        </p>
      </div>

      {/* Validation Warnings */}
      {getUnmappedRequiredFields().length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-900 mb-2">Missing Required Fields</h4>
          <p className="text-sm text-amber-700 mb-2">
            The following required fields are not mapped:
          </p>
          <ul className="text-sm text-amber-700 list-disc list-inside">
            {getUnmappedRequiredFields().map(field => (
              <li key={field.key}>{field.label}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Column Headers with Dropdowns */}
            <thead className="bg-slate-50">
              <tr>
                {csvHeaders.map((header, index) => {
                  const mapping = mappings.find(m => m.csvHeader === header)
                  const selectedField = dbFields.find(f => f.key === mapping?.dbField)
                  
                  return (
                    <th key={index} className="px-3 py-2 text-left">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-slate-600 truncate">
                          {header}
                        </div>
                        <select
                          value={mapping?.dbField || ''}
                          onChange={(e) => handleMappingChange(header, e.target.value || null)}
                          className="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="">-- Skip Column --</option>
                          {dbFields.map(field => (
                            <option key={field.key} value={field.key}>
                              {field.label}{field.required ? ' *' : ''}
                            </option>
                          ))}
                        </select>
                        {selectedField?.required && (
                          <div className="text-xs text-emerald-600 font-medium">
                            Required ✓
                          </div>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Preview Data Rows */}
            <tbody className="divide-y divide-slate-200">
              {getPreviewData().map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-50">
                  {csvHeaders.map((header, colIndex) => (
                    <td key={colIndex} className="px-3 py-2 text-sm text-slate-900">
                      <div className="max-w-xs truncate">
                        {row[header] || ''}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mapping Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="font-medium text-slate-700">CSV Columns</div>
          <div className="text-2xl font-bold text-slate-900">{csvHeaders.length}</div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3">
          <div className="font-medium text-emerald-700">Mapped Fields</div>
          <div className="text-2xl font-bold text-emerald-900">{getMappedDbFields().length}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <div className="font-medium text-amber-700">Preview Rows</div>
          <div className="text-2xl font-bold text-amber-900">{getPreviewData().length}</div>
        </div>
      </div>
    </div>
  )
}