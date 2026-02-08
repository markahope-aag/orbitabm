'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DataTable, Badge, SlideOver } from '@/components/ui'
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
import type { DocumentTemplateRow, VerticalRow } from '@/lib/types/database'

interface TemplateWithRelations extends DocumentTemplateRow {
  verticals?: { name: string }
}

interface TemplateSection {
  section_id: string
  title: string
  type: 'auto' | 'hybrid' | 'manual'
  data_source: string
  prompts: string
}

const DOC_TYPE_LABELS: Record<string, { label: string; color: 'blue' | 'purple' | 'green' | 'yellow' | 'gray' }> = {
  prospect_research: { label: 'Research', color: 'blue' },
  campaign_sequence: { label: 'Sequence', color: 'purple' },
  competitive_analysis: { label: 'Analysis', color: 'green' },
  audit_report: { label: 'Audit', color: 'yellow' },
  proposal: { label: 'Proposal', color: 'gray' },
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default function TemplatesPage() {
  const { currentOrgId } = useOrg()
  const supabase = createClient()

  const [templates, setTemplates] = useState<TemplateWithRelations[]>([])
  const [verticals, setVerticals] = useState<VerticalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TemplateWithRelations | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    document_type: 'prospect_research',
    vertical_id: '',
    is_active: true,
  })
  const [sections, setSections] = useState<TemplateSection[]>([])

  useEffect(() => {
    if (currentOrgId) fetchData()
  }, [currentOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: templatesData, error: templatesError } = await supabase
        .from('document_templates')
        .select(`
          *,
          verticals:vertical_id(name)
        `)
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('name')

      if (templatesError) throw templatesError
      setTemplates(templatesData as TemplateWithRelations[] || [])

      const { data: verticalsData, error: verticalsError } = await supabase
        .from('verticals')
        .select('*')
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('name')

      if (verticalsError) throw verticalsError
      setVerticals(verticalsData || [])
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditing(null)
    setFormData({ name: '', document_type: 'prospect_research', vertical_id: '', is_active: true })
    setSections([])
    setModalOpen(true)
  }

  const openEdit = (template: TemplateWithRelations) => {
    setEditing(template)
    setFormData({
      name: template.name,
      document_type: template.document_type,
      vertical_id: template.vertical_id || '',
      is_active: template.is_active,
    })
    const structure = template.template_structure as { sections?: TemplateSection[] }
    setSections(structure?.sections || [])
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!currentOrgId || !formData.name.trim()) return

    try {
      setSaving(true)

      const payload = {
        organization_id: currentOrgId,
        name: formData.name,
        document_type: formData.document_type,
        vertical_id: formData.vertical_id || null,
        is_active: formData.is_active,
        template_structure: { sections },
      }

      if (editing) {
        const { error } = await supabase
          .from('document_templates')
          .update(payload)
          .eq('id', editing.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('document_templates')
          .insert([payload])

        if (error) throw error
      }

      await fetchData()
      setModalOpen(false)
      setEditing(null)
      showSuccessToast(editing ? 'Template updated' : 'Template created')
    } catch (err) {
      console.error('Error saving template:', err)
      showErrorToast(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (template: TemplateWithRelations) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const { error } = await supabase
        .from('document_templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', template.id)

      if (error) throw error
      await fetchData()
      setModalOpen(false)
      setEditing(null)
      showSuccessToast('Template deleted')
    } catch (err) {
      console.error('Error deleting template:', err)
      showErrorToast(err)
    }
  }

  // Section builder helpers
  const addSection = () => {
    setSections([...sections, { section_id: '', title: '', type: 'auto', data_source: '', prompts: '' }])
  }

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index))
  }

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    ;[next[index], next[target]] = [next[target], next[index]]
    setSections(next)
  }

  const updateSection = (index: number, field: keyof TemplateSection, value: string) => {
    const next = [...sections]
    next[index] = { ...next[index], [field]: value }
    if (field === 'title') {
      next[index].section_id = slugify(value)
    }
    setSections(next)
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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Templates</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-navy-900 mb-2">Document Templates</h1>
              <p className="text-slate-600">Manage templates for research, sequences, and reports</p>
            </div>
            <button
              onClick={openAdd}
              className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Template
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <DataTable
            data={templates as unknown as Record<string, unknown>[]}
            loading={loading}
            entityName="templates"
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (row) => (
                  <div className="font-medium text-slate-900">
                    {(row as unknown as TemplateWithRelations).name}
                  </div>
                )
              },
              {
                key: 'document_type',
                header: 'Document Type',
                render: (row) => {
                  const t = row as unknown as TemplateWithRelations
                  const info = DOC_TYPE_LABELS[t.document_type]
                  return info
                    ? <Badge label={info.label} color={info.color} />
                    : <Badge label={t.document_type} color="gray" />
                }
              },
              {
                key: 'vertical',
                header: 'Vertical',
                render: (row) => (row as unknown as TemplateWithRelations).verticals?.name || 'Cross-Vertical'
              },
              {
                key: 'version',
                header: 'Version',
                render: (row) => `v${(row as unknown as TemplateWithRelations).version}`
              },
              {
                key: 'is_active',
                header: 'Active',
                render: (row) => {
                  const active = (row as unknown as TemplateWithRelations).is_active
                  return (
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  )
                }
              }
            ]}
            onRowClick={(row) => openEdit(row as unknown as TemplateWithRelations)}
            searchable={true}
            searchFields={['name']}
            emptyMessage="No templates found"
          />
        </div>
      </div>

      {/* Add/Edit Template Modal */}
      <SlideOver
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Template' : 'Add Template'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Document Type *</label>
            <select
              value={formData.document_type}
              onChange={e => setFormData({ ...formData, document_type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="prospect_research">Prospect Research</option>
              <option value="campaign_sequence">Campaign Sequence</option>
              <option value="competitive_analysis">Competitive Analysis</option>
              <option value="audit_report">Audit Report</option>
              <option value="proposal">Proposal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vertical</label>
            <select
              value={formData.vertical_id}
              onChange={e => setFormData({ ...formData, vertical_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Cross-Vertical</option>
              {verticals.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-slate-700">Active</label>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.is_active ? 'bg-cyan-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  formData.is_active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Section Builder */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Sections</h3>
              <button
                onClick={addSection}
                className="flex items-center px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Section
              </button>
            </div>

            {sections.length === 0 && (
              <p className="text-sm text-slate-500">No sections defined. Click &quot;Add Section&quot; to get started.</p>
            )}

            <div className="space-y-4">
              {sections.map((section, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-medium text-slate-500 uppercase">
                      Section {idx + 1}
                      {section.section_id && <span className="ml-2 text-slate-400 normal-case">({section.section_id})</span>}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => moveSection(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveSection(idx, 1)}
                        disabled={idx === sections.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeSection(idx)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                      <input
                        type="text"
                        value={section.title}
                        onChange={e => updateSection(idx, 'title', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                        <select
                          value={section.type}
                          onChange={e => updateSection(idx, 'type', e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="auto">Auto</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="manual">Manual</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Data Source</label>
                        <input
                          type="text"
                          value={section.data_source}
                          onChange={e => updateSection(idx, 'data_source', e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Prompts</label>
                      <textarea
                        rows={2}
                        value={section.prompts}
                        onChange={e => updateSection(idx, 'prompts', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            {editing && (
              <button
                onClick={() => handleDelete(editing)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editing ? 'Update Template' : 'Add Template'}
            </button>
          </div>
        </div>
      </SlideOver>
    </div>
  )
}
