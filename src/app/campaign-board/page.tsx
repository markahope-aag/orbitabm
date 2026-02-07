'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, User } from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import type { 
  CampaignRow, 
  CompanyRow,
  MarketRow,
  VerticalRow,
  PlaybookTemplateRow,
  ProfileRow,
  ActivityRow
} from '@/lib/types/database'

interface CampaignWithRelations extends CampaignRow {
  companies?: CompanyRow & {
    markets?: MarketRow
    verticals?: VerticalRow
  }
  playbook_templates?: PlaybookTemplateRow
  profiles?: ProfileRow
  total_steps?: number
  next_activity?: ActivityRow
  days_since_start?: number
}

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

  // Filter state
  const [filters, setFilters] = useState<{
    market_id?: string
    vertical_id?: string
  }>({})

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

  const getCardBorderColor = (campaign: CampaignWithRelations) => {
    if (!campaign.next_activity || !campaign.next_activity.scheduled_date) return 'border-slate-200'
    
    const today = new Date()
    const activityDate = new Date(campaign.next_activity.scheduled_date)
    
    // Reset time to compare just dates
    today.setHours(0, 0, 0, 0)
    activityDate.setHours(0, 0, 0, 0)
    
    if (activityDate < today) return 'border-red-400' // Overdue
    if (activityDate.getTime() === today.getTime()) return 'border-amber-400' // Due today
    return 'border-emerald-400' // Future
  }

  const handleCardClick = (campaign: CampaignWithRelations) => {
    window.location.href = `/campaigns/${campaign.id}`
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2)
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

        {/* Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {statusColumns.map((column) => (
            <div key={column.key} className={`rounded-lg border-2 ${column.color} min-h-96`}>
              {/* Column Header */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-slate-900">{column.label}</h3>
                  <span className="text-sm text-slate-500 bg-white px-2 py-1 rounded">
                    {campaignsByStatus[column.key]?.length || 0}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="p-4 space-y-3">
                {campaignsByStatus[column.key]?.map((campaign) => (
                  <div
                    key={campaign.id}
                    onClick={() => handleCardClick(campaign)}
                    className={`bg-white rounded-lg border-2 ${getCardBorderColor(campaign)} p-4 cursor-pointer hover:shadow-md transition-shadow`}
                  >
                    {/* Company Name */}
                    <h4 className="font-bold text-slate-900 mb-2 text-sm">
                      {campaign.companies?.name || 'Unknown Company'}
                    </h4>

                    {/* Market — Vertical */}
                    <p className="text-xs text-slate-600 mb-3">
                      {[
                        campaign.companies?.markets?.name,
                        campaign.companies?.verticals?.name
                      ].filter(Boolean).join(' — ') || 'No market/vertical'}
                    </p>

                    {/* Current Step Info */}
                    <div className="flex items-center text-xs text-slate-500 mb-2">
                      <Clock className="w-3 h-3 mr-1" />
                      Step {campaign.current_step || 1} of {campaign.total_steps || 0}
                    </div>

                    {/* Days Since Start */}
                    <div className="flex items-center text-xs text-slate-500 mb-2">
                      <Calendar className="w-3 h-3 mr-1" />
                      {campaign.days_since_start || 0} days since start
                    </div>

                    {/* Next Activity Due Date */}
                    {campaign.next_activity && (
                      <div className="flex items-center text-xs text-slate-500 mb-3">
                        <span className="font-medium">Next:</span>
                        <span className="ml-1">
                          {campaign.next_activity.scheduled_date ? new Date(campaign.next_activity.scheduled_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    )}

                    {/* Assigned To */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">
                        {campaign.playbook_templates?.name || 'No playbook'}
                      </span>
                      <div className="flex items-center">
                        {campaign.profiles?.full_name ? (
                          <div className="flex items-center text-xs text-slate-600">
                            <div className="w-6 h-6 bg-cyan-100 rounded-full flex items-center justify-center mr-2">
                              <span className="text-xs font-medium text-cyan-700">
                                {getInitials(campaign.profiles.full_name)}
                              </span>
                            </div>
                            <span className="hidden sm:inline">
                              {campaign.profiles.full_name.split(' ')[0]}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center text-xs text-slate-400">
                            <User className="w-4 h-4 mr-1" />
                            <span>Unassigned</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {campaignsByStatus[column.key]?.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">No campaigns</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

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