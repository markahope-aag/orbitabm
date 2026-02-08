'use client'

import { useState } from 'react'
import { useOrg } from '@/lib/context/OrgContext'
import { useVerticals } from '@/lib/supabase/hooks'
import { createClient } from '@/lib/supabase/client'
import { DataTable, SlideOver, ConfirmDialog, StatusBadge, Badge } from '@/components/ui'
import type { VerticalRow, VerticalInsert, VerticalUpdate } from '@/lib/types/database'

interface VerticalFormData {
  name: string
  sector: string
  b2b_b2c: 'B2B' | 'B2C' | 'Both' | null
  naics_code: string
  revenue_floor: number | null
  typical_revenue_range: string
  typical_marketing_budget_pct: string
  key_decision_maker_title: string
  tier: 'tier_1' | 'tier_2' | 'tier_3' | 'borderline' | 'eliminated' | null
  notes: string
}

const initialFormData: VerticalFormData = {
  name: '',
  sector: '',
  b2b_b2c: null,
  naics_code: '',
  revenue_floor: null,
  typical_revenue_range: '',
  typical_marketing_budget_pct: '',
  key_decision_maker_title: '',
  tier: null,
  notes: ''
}

export default function Verticals() {
  const { currentOrgId } = useOrg()
  const { data: verticals, loading, error, refetch } = useVerticals(currentOrgId || '')
  
  const [slideOverOpen, setSlideOverOpen] = useState(false)
  const [editingVertical, setEditingVertical] = useState<VerticalRow | null>(null)
  const [formData, setFormData] = useState<VerticalFormData>(initialFormData)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleAdd = () => {
    setEditingVertical(null)
    setFormData(initialFormData)
    setSlideOverOpen(true)
  }

  const handleEdit = (vertical: VerticalRow) => {
    setEditingVertical(vertical)
    setFormData({
      name: vertical.name || '',
      sector: vertical.sector || '',
      b2b_b2c: vertical.b2b_b2c as VerticalFormData['b2b_b2c'],
      naics_code: vertical.naics_code || '',
      revenue_floor: vertical.revenue_floor,
      typical_revenue_range: vertical.typical_revenue_range || '',
      typical_marketing_budget_pct: vertical.typical_marketing_budget_pct || '',
      key_decision_maker_title: vertical.key_decision_maker_title || '',
      tier: vertical.tier as VerticalFormData['tier'],
      notes: vertical.notes || ''
    })
    setSlideOverOpen(true)
  }

  const handleSave = async () => {
    if (!currentOrgId || !formData.name.trim()) return

    setSaving(true)
    try {
      const supabase = createClient()
      
      if (editingVertical) {
        // Update existing vertical
        const updateData: VerticalUpdate = {
          name: formData.name.trim(),
          sector: formData.sector.trim() || null,
          b2b_b2c: formData.b2b_b2c,
          naics_code: formData.naics_code.trim() || null,
          revenue_floor: formData.revenue_floor,
          typical_revenue_range: formData.typical_revenue_range.trim() || null,
          typical_marketing_budget_pct: formData.typical_marketing_budget_pct.trim() || null,
          key_decision_maker_title: formData.key_decision_maker_title.trim() || null,
          tier: formData.tier,
          notes: formData.notes.trim() || null
        }
        const { error } = await supabase
          .from('verticals')
          .update(updateData)
          .eq('id', editingVertical.id)
        
        if (error) throw error
      } else {
        // Create new vertical
        const insertData: VerticalInsert = {
          organization_id: currentOrgId,
          name: formData.name.trim(),
          sector: formData.sector.trim() || null,
          b2b_b2c: formData.b2b_b2c,
          naics_code: formData.naics_code.trim() || null,
          revenue_floor: formData.revenue_floor,
          typical_revenue_range: formData.typical_revenue_range.trim() || null,
          typical_marketing_budget_pct: formData.typical_marketing_budget_pct.trim() || null,
          key_decision_maker_title: formData.key_decision_maker_title.trim() || null,
          tier: formData.tier,
          notes: formData.notes.trim() || null
        }
        const { error } = await supabase
          .from('verticals')
          .insert(insertData)
        
        if (error) throw error
      }
      
      setSlideOverOpen(false)
      refetch()
    } catch (err) {
      console.error('Error saving vertical:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingVertical) return

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('verticals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', editingVertical.id)
      
      if (error) throw error
      
      setConfirmDeleteOpen(false)
      setSlideOverOpen(false)
      refetch()
    } catch (err) {
      console.error('Error deleting vertical:', err)
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (num: number | null) => {
    if (!num) return ''
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num)
  }

  const getB2BColor = (type: string | null): 'blue' | 'green' | 'purple' => {
    switch (type) {
      case 'B2B': return 'blue'
      case 'B2C': return 'green'
      case 'Both': return 'purple'
      default: return 'blue'
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Name',
      width: 'w-1/4'
    },
    {
      key: 'sector',
      header: 'Sector',
      width: 'w-32'
    },
    {
      key: 'b2b_b2c',
      header: 'B2B/B2C',
      width: 'w-24',
      render: (row: Record<string, unknown>) => {
        const vertical = row as unknown as VerticalRow
        return vertical.b2b_b2c ? (
          <Badge label={vertical.b2b_b2c} color={getB2BColor(vertical.b2b_b2c)} />
        ) : null
      }
    },
    {
      key: 'naics_code',
      header: 'NAICS Code',
      width: 'w-28'
    },
    {
      key: 'revenue_floor',
      header: 'Revenue Floor',
      width: 'w-32',
      render: (row: Record<string, unknown>) => formatCurrency((row as unknown as VerticalRow).revenue_floor)
    },
    {
      key: 'tier',
      header: 'Tier',
      width: 'w-24',
      render: (row: Record<string, unknown>) => {
        const vertical = row as unknown as VerticalRow
        return vertical.tier ? <StatusBadge status={vertical.tier} /> : null
      }
    },
    {
      key: 'key_decision_maker_title',
      header: 'Key Decision Maker',
      render: (row: Record<string, unknown>) => (row as unknown as VerticalRow).key_decision_maker_title || ''
    }
  ]

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error loading verticals: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Verticals</h1>
          <p className="text-slate-600">Manage your target industry verticals and segments</p>
        </div>

        <DataTable
          columns={columns}
          data={(verticals as unknown as Record<string, unknown>[]) || []}
          loading={loading}
          entityName="verticals"
          onRowClick={(row) => handleEdit(row as unknown as VerticalRow)}
          onAdd={handleAdd}
          addLabel="Add Vertical"
          emptyMessage="No verticals found. Add your first vertical to get started."
          searchFields={['name', 'sector', 'naics_code', 'key_decision_maker_title']}
        />

        {/* Add/Edit SlideOver */}
        <SlideOver
          open={slideOverOpen}
          onClose={() => setSlideOverOpen(false)}
          title={editingVertical ? 'Edit Vertical' : 'Add Vertical'}
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="e.g., HVAC Contractors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sector
              </label>
              <input
                type="text"
                value={formData.sector}
                onChange={(e) => setFormData(prev => ({ ...prev, sector: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="e.g., Construction, Healthcare"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                B2B/B2C
              </label>
              <select
                value={formData.b2b_b2c || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  b2b_b2c: e.target.value as VerticalFormData['b2b_b2c'] || null
                }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">Select type</option>
                <option value="B2B">B2B</option>
                <option value="B2C">B2C</option>
                <option value="Both">Both</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                NAICS Code
              </label>
              <input
                type="text"
                value={formData.naics_code}
                onChange={(e) => setFormData(prev => ({ ...prev, naics_code: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="e.g., 238220"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Revenue Floor
              </label>
              <input
                type="number"
                value={formData.revenue_floor || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  revenue_floor: e.target.value ? parseInt(e.target.value) : null 
                }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="e.g., 1000000"
              />
              <p className="text-sm text-slate-500 mt-1">Minimum annual revenue in USD</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Typical Revenue Range
              </label>
              <input
                type="text"
                value={formData.typical_revenue_range}
                onChange={(e) => setFormData(prev => ({ ...prev, typical_revenue_range: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="e.g., $1M - $10M"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Typical Marketing Budget %
              </label>
              <input
                type="text"
                value={formData.typical_marketing_budget_pct}
                onChange={(e) => setFormData(prev => ({ ...prev, typical_marketing_budget_pct: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="e.g., 3-5%"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Key Decision Maker Title
              </label>
              <input
                type="text"
                value={formData.key_decision_maker_title}
                onChange={(e) => setFormData(prev => ({ ...prev, key_decision_maker_title: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="e.g., Owner, General Manager"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tier
              </label>
              <select
                value={formData.tier || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  tier: e.target.value as VerticalFormData['tier'] || null
                }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">Select tier</option>
                <option value="tier_1">Tier 1</option>
                <option value="tier_2">Tier 2</option>
                <option value="tier_3">Tier 3</option>
                <option value="borderline">Borderline</option>
                <option value="eliminated">Eliminated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="Additional notes about this vertical..."
              />
            </div>

            <div className="flex justify-between pt-6">
              {editingVertical && (
                <button
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
              
              <div className="flex space-x-3 ml-auto">
                <button
                  onClick={() => setSlideOverOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-cyan-500 rounded-md hover:bg-cyan-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingVertical ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </SlideOver>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={confirmDeleteOpen}
          onClose={() => setConfirmDeleteOpen(false)}
          onConfirm={handleDelete}
          title="Delete Vertical"
          message={`Are you sure you want to delete "${editingVertical?.name}"? This action cannot be undone.`}
        />
      </div>
    </div>
  )
}