'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DataTable, Badge, SlideOver, ConfirmDialog } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast'
import { Trash2, ArrowRightLeft } from 'lucide-react'
import type { OrganizationRow } from '@/lib/types/database'

interface OrgWithMembers extends OrganizationRow {
  memberCount: number
  [key: string]: unknown
}

export function OrganizationsTab() {
  const supabase = createClient()
  const { currentOrgId, setCurrentOrg } = useOrg()
  const [orgs, setOrgs] = useState<OrgWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [slideOpen, setSlideOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<OrganizationRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrganizationRow | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formType, setFormType] = useState<'agency' | 'client'>('agency')
  const [formWebsite, setFormWebsite] = useState('')

  const fetchOrgs = useCallback(async () => {
    try {
      setLoading(true)
      const [orgsResult, profilesResult] = await Promise.all([
        supabase
          .from('organizations')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('organization_id'),
      ])

      if (orgsResult.error) throw orgsResult.error

      // Count members per org
      const memberMap: Record<string, number> = {}
      for (const p of profilesResult.data || []) {
        memberMap[p.organization_id] = (memberMap[p.organization_id] || 0) + 1
      }

      const withMembers: OrgWithMembers[] = (orgsResult.data || []).map(org => ({
        ...org,
        memberCount: memberMap[org.id] || 0,
      }))

      setOrgs(withMembers)
    } catch (err) {
      console.error('Error fetching organizations:', err)
      showErrorToast('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs])

  const openAdd = () => {
    setEditingOrg(null)
    setFormName('')
    setFormSlug('')
    setFormType('agency')
    setFormWebsite('')
    setSlideOpen(true)
  }

  const openEdit = (org: OrgWithMembers) => {
    setEditingOrg(org)
    setFormName(org.name)
    setFormSlug(org.slug)
    setFormType(org.type as 'agency' | 'client')
    setFormWebsite(org.website || '')
    setSlideOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formSlug.trim()) {
      showErrorToast('Name and slug are required')
      return
    }

    try {
      setSaving(true)
      if (editingOrg) {
        const res = await fetch(`/api/organizations/${editingOrg.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            slug: formSlug.trim(),
            type: formType,
            website: formWebsite.trim() || null,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update')
        }
        showSuccessToast('Organization updated')
      } else {
        const res = await fetch('/api/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            slug: formSlug.trim(),
            type: formType,
            website: formWebsite.trim() || null,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to create')
        }
        showSuccessToast('Organization created')
      }

      setSlideOpen(false)
      fetchOrgs()
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/organizations/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }
      showSuccessToast('Organization deleted')
      setDeleteTarget(null)
      fetchOrgs()
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: OrgWithMembers) => (
        <span className="flex items-center gap-2">
          {row.name}
          {row.id === currentOrgId && (
            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-cyan-50 text-cyan-700 rounded">
              Current
            </span>
          )}
        </span>
      ),
    },
    { key: 'slug', header: 'Slug' },
    {
      key: 'type',
      header: 'Type',
      render: (row: OrgWithMembers) => (
        <Badge label={row.type} color={row.type === 'agency' ? 'blue' : 'green'} />
      ),
    },
    {
      key: 'memberCount',
      header: 'Members',
      render: (row: OrgWithMembers) => <span>{row.memberCount}</span>,
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row: OrgWithMembers) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: OrgWithMembers) => (
        <div className="flex items-center gap-1">
          {row.id !== currentOrgId && (
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentOrg(row) }}
              className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors"
              title="Switch to this organization"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row) }}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={orgs}
        loading={loading}
        onRowClick={openEdit}
        onAdd={openAdd}
        addLabel="Add Organization"
        searchFields={['name', 'slug']}
        emptyMessage="No organizations found"
        entityName="organizations"
      />

      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editingOrg ? 'Edit Organization' : 'Add Organization'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Organization name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
            <input
              type="text"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="organization-slug"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as 'agency' | 'client')}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="agency">Agency</option>
              <option value="client">Client</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
            <input
              type="text"
              value={formWebsite}
              onChange={(e) => setFormWebsite(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="https://example.com"
            />
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button
              onClick={() => setSlideOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-500 rounded-md hover:bg-cyan-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingOrg ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Organization"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
      />
    </>
  )
}
