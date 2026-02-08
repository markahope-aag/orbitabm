'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/context/OrgContext'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import BoardColumn from '@/components/campaign-board/BoardColumn'
import DragOverlayCard from '@/components/campaign-board/DragOverlayCard'
import type { CampaignWithRelations } from '@/components/campaign-board/BoardCard'
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast'
import type {
  CampaignStatus,
  MarketRow,
  VerticalRow,
} from '@/lib/types/database'

const statusColumns = [
  { key: 'planned', label: 'Planned', color: 'bg-blue-50 border-blue-200' },
  { key: 'active', label: 'Active', color: 'bg-emerald-50 border-emerald-200' },
  { key: 'paused', label: 'Paused', color: 'bg-amber-50 border-amber-200' },
  { key: 'completed', label: 'Completed', color: 'bg-slate-50 border-slate-200' }
]

export default function CampaignBoardPage() {
  const { currentOrgId } = useOrg()
  const supabase = createClient()

  // State
  const [campaigns, setCampaigns] = useState<CampaignWithRelations[]>([])
  const [markets, setMarkets] = useState<MarketRow[]>([])
  const [verticals, setVerticals] = useState<VerticalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // DnD state
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  // Filter state
  const [filters, setFilters] = useState<{
    market_id?: string
    vertical_id?: string
  }>({})

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  useEffect(() => {
    if (currentOrgId) {
      fetchData()
    }
  }, [currentOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch campaigns with all relations
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          companies (
            *,
            markets (name),
            verticals (name)
          ),
          playbook_templates (name),
          profiles (full_name)
        `)
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (campaignsError) throw campaignsError

      // Enhance campaigns with additional data
      const campaignsWithExtras = await Promise.all(
        (campaignsData || []).map(async (campaign) => {
          // Calculate days since start
          const startDate = campaign.start_date ? new Date(campaign.start_date) : new Date()
          const today = new Date()
          const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

          // Get total steps from playbook
          let totalSteps = 0
          if (campaign.playbook_template_id) {
            const { data: steps, error: stepsError } = await supabase
              .from('playbook_steps')
              .select('id')
              .eq('playbook_template_id', campaign.playbook_template_id)
              .is('deleted_at', null)

            if (!stepsError) {
              totalSteps = steps?.length || 0
            }
          }

          // Get next scheduled activity
          const { data: nextActivity, error: activityError } = await supabase
            .from('activities')
            .select('*')
            .eq('campaign_id', campaign.id)
            .eq('status', 'scheduled')
            .is('deleted_at', null)
            .order('scheduled_date', { ascending: true })
            .limit(1)
            .single()

          return {
            ...campaign,
            total_steps: totalSteps,
            days_since_start: daysSinceStart,
            next_activity: activityError ? null : nextActivity
          }
        })
      )

      setCampaigns(campaignsWithExtras as CampaignWithRelations[])

      // Fetch markets for filter
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select('*')
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('name')

      if (marketsError) throw marketsError
      setMarkets(marketsData || [])

      // Fetch verticals for filter
      const { data: verticalsData, error: verticalsError } = await supabase
        .from('verticals')
        .select('*')
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('name')

      if (verticalsError) throw verticalsError
      setVerticals(verticalsData || [])

    } catch (err) {
      console.error('Error fetching campaign board data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Filter campaigns based on selected filters
  const filteredCampaigns = campaigns.filter(campaign => {
    if (filters.market_id && campaign.market_id !== filters.market_id) return false
    if (filters.vertical_id && campaign.vertical_id !== filters.vertical_id) return false
    return true
  })

  // Group campaigns by status
  const campaignsByStatus = statusColumns.reduce((acc, column) => {
    const statusCampaigns = filteredCampaigns.filter(campaign => {
      if (column.key === 'completed') {
        return ['completed', 'won', 'lost', 'pivoted'].includes(campaign.status)
      }
      return campaign.status === column.key
    })
    acc[column.key] = statusCampaigns
    return acc
  }, {} as Record<string, CampaignWithRelations[]>)

  // Determine which column a campaign currently belongs to
  const getColumnForCampaign = useCallback((campaign: CampaignWithRelations): string => {
    if (['completed', 'won', 'lost', 'pivoted'].includes(campaign.status)) return 'completed'
    return campaign.status
  }, [])

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Visual feedback is handled by BoardColumn's isOver state
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDragId(null)

    const { active, over } = event
    if (!over) return

    const campaignId = active.id as string
    const campaign = campaigns.find(c => c.id === campaignId)
    if (!campaign) return

    // Determine target column: over.id could be a column key or another card id
    let targetColumn: string | undefined

    // Check if dropped over a column directly
    const isColumn = statusColumns.some(col => col.key === over.id)
    if (isColumn) {
      targetColumn = over.id as string
    } else {
      // Dropped over another card — find which column that card is in
      const overCampaign = campaigns.find(c => c.id === over.id)
      if (overCampaign) {
        targetColumn = getColumnForCampaign(overCampaign)
      }
    }

    if (!targetColumn) return

    const currentColumn = getColumnForCampaign(campaign)
    if (targetColumn === currentColumn) return

    // Optimistic update
    const previousCampaigns = [...campaigns]
    setCampaigns(prev =>
      prev.map(c =>
        c.id === campaignId ? { ...c, status: targetColumn as CampaignStatus } : c
      )
    )

    try {
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ status: targetColumn })
        .eq('id', campaignId)

      if (updateError) throw updateError

      showSuccessToast(`Campaign moved to ${statusColumns.find(c => c.key === targetColumn)?.label}`)
    } catch (err) {
      // Revert on error
      setCampaigns(previousCampaigns)
      showErrorToast(err)
    }
  }, [campaigns, getColumnForCampaign, supabase])

  const activeCampaign = activeDragId
    ? campaigns.find(c => c.id === activeDragId) ?? null
    : null

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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Campaign Board</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Campaign Board</h1>
          <p className="text-slate-600">Track campaign progress across different stages</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Market</label>
              <select
                value={filters.market_id || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, market_id: e.target.value || undefined }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">All Markets</option>
                {markets.map((market) => (
                  <option key={market.id} value={market.id}>
                    {market.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vertical</label>
              <select
                value={filters.vertical_id || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, vertical_id: e.target.value || undefined }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">All Verticals</option>
                {verticals.map((vertical) => (
                  <option key={vertical.id} value={vertical.id}>
                    {vertical.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Kanban Board with DnD */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {statusColumns.map((column) => (
              <BoardColumn
                key={column.key}
                column={column}
                campaigns={campaignsByStatus[column.key] || []}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCampaign ? <DragOverlayCard campaign={activeCampaign} /> : null}
          </DragOverlay>
        </DndContext>

        {/* Legend */}
        <div className="mt-8 bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Card Border Colors:</h4>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-emerald-400 rounded mr-2"></div>
              <span className="text-slate-600">Next activity in future</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-amber-400 rounded mr-2"></div>
              <span className="text-slate-600">Next activity due today</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-red-400 rounded mr-2"></div>
              <span className="text-slate-600">Next activity overdue</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-slate-200 rounded mr-2"></div>
              <span className="text-slate-600">No scheduled activities</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
