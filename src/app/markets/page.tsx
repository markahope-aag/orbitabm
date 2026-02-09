'use client'

import { useState } from 'react'
import { useOrg } from '@/lib/context/OrgContext'
import { useMarkets } from '@/lib/supabase/hooks'
import { createClient } from '@/lib/supabase/client'
import { DataTable, SlideOver, ConfirmDialog, StatusBadge } from '@/components/ui'
import { toastPromise } from '@/lib/utils/toast'
import type { MarketRow, MarketInsert, MarketUpdate, PEConsolidationStatus, CompetitionLevel, MarketMaturity } from '@/lib/types/database'

interface MarketFormData {
  name: string
  state: string
  metro_population: number | null
  market_size_estimate: number | null
  pe_activity_level: 'none' | 'low' | 'moderate' | 'high' | 'critical'
  target_company_count: number | null
  pe_consolidation_status: PEConsolidationStatus | null
  competition_level: CompetitionLevel | null
  primary_trade_association: string
  peak_season_months: string
  market_maturity: MarketMaturity | null
  avg_cpc_estimate: number | null
  notes: string
}

const initialFormData: MarketFormData = {
  name: '',
  state: '',
  metro_population: null,
  market_size_estimate: null,
  pe_activity_level: 'none',
  target_company_count: null,
  pe_consolidation_status: null,
  competition_level: null,
  primary_trade_association: '',
  peak_season_months: '',
  market_maturity: null,
  avg_cpc_estimate: null,
  notes: ''
}

export default function Markets() {
  const { currentOrgId } = useOrg()
  const { data: markets, loading, error, refetch } = useMarkets(currentOrgId || '')

  const [slideOverOpen, setSlideOverOpen] = useState(false)
  const [editingMarket, setEditingMarket] = useState<MarketRow | null>(null)
  const [formData, setFormData] = useState<MarketFormData>(initialFormData)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleAdd = () => {
    setEditingMarket(null)
    setFormData(initialFormData)
    setSlideOverOpen(true)
  }

  const handleEdit = (market: MarketRow) => {
    setEditingMarket(market)
    setFormData({
      name: market.name || '',
      state: market.state || '',
      metro_population: market.metro_population,
      market_size_estimate: market.market_size_estimate,
      pe_activity_level: market.pe_activity_level as MarketFormData['pe_activity_level'] || 'none',
      target_company_count: market.target_company_count,
      pe_consolidation_status: market.pe_consolidation_status,
      competition_level: market.competition_level,
      primary_trade_association: market.primary_trade_association || '',
      peak_season_months: market.peak_season_months || '',
      market_maturity: market.market_maturity,
      avg_cpc_estimate: market.avg_cpc_estimate,
      notes: market.notes || ''
    })
    setSlideOverOpen(true)
  }

  const handleSave = async () => {
    if (!currentOrgId || !formData.name.trim() || !formData.state.trim()) return

    setSaving(true)

    try {
      await toastPromise(
        (async () => {
          const supabase = createClient()

          const abmFields = {
            target_company_count: formData.target_company_count,
            pe_consolidation_status: formData.pe_consolidation_status,
            competition_level: formData.competition_level,
            primary_trade_association: formData.primary_trade_association.trim() || null,
            peak_season_months: formData.peak_season_months.trim() || null,
            market_maturity: formData.market_maturity,
            avg_cpc_estimate: formData.avg_cpc_estimate,
            last_updated: new Date().toISOString(),
          }

          if (editingMarket) {
            // Update existing market
            const updateData: MarketUpdate = {
              name: formData.name.trim(),
              state: formData.state.trim(),
              metro_population: formData.metro_population,
              market_size_estimate: formData.market_size_estimate,
              pe_activity_level: formData.pe_activity_level,
              ...abmFields,
              notes: formData.notes.trim() || null
            }
            const { error } = await supabase
              .from('markets')
              .update(updateData)
              .eq('id', editingMarket.id)

            if (error) throw error
            return { name: formData.name.trim() }
          } else {
            // Create new market
            const insertData: MarketInsert = {
              organization_id: currentOrgId,
              name: formData.name.trim(),
              state: formData.state.trim(),
              metro_population: formData.metro_population,
              market_size_estimate: formData.market_size_estimate,
              pe_activity_level: formData.pe_activity_level,
              ...abmFields,
              notes: formData.notes.trim() || null
            }
            const { error } = await supabase
              .from('markets')
              .insert(insertData)

            if (error) throw error
            return { name: formData.name.trim() }
          }
        })(),
        {
          loading: editingMarket ? 'Updating market...' : 'Creating market...',
          success: (data) => editingMarket
            ? `Market "${data.name}" updated successfully`
            : `Market "${data.name}" created successfully`,
          error: editingMarket
            ? 'Failed to update market'
            : 'Failed to create market'
        }
      )

      setSlideOverOpen(false)
      refetch()
    } catch (err) {
      // Error is already handled by toastPromise
      console.error('Error saving market:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingMarket) return

    setSaving(true)
    const marketName = editingMarket.name

    try {
      await toastPromise(
        (async () => {
          const supabase = createClient()
          const { error } = await supabase
            .from('markets')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', editingMarket.id)

          if (error) throw error
          return { name: marketName }
        })(),
        {
          loading: 'Deleting market...',
          success: (data) => `Market "${data.name}" deleted successfully`,
          error: 'Failed to delete market'
        }
      )

      setConfirmDeleteOpen(false)
      setSlideOverOpen(false)
      refetch()
    } catch (err) {
      // Error is already handled by toastPromise
      console.error('Error deleting market:', err)
    } finally {
      setSaving(false)
    }
  }

  const formatNumber = (num: number | null) => {
    if (!num) return ''
    return num.toLocaleString()
  }


  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return ''
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const columns = [
    {
      key: 'name',
      header: 'Name',
      width: 'w-1/5'
    },
    {
      key: 'state',
      header: 'State',
      width: 'w-16'
    },
    {
      key: 'metro_population',
      header: 'Metro Pop.',
      width: 'w-28',
      render: (row: Record<string, unknown>) => formatNumber((row as unknown as MarketRow).metro_population)
    },
    {
      key: 'pe_activity_level',
      header: 'PE Activity',
      width: 'w-28',
      render: (row: Record<string, unknown>) => (
        <StatusBadge status={(row as unknown as MarketRow).pe_activity_level || 'none'} />
      )
    },
    {
      key: 'competition_level',
      header: 'Competition',
      width: 'w-28',
      render: (row: Record<string, unknown>) => {
        const level = (row as unknown as MarketRow).competition_level
        return level ? <StatusBadge status={level} /> : <span className="text-slate-400">-</span>
      }
    },
    {
      key: 'market_maturity',
      header: 'Maturity',
      width: 'w-28',
      render: (row: Record<string, unknown>) => {
        const maturity = (row as unknown as MarketRow).market_maturity
        return maturity ? <StatusBadge status={maturity} /> : <span className="text-slate-400">-</span>
      }
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (row: Record<string, unknown>) => truncateText((row as unknown as MarketRow).notes, 50)
    }
  ]

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error loading markets: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Markets</h1>
          <p className="text-slate-600">Manage your target markets and territories</p>
        </div>

        <DataTable
          columns={columns}
          data={(markets as unknown as Record<string, unknown>[]) || []}
          loading={loading}
          entityName="markets"
          onRowClick={(row) => handleEdit(row as unknown as MarketRow)}
          onAdd={handleAdd}
          addLabel="Add Market"
          emptyMessage="No markets found. Add your first market to get started."
          searchFields={['name', 'state', 'notes']}
        />

        {/* Add/Edit SlideOver */}
        <SlideOver
          open={slideOverOpen}
          onClose={() => setSlideOverOpen(false)}
          title={editingMarket ? 'Edit Market' : 'Add Market'}
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
                placeholder="e.g., Fort Wayne"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                State *
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="e.g., IN"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Metro Population
              </label>
              <input
                type="number"
                value={formData.metro_population || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  metro_population: e.target.value ? parseInt(e.target.value) : null
                }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="e.g., 419000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Market Size Estimate
              </label>
              <input
                type="number"
                value={formData.market_size_estimate || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  market_size_estimate: e.target.value ? parseInt(e.target.value) : null
                }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="e.g., 50000000"
              />
              <p className="text-sm text-slate-500 mt-1">Total addressable market in USD</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                PE Activity Level
              </label>
              <select
                value={formData.pe_activity_level}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  pe_activity_level: e.target.value as MarketFormData['pe_activity_level']
                }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="none">None</option>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* ABM Intelligence Section */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">ABM Intelligence</h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Target Company Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.target_company_count ?? ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      target_company_count: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="e.g., 120"
                  />
                  <p className="text-sm text-slate-500 mt-1">Number of addressable companies in this market</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    PE Consolidation Status
                  </label>
                  <select
                    value={formData.pe_consolidation_status || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      pe_consolidation_status: (e.target.value || null) as PEConsolidationStatus | null
                    }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">-- Not set --</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Competition Level
                  </label>
                  <select
                    value={formData.competition_level || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      competition_level: (e.target.value || null) as CompetitionLevel | null
                    }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">-- Not set --</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Market Maturity
                  </label>
                  <select
                    value={formData.market_maturity || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      market_maturity: (e.target.value || null) as MarketMaturity | null
                    }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">-- Not set --</option>
                    <option value="emerging">Emerging</option>
                    <option value="growing">Growing</option>
                    <option value="mature">Mature</option>
                    <option value="declining">Declining</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Avg CPC Estimate
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.avg_cpc_estimate ?? ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        avg_cpc_estimate: e.target.value ? parseFloat(e.target.value) : null
                      }))}
                      className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      placeholder="e.g., 4.50"
                    />
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Average cost per click for paid search in this market</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Primary Trade Association
                  </label>
                  <input
                    type="text"
                    value={formData.primary_trade_association}
                    onChange={(e) => setFormData(prev => ({ ...prev, primary_trade_association: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="e.g., Local HVAC Contractors Association"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Peak Season Months
                  </label>
                  <input
                    type="text"
                    value={formData.peak_season_months}
                    onChange={(e) => setFormData(prev => ({ ...prev, peak_season_months: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="e.g., Sep-Nov"
                  />
                  <p className="text-sm text-slate-500 mt-1">Best months for outreach timing</p>
                </div>
              </div>
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
                placeholder="Additional notes about this market..."
              />
            </div>

            {/* Last Updated (read-only, shown when editing) */}
            {editingMarket?.last_updated && (
              <div className="border-t border-slate-200 pt-4">
                <p className="text-xs text-slate-500">
                  ABM data last updated: {new Date(editingMarket.last_updated).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}

            <div className="flex justify-between pt-6">
              {editingMarket && (
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
                  disabled={saving || !formData.name.trim() || !formData.state.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-cyan-500 rounded-md hover:bg-cyan-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingMarket ? 'Update' : 'Create'}
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
          title="Delete Market"
          message={`Are you sure you want to delete "${editingMarket?.name}"? This action cannot be undone.`}
        />
      </div>
    </div>
  )
}
