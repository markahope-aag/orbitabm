'use client'

import { useState } from 'react'
import { useOrg } from '@/lib/context/OrgContext'
import { CsvUploader } from '@/components/import/CsvUploader'
import { ColumnMapper } from '@/components/import/ColumnMapper'
import { ImportPreview } from '@/components/import/ImportPreview'
import { downloadTemplate } from '@/lib/utils/csvExport'
import { showErrorToast, showSuccessToast, toastPromise } from '@/lib/utils/toast'
import { exportToCSV } from '@/lib/utils/csvExport'
import {
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Database,
  RefreshCw,
  Shield
} from 'lucide-react'

type EntityType = 'companies' | 'contacts' | 'markets' | 'verticals' | 'digital_snapshots'
type ImportStep = 'select' | 'upload' | 'map' | 'preview' | 'import' | 'complete'
type ImportMode = 'append' | 'overwrite'

interface ProcessedRow {
  originalIndex: number
  data: Record<string, unknown>
  issues: ValidationIssue[]
  status: 'valid' | 'warning' | 'error'
}

interface ValidationIssue {
  row: number
  field: string
  issue: 'missing_required' | 'invalid_lookup' | 'duplicate' | 'invalid_format'
  message: string
  suggestion?: string
}

const entityTypes = [
  { key: 'companies', label: 'Companies', description: 'Import company records with market and vertical assignments' },
  { key: 'contacts', label: 'Contacts', description: 'Import contact information linked to companies' },
  { key: 'markets', label: 'Markets', description: 'Import market/geographic data' },
  { key: 'verticals', label: 'Verticals', description: 'Import industry vertical definitions' },
  { key: 'digital_snapshots', label: 'Digital Snapshots', description: 'Import digital presence data for companies' }
] as const

const entityFields = {
  companies: [
    { key: 'name', label: 'Company Name', required: true },
    { key: 'market', label: 'Market (will lookup by name)', required: false },
    { key: 'vertical', label: 'Vertical (will lookup by name)', required: false },
    { key: 'website', label: 'Website URL', required: false },
    { key: 'phone', label: 'Phone Number', required: false },
    { key: 'address_line1', label: 'Address Line 1', required: false },
    { key: 'address_line2', label: 'Address Line 2', required: false },
    { key: 'city', label: 'City', required: false },
    { key: 'state', label: 'State', required: false },
    { key: 'zip', label: 'ZIP Code', required: false },
    { key: 'estimated_revenue', label: 'Estimated Revenue', required: false },
    { key: 'employee_count', label: 'Employee Count', required: false },
    { key: 'year_founded', label: 'Year Founded', required: false },
    { key: 'ownership_type', label: 'Ownership Type', required: false },
    { key: 'qualifying_tier', label: 'Qualifying Tier', required: false },
    { key: 'status', label: 'Status', required: false },
    { key: 'manufacturer_affiliations', label: 'Manufacturer Affiliations', required: false },
    { key: 'certifications', label: 'Certifications', required: false },
    { key: 'awards', label: 'Awards', required: false },
    { key: 'notes', label: 'Notes', required: false }
  ],
  contacts: [
    { key: 'first_name', label: 'First Name', required: true },
    { key: 'last_name', label: 'Last Name', required: true },
    { key: 'company', label: 'Company (will lookup by name)', required: false },
    { key: 'title', label: 'Job Title', required: false },
    { key: 'email', label: 'Email Address', required: false },
    { key: 'phone', label: 'Phone Number', required: false },
    { key: 'linkedin_url', label: 'LinkedIn URL', required: false },
    { key: 'is_primary', label: 'Is Primary Contact (true/false)', required: false },
    { key: 'relationship_status', label: 'Relationship Status', required: false },
    { key: 'notes', label: 'Notes', required: false }
  ],
  markets: [
    { key: 'name', label: 'Market Name', required: true },
    { key: 'state', label: 'State', required: false },
    { key: 'metro_population', label: 'Metro Population', required: false },
    { key: 'market_size_estimate', label: 'Market Size Estimate', required: false },
    { key: 'pe_activity_level', label: 'PE Activity Level', required: false },
    { key: 'notes', label: 'Notes', required: false }
  ],
  verticals: [
    { key: 'name', label: 'Vertical Name', required: true },
    { key: 'sector', label: 'Sector', required: false },
    { key: 'b2b_b2c', label: 'B2B/B2C Type', required: false },
    { key: 'naics_code', label: 'NAICS Code', required: false },
    { key: 'revenue_floor', label: 'Revenue Floor', required: false },
    { key: 'typical_revenue_range', label: 'Typical Revenue Range', required: false },
    { key: 'typical_marketing_budget_pct', label: 'Typical Marketing Budget %', required: false },
    { key: 'key_decision_maker_title', label: 'Key Decision Maker Title', required: false },
    { key: 'tier', label: 'Tier', required: false },
    { key: 'notes', label: 'Notes', required: false }
  ],
  digital_snapshots: [
    { key: 'company', label: 'Company (will lookup by name)', required: true },
    { key: 'snapshot_date', label: 'Snapshot Date (YYYY-MM-DD)', required: true },
    { key: 'google_rating', label: 'Google Rating', required: false },
    { key: 'google_review_count', label: 'Google Review Count', required: false },
    { key: 'yelp_rating', label: 'Yelp Rating', required: false },
    { key: 'yelp_review_count', label: 'Yelp Review Count', required: false },
    { key: 'bbb_rating', label: 'BBB Rating', required: false },
    { key: 'facebook_followers', label: 'Facebook Followers', required: false },
    { key: 'instagram_followers', label: 'Instagram Followers', required: false },
    { key: 'linkedin_followers', label: 'LinkedIn Followers', required: false },
    { key: 'domain_authority', label: 'Domain Authority', required: false },
    { key: 'page_speed_mobile', label: 'Page Speed Mobile', required: false },
    { key: 'page_speed_desktop', label: 'Page Speed Desktop', required: false },
    { key: 'organic_keywords', label: 'Organic Keywords', required: false },
    { key: 'monthly_organic_traffic_est', label: 'Monthly Organic Traffic Est', required: false },
    { key: 'has_blog', label: 'Has Blog (true/false)', required: false },
    { key: 'has_online_booking', label: 'Has Online Booking (true/false)', required: false },
    { key: 'has_live_chat', label: 'Has Live Chat (true/false)', required: false },
    { key: 'notes', label: 'Notes', required: false }
  ]
}

export function ImportContent() {
  const { currentOrgId } = useOrg()

  // State
  const [currentStep, setCurrentStep] = useState<ImportStep>('select')
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('companies')
  const [csvData, setCsvData] = useState<Record<string, unknown>[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [columnMappings, setColumnMappings] = useState<Array<{ csvHeader: string; dbField: string | null }>>([])
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState<{
    created: number
    updated: number
    skipped: number
    errors: string[]
    marketsCreated: string[]
    verticalsCreated: string[]
    mode: ImportMode
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [existingCount, setExistingCount] = useState<number>(0)
  const [importMode, setImportMode] = useState<ImportMode>('append')
  const [isExporting, setIsExporting] = useState(false)

  const handleEntitySelect = async (entityType: EntityType) => {
    setSelectedEntity(entityType)
    setCurrentStep('upload')
    setError(null)
    setImportMode('append')

    // Fetch existing record count for this entity type
    try {
      const res = await fetch('/api/import/counts')
      if (res.ok) {
        const counts = await res.json()
        setExistingCount(counts[entityType] ?? 0)
      }
    } catch {
      // Non-critical — just won't show the warning
      setExistingCount(0)
    }
  }

  const handleExportExisting = async () => {
    if (selectedEntity !== 'companies') return
    setIsExporting(true)
    try {
      const res = await fetch('/api/companies/export')
      if (!res.ok) throw new Error('Export failed')
      const { data } = await res.json()
      if (!data || data.length === 0) {
        showErrorToast('No data to export')
        return
      }
      const columns = Object.keys(data[0]).map((key: string) => ({
        key,
        header: key,
      }))
      exportToCSV(data, columns, 'companies')
      showSuccessToast(`Exported ${data.length} companies`)
    } catch {
      showErrorToast('Failed to export existing data')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDataParsed = (data: Record<string, unknown>[], headers: string[]) => {
    try {
      if (!data || data.length === 0) {
        showErrorToast('CSV file is empty or contains no valid data')
        return
      }

      if (!headers || headers.length === 0) {
        showErrorToast('CSV file must contain column headers')
        return
      }

      setCsvData(data)
      setCsvHeaders(headers)
      setCurrentStep('map')
      setError(null)
      showSuccessToast(`Successfully parsed ${data.length} rows from CSV`)
    } catch (err) {
      showErrorToast('Failed to parse CSV file')
      console.error('CSV parsing error:', err)
    }
  }

  const handleMappingChange = (mappings: Array<{ csvHeader: string; dbField: string | null }>) => {
    setColumnMappings(mappings)
  }

  const handleCsvError = (error: string) => {
    showErrorToast(error)
    setError(error)
  }

  const handleValidationComplete = (processed: ProcessedRow[]) => {
    setProcessedRows(processed)
  }

  const handleImport = async () => {
    if (!currentOrgId) {
      showErrorToast('No organization selected')
      return
    }

    setIsImporting(true)
    setError(null)

    try {
      // Filter out rows with errors
      const validRows = processedRows.filter(row => row.status !== 'error')

      if (validRows.length === 0) {
        throw new Error('No valid rows to import')
      }

      const results = await toastPromise(
        (async () => {
          // Prepare data for import
          const importData = validRows.map(row => ({
            ...row.data,
            organization_id: currentOrgId
          }))

          // Import via API route
          const response = await fetch(`/api/${selectedEntity}/import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              data: importData,
              organization_id: currentOrgId,
              mode: importMode,
            })
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Import failed')
          }

          return await response.json()
        })(),
        {
          loading: `Importing ${validRows.length} ${selectedEntity}...`,
          success: (results) => {
            const created = results.created ?? 0
            const updated = results.updated ?? 0
            const skipped = processedRows.length - validRows.length
            const parts = []
            if (created > 0) parts.push(`${created} created`)
            if (updated > 0) parts.push(`${updated} updated`)
            if (skipped > 0) parts.push(`${skipped} skipped`)
            return `Successfully imported ${selectedEntity}: ${parts.join(', ')}`
          },
          error: 'Failed to import data'
        }
      )

      setImportResults({
        created: results.created ?? 0,
        updated: results.updated ?? 0,
        skipped: processedRows.length - validRows.length,
        errors: results.errors || [],
        marketsCreated: results.marketsCreated || [],
        verticalsCreated: results.verticalsCreated || [],
        mode: importMode,
      })

      setCurrentStep('complete')
    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const resetImport = () => {
    setCurrentStep('select')
    setCsvData([])
    setCsvHeaders([])
    setColumnMappings([])
    setProcessedRows([])
    setImportResults(null)
    setError(null)
    setExistingCount(0)
    setImportMode('append')
  }

  const canProceedToPreview = () => {
    const mappedFields = columnMappings.filter(m => m.dbField).length
    const requiredFields = entityFields[selectedEntity].filter(f => f.required)
    const mappedRequiredFields = requiredFields.filter(field =>
      columnMappings.some(m => m.dbField === field.key)
    )

    return mappedFields > 0 && mappedRequiredFields.length === requiredFields.length
  }

  const canProceedToImport = () => {
    const validRows = processedRows.filter(row => row.status !== 'error').length
    return validRows > 0
  }

  return (
    <div>
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 overflow-x-auto pb-2">
          {[
            { key: 'select', label: 'Select Type', icon: Database },
            { key: 'upload', label: 'Upload CSV', icon: Upload },
            { key: 'map', label: 'Map Columns', icon: ArrowRight },
            { key: 'preview', label: 'Preview', icon: CheckCircle },
            { key: 'import', label: 'Import', icon: Database }
          ].map((step, index) => {
            const isActive = currentStep === step.key
            const isCompleted = ['select', 'upload', 'map', 'preview'].indexOf(currentStep) >
                               ['select', 'upload', 'map', 'preview'].indexOf(step.key)
            const Icon = step.icon

            return (
              <div key={step.key} className="flex items-center">
                <div className={`
                  flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
                  ${isActive ? 'bg-cyan-100 text-cyan-700' :
                    isCompleted ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-500'}
                `}>
                  <Icon className="w-4 h-4" />
                  <span className="whitespace-nowrap">{step.label}</span>
                </div>
                {index < 4 && (
                  <ArrowRight className="w-4 h-4 text-slate-400 mx-2" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="font-medium text-red-700">Error</span>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {/* Step 1: Select Entity Type */}
        {currentStep === 'select' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Step 1: Select Entity Type
            </h2>
            <p className="text-slate-600 mb-6">
              Choose the type of data you want to import:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {entityTypes.map((entity) => (
                <button
                  key={entity.key}
                  onClick={() => handleEntitySelect(entity.key as EntityType)}
                  className="text-left p-4 border border-slate-200 rounded-lg hover:border-cyan-500 hover:bg-cyan-50 transition-colors"
                >
                  <div className="font-medium text-slate-900 mb-1">
                    {entity.label}
                  </div>
                  <div className="text-sm text-slate-600">
                    {entity.description}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Download className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">Need a template?</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    Download CSV templates with the correct headers and example data:
                  </p>
                  <div className="flex flex-wrap gap-2">
              {entityTypes.map((entity) => (
                <button
                  key={entity.key}
                  onClick={() => downloadTemplate(entity.key as EntityType)}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                >
                  {entity.label} Template
                </button>
              ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Upload CSV */}
        {currentStep === 'upload' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">
                Step 2: Upload CSV File
              </h2>
              <button
                onClick={() => setCurrentStep('select')}
                className="flex items-center text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </button>
            </div>

            <p className="text-slate-600 mb-6">
              Upload a CSV file containing {selectedEntity} data:
            </p>

            {/* Existing data warning */}
            {existingCount > 0 && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-amber-900">
                      You already have {existingCount} {selectedEntity}
                    </h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Importing will merge new data with existing records. Choose how to handle matches below.
                    </p>

                    {/* Import mode toggle */}
                    <div className="mt-3 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => setImportMode('append')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                          importMode === 'append'
                            ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Shield className="w-4 h-4" />
                        <div className="text-left">
                          <div>Append (Safe)</div>
                          <div className="font-normal text-xs opacity-75">Only fills in empty fields on existing records</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setImportMode('overwrite')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                          importMode === 'overwrite'
                            ? 'bg-red-50 border-red-300 text-red-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <RefreshCw className="w-4 h-4" />
                        <div className="text-left">
                          <div>Overwrite</div>
                          <div className="font-normal text-xs opacity-75">CSV values replace all existing fields</div>
                        </div>
                      </button>
                    </div>

                    {/* Export existing data */}
                    {selectedEntity === 'companies' && (
                      <button
                        onClick={handleExportExisting}
                        disabled={isExporting}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm text-amber-800 hover:text-amber-900 underline underline-offset-2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {isExporting ? 'Exporting...' : 'Export existing data as CSV'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <CsvUploader
              onDataParsed={handleDataParsed}
              onError={handleCsvError}
            />

            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-medium text-amber-900 mb-2">CSV Requirements</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• First row must contain column headers</li>
                <li>• Use UTF-8 encoding</li>
                <li>• Required fields: {entityFields[selectedEntity].filter(f => f.required).map(f => f.label).join(', ')}</li>
                <li>• Maximum file size: 10MB</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 3: Map Columns */}
        {currentStep === 'map' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">
                Step 3: Map Columns
              </h2>
              <button
                onClick={() => setCurrentStep('upload')}
                className="flex items-center text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </button>
            </div>

            <ColumnMapper
              csvHeaders={csvHeaders}
              dbFields={entityFields[selectedEntity]}
              data={csvData}
              onMappingChange={handleMappingChange}
            />

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setCurrentStep('preview')}
                disabled={!canProceedToPreview()}
                className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Preview Import
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Preview & Validate */}
        {currentStep === 'preview' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">
                Step 4: Preview & Validate
              </h2>
              <button
                onClick={() => setCurrentStep('map')}
                className="flex items-center text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </button>
            </div>

            <ImportPreview
              data={csvData}
              mappings={columnMappings}
              entityType={selectedEntity}
              onValidationComplete={handleValidationComplete}
            />

            <div className="flex justify-end mt-6">
              <button
                onClick={handleImport}
                disabled={!canProceedToImport() || isImporting}
                className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    Start Import
                    <Database className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Import Complete */}
        {currentStep === 'complete' && importResults && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Import Complete!
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <div>
                    <div className="text-sm font-medium text-emerald-700">Created</div>
                    <div className="text-2xl font-bold text-emerald-900">{importResults.created}</div>
                  </div>
                </div>
              </div>

              {importResults.updated > 0 && (
                <div className="bg-cyan-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-5 h-5 text-cyan-500" />
                    <div>
                      <div className="text-sm font-medium text-cyan-700">Updated</div>
                      <div className="text-2xl font-bold text-cyan-900">{importResults.updated}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <div>
                    <div className="text-sm font-medium text-amber-700">Skipped</div>
                    <div className="text-2xl font-bold text-amber-900">{importResults.skipped}</div>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="text-sm font-medium text-red-700">Errors</div>
                    <div className="text-2xl font-bold text-red-900">{importResults.errors.length}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Auto-created entities */}
            {(importResults.marketsCreated.length > 0 || importResults.verticalsCreated.length > 0) && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Auto-Created During Import</h3>
                {importResults.marketsCreated.length > 0 && (
                  <p className="text-sm text-blue-700">
                    Markets: {importResults.marketsCreated.join(', ')}
                  </p>
                )}
                {importResults.verticalsCreated.length > 0 && (
                  <p className="text-sm text-blue-700 mt-1">
                    Verticals: {importResults.verticalsCreated.join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Import mode used */}
            <div className="mb-6 text-sm text-slate-500">
              Import mode: <span className="font-medium text-slate-700">{importResults.mode === 'append' ? 'Append (safe)' : 'Overwrite'}</span>
            </div>

            {importResults.errors.length > 0 && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-medium text-red-900 mb-2">Import Errors</h3>
                <ul className="text-sm text-red-700 space-y-1">
                  {importResults.errors.slice(0, 10).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {importResults.errors.length > 10 && (
                    <li>• ... and {importResults.errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={resetImport}
                className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
              >
                Import More Data
              </button>
              <button
                onClick={() => window.location.href = `/${selectedEntity}`}
                className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
              >
                View {selectedEntity.charAt(0).toUpperCase() + selectedEntity.slice(1)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
