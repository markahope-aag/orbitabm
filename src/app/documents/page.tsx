'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DataTable, StatusBadge, Badge } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import type { GeneratedDocumentRow, CompanyRow } from '@/lib/types/database'

interface DocWithRelations extends GeneratedDocumentRow {
  companies?: { name: string }
  campaigns?: { name: string }
  profiles?: { full_name: string }
}

const DOC_TYPE_LABELS: Record<string, { label: string; color: 'blue' | 'purple' | 'green' | 'yellow' | 'gray' }> = {
  prospect_research: { label: 'Research', color: 'blue' },
  campaign_sequence: { label: 'Sequence', color: 'purple' },
  competitive_analysis: { label: 'Analysis', color: 'green' },
  audit_report: { label: 'Audit', color: 'yellow' },
  proposal: { label: 'Proposal', color: 'gray' },
}

const DOC_TYPES = ['prospect_research', 'campaign_sequence', 'competitive_analysis', 'audit_report', 'proposal'] as const
const DOC_STATUSES = ['draft', 'in_review', 'approved', 'delivered', 'archived'] as const

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`
}

export default function DocumentsPage() {
  const { currentOrgId } = useOrg()
  const supabase = createClient()

  const [documents, setDocuments] = useState<DocWithRelations[]>([])
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set())
  const [selectedCompanyId, setSelectedCompanyId] = useState('')

  useEffect(() => {
    if (currentOrgId) fetchData()
  }, [currentOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: docsData, error: docsError } = await supabase
        .from('generated_documents')
        .select(`
          *,
          companies:company_id(name),
          campaigns:campaign_id(name),
          profiles:approved_by(full_name)
        `)
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })

      if (docsError) throw docsError
      setDocuments(docsData as DocWithRelations[] || [])

      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('name')

      if (companiesError) throw companiesError
      setCompanies(companiesData || [])
    } catch (err) {
      console.error('Error fetching documents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const toggleFilter = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setter(next)
  }

  const filteredDocs = documents.filter(doc => {
    if (selectedTypes.size > 0 && !selectedTypes.has(doc.document_type)) return false
    if (selectedStatuses.size > 0 && !selectedStatuses.has(doc.status)) return false
    if (selectedCompanyId && doc.company_id !== selectedCompanyId) return false
    return true
  })

  const handleRowClick = (row: Record<string, unknown>) => {
    const doc = row as unknown as DocWithRelations
    if (doc.document_type === 'prospect_research' && doc.company_id) {
      window.location.href = `/companies/${doc.company_id}/research`
    } else if (doc.document_type === 'campaign_sequence' && doc.campaign_id) {
      window.location.href = `/campaigns/${doc.campaign_id}/sequence`
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/4 mb-8"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Documents</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Documents</h1>
          <p className="text-slate-600">All generated research, sequences, and reports</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 space-y-4">
          {/* Document Type chips */}
          <div>
            <span className="text-sm font-medium text-slate-700 mr-3">Type:</span>
            {DOC_TYPES.map(t => (
              <button
                key={t}
                onClick={() => toggleFilter(selectedTypes, t, setSelectedTypes)}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border mr-2 mb-1 transition-colors ${
                  selectedTypes.has(t)
                    ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {DOC_TYPE_LABELS[t]?.label || t}
              </button>
            ))}
          </div>

          {/* Status chips */}
          <div>
            <span className="text-sm font-medium text-slate-700 mr-3">Status:</span>
            {DOC_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => toggleFilter(selectedStatuses, s, setSelectedStatuses)}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border mr-2 mb-1 transition-colors ${
                  selectedStatuses.has(s)
                    ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Company dropdown */}
          <div>
            <span className="text-sm font-medium text-slate-700 mr-3">Company:</span>
            <select
              value={selectedCompanyId}
              onChange={e => setSelectedCompanyId(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">All Companies</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <DataTable
            data={filteredDocs as unknown as Record<string, unknown>[]}
            loading={loading}
            entityName="documents"
            columns={[
              {
                key: 'title',
                header: 'Title',
                render: (row) => (
                  <div className="font-medium text-slate-900">
                    {(row as unknown as DocWithRelations).title}
                  </div>
                )
              },
              {
                key: 'document_type',
                header: 'Type',
                render: (row) => {
                  const doc = row as unknown as DocWithRelations
                  const info = DOC_TYPE_LABELS[doc.document_type]
                  return info
                    ? <Badge label={info.label} color={info.color} />
                    : <Badge label={doc.document_type} color="gray" />
                }
              },
              {
                key: 'company',
                header: 'Company',
                render: (row) => (row as unknown as DocWithRelations).companies?.name || '\u2014'
              },
              {
                key: 'campaign',
                header: 'Campaign',
                render: (row) => (row as unknown as DocWithRelations).campaigns?.name || '\u2014'
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <StatusBadge status={(row as unknown as DocWithRelations).status} />
                )
              },
              {
                key: 'readiness',
                header: 'Readiness',
                render: (row) => {
                  const doc = row as unknown as DocWithRelations
                  if (doc.document_type !== 'prospect_research' || doc.readiness_score == null) return '\u2014'
                  const score = doc.readiness_score
                  const color = score >= 7 ? 'text-emerald-600' : score >= 4 ? 'text-amber-600' : 'text-red-600'
                  return <span className={`font-medium ${color}`}>{score}/10</span>
                }
              },
              {
                key: 'updated_at',
                header: 'Last Updated',
                render: (row) => {
                  const doc = row as unknown as DocWithRelations
                  return <span className="text-slate-500">{relativeTime(doc.updated_at)}</span>
                }
              },
              {
                key: 'approved_by',
                header: 'Approved By',
                render: (row) => (row as unknown as DocWithRelations).profiles?.full_name || '\u2014'
              }
            ]}
            onRowClick={handleRowClick}
            searchable={true}
            searchFields={['title']}
            emptyMessage="No documents found"
          />
        </div>
      </div>
    </div>
  )
}
