'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/ui'
import { 
  Target, 
  Calendar, 
  AlertCircle, 
  DollarSign,
  TrendingUp,
  ExternalLink,
  Mail,
  MessageSquare,
  Linkedin,
  Phone,
  Users,
  MoreHorizontal
} from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import type {
  ActivityRow,
  ResultRow
} from '@/lib/types/database'

interface DashboardMetrics {
  activeCampaigns: number
  activitiesDueThisWeek: number
  overdueActivities: number
  pipelineValue: number
}

interface UpcomingActivity extends ActivityRow {
  campaigns?: { name: string; companies?: { name: string } }
}

interface RecentResult extends ResultRow {
  campaigns?: { name: string; companies?: { name: string } }
}

interface CampaignStatusCount {
  status: string
  count: number
  color: string
}

interface MarketOverview {
  id: string
  name: string
  activeCampaigns: number
  totalCompanies: number
  peActivityLevel: string
}

interface CampaignAtRisk {
  id: string
  name: string
  companyName: string
  daysOverdue: number
  lastCompletedActivity: string | null
}

const channelIcons = {
  mail: Mail,
  email: MessageSquare,
  linkedin: Linkedin,
  phone: Phone,
  in_person: Users,
  other: MoreHorizontal
}

export default function Dashboard() {
  const { currentOrgId } = useOrg()
  const supabase = createClient()

  // State
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeCampaigns: 0,
    activitiesDueThisWeek: 0,
    overdueActivities: 0,
    pipelineValue: 0
  })
  const [upcomingActivities, setUpcomingActivities] = useState<UpcomingActivity[]>([])
  const [recentResults, setRecentResults] = useState<RecentResult[]>([])
  const [campaignStatusCounts, setCampaignStatusCounts] = useState<CampaignStatusCount[]>([])
  const [marketOverview, setMarketOverview] = useState<MarketOverview[]>([])
  const [campaignsAtRisk, setCampaignsAtRisk] = useState<CampaignAtRisk[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (currentOrgId) {
      fetchDashboardData()
    }
  }, [currentOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch key metrics
      await Promise.all([
        fetchMetrics(),
        fetchUpcomingActivities(),
        fetchRecentResults(),
        fetchCampaignStatusCounts(),
        fetchMarketOverview(),
        fetchCampaignsAtRisk()
      ])

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchMetrics = async () => {
    // Active campaigns
    const { count: activeCampaignsCount, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', currentOrgId)
      .eq('status', 'active')
      .is('deleted_at', null)
    
    if (campaignsError) {
      console.warn('Error fetching campaigns count:', campaignsError)
    }

    // Activities due this week
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const { count: activitiesDueCount, error: activitiesError } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', currentOrgId)
      .eq('status', 'scheduled')
      .gte('scheduled_date', startOfWeek.toISOString().split('T')[0])
      .lte('scheduled_date', endOfWeek.toISOString().split('T')[0])
    
    if (activitiesError) {
      console.warn('Error fetching activities count:', activitiesError)
    }

    // Overdue activities
    const today = new Date().toISOString().split('T')[0]
    const { count: overdueCount, error: overdueError } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', currentOrgId)
      .eq('status', 'scheduled')
      .lt('scheduled_date', today)
    
    if (overdueError) {
      console.warn('Error fetching overdue activities:', overdueError)
    }

    // Pipeline value
    const { data: contractResults, error: resultsError } = await supabase
      .from('results')
      .select('total_contract_value')
      .eq('organization_id', currentOrgId)
      .eq('result_type', 'contract_signed')
    
    if (resultsError) {
      console.warn('Error fetching results:', resultsError)
    }

    const pipelineValue = contractResults?.reduce((sum, result) => 
      sum + (result.total_contract_value || 0), 0) || 0

    setMetrics({
      activeCampaigns: activeCampaignsCount || 0,
      activitiesDueThisWeek: activitiesDueCount || 0,
      overdueActivities: overdueCount || 0,
      pipelineValue
    })
  }

  const fetchUpcomingActivities = async () => {
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)

    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        campaigns (name, companies (name))
      `)
      .eq('organization_id', currentOrgId)
      .eq('status', 'scheduled')
      .gte('scheduled_date', today.toISOString().split('T')[0])
      .lte('scheduled_date', nextWeek.toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true })
      .limit(10)

    if (error) throw error
    setUpcomingActivities(data as UpcomingActivity[] || [])
  }

  const fetchRecentResults = async () => {
    const { data, error } = await supabase
      .from('results')
      .select(`
        *,
        campaigns (name, companies (name))
      `)
      .eq('organization_id', currentOrgId)
      .order('result_date', { ascending: false })
      .limit(10)

    if (error) throw error
    setRecentResults(data as RecentResult[] || [])
  }

  const fetchCampaignStatusCounts = async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('status')
      .eq('organization_id', currentOrgId)
      .is('deleted_at', null)

    if (error) throw error

    const statusCounts = (data || []).reduce((acc, campaign) => {
      acc[campaign.status] = (acc[campaign.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const statusColors = {
      planned: 'bg-blue-500',
      active: 'bg-emerald-500',
      paused: 'bg-amber-500',
      won: 'bg-emerald-600',
      lost: 'bg-red-500',
      pivoted: 'bg-purple-500',
      completed: 'bg-slate-500'
    }

    const counts = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      color: statusColors[status as keyof typeof statusColors] || 'bg-slate-500'
    }))

    setCampaignStatusCounts(counts)
  }

  const fetchMarketOverview = async () => {
    const { data: markets, error } = await supabase
      .from('markets')
      .select('*')
      .eq('organization_id', currentOrgId)
      .is('deleted_at', null)

    if (error) throw error

    const marketData = await Promise.all(
      (markets || []).map(async (market) => {
        // Count active campaigns
        const { count: activeCampaigns } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentOrgId)
          .eq('market_id', market.id)
          .eq('status', 'active')
          .is('deleted_at', null)

        // Count total companies
        const { count: totalCompanies } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentOrgId)
          .eq('market_id', market.id)
          .is('deleted_at', null)

        return {
          id: market.id,
          name: market.name,
          activeCampaigns: activeCampaigns || 0,
          totalCompanies: totalCompanies || 0,
          peActivityLevel: market.pe_activity_level || 'none'
        }
      })
    )

    setMarketOverview(marketData.sort((a, b) => b.activeCampaigns - a.activeCampaigns))
  }

  const fetchCampaignsAtRisk = async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select(`
        id,
        name,
        companies (name)
      `)
      .eq('organization_id', currentOrgId)
      .eq('status', 'active')
      .is('deleted_at', null)

    if (error) throw error

    const riskyData = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        // Find next scheduled activity
        const { data: nextActivity } = await supabase
          .from('activities')
          .select('scheduled_date')
          .eq('campaign_id', campaign.id)
          .eq('status', 'scheduled')
          .lt('scheduled_date', today)
          .order('scheduled_date', { ascending: true })
          .limit(1)
          .single()

        if (!nextActivity) return null

        // Find last completed activity
        const { data: lastActivity } = await supabase
          .from('activities')
          .select('activity_type, completed_date')
          .eq('campaign_id', campaign.id)
          .eq('status', 'completed')
          .order('completed_date', { ascending: false })
          .limit(1)
          .single()

        const scheduledDate = new Date(nextActivity.scheduled_date)
        const todayDate = new Date(today)
        const daysOverdue = Math.floor((todayDate.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24))

        return {
          id: campaign.id,
          name: campaign.name,
          companyName: (campaign as unknown as { companies?: { name: string } }).companies?.name || 'Unknown',
          daysOverdue,
          lastCompletedActivity: lastActivity ? lastActivity.activity_type : null
        }
      })
    )

    const atRiskCampaigns = riskyData
      .filter(Boolean)
      .sort((a, b) => (b?.daysOverdue || 0) - (a?.daysOverdue || 0))

    setCampaignsAtRisk(atRiskCampaigns as CampaignAtRisk[])
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: value >= 1000000 ? 'compact' : 'standard'
    }).format(value)
  }

  const getActivityTypeDisplay = (activityType: string) => {
    return activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Dashboard</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  const totalCampaigns = campaignStatusCounts.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Dashboard</h1>
          <p className="text-slate-600">Welcome to OrbitABM - your ABM campaign intelligence platform</p>
        </div>

        {/* Key Metrics - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Campaigns</p>
                <p className="text-2xl font-bold text-navy-900">{metrics.activeCampaigns}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Activities Due This Week</p>
                <p className="text-2xl font-bold text-navy-900">{metrics.activitiesDueThisWeek}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Overdue Activities</p>
                <p className="text-2xl font-bold text-red-600">{metrics.overdueActivities}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pipeline Value</p>
                <p className="text-2xl font-bold text-navy-900">{formatCurrency(metrics.pipelineValue)}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Second Row - Upcoming Activities & Recent Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Upcoming Activities */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Upcoming Activities</h3>
              <a
                href="/activities"
                className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center"
              >
                View All <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
            <div className="p-6">
              {upcomingActivities.length > 0 ? (
                <div className="space-y-4">
                  {upcomingActivities.map((activity) => {
                    const ChannelIcon = channelIcons[activity.channel as keyof typeof channelIcons] || MoreHorizontal
                    return (
                      <div
                        key={activity.id}
                        className="flex items-center space-x-4 p-3 rounded-lg hover:bg-slate-50 cursor-pointer"
                        onClick={() => window.location.href = `/campaigns/${activity.campaign_id}`}
                      >
                        <ChannelIcon className="w-5 h-5 text-slate-500" />
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">
                            {activity.campaigns?.companies?.name || 'Unknown Company'}
                          </div>
                          <div className="text-sm text-slate-600">
                            {getActivityTypeDisplay(activity.activity_type)} • {activity.campaigns?.name}
                          </div>
                        </div>
                        <div className="text-sm text-slate-500">
                          {activity.scheduled_date ? new Date(activity.scheduled_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No upcoming activities</p>
              )}
            </div>
          </div>

          {/* Recent Results */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Recent Results</h3>
            </div>
            <div className="p-6">
              {recentResults.length > 0 ? (
                <div className="space-y-4">
                  {recentResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">
                          {result.campaigns?.companies?.name || 'Unknown Company'}
                        </div>
                        <div className="flex items-center space-x-2">
                          <StatusBadge status={result.result_type} />
                          <span className="text-sm text-slate-500">
                            {new Date(result.result_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {result.total_contract_value && (
                        <div className="text-sm font-medium text-emerald-600">
                          {formatCurrency(result.total_contract_value)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No recent results</p>
              )}
            </div>
          </div>
        </div>

        {/* Third Row - Campaigns by Status */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-8">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Campaigns by Status</h3>
          </div>
          <div className="p-6">
            {campaignStatusCounts.length > 0 ? (
              <div>
                {/* Status Bar */}
                <div className="flex rounded-lg overflow-hidden mb-4" style={{ height: '40px' }}>
                  {campaignStatusCounts.map((item) => (
                    <div
                      key={item.status}
                      className={item.color}
                      style={{ width: `${(item.count / totalCampaigns) * 100}%` }}
                      title={`${item.status}: ${item.count}`}
                    />
                  ))}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4">
                  {campaignStatusCounts.map((item) => (
                    <div key={item.status} className="flex items-center">
                      <div className={`w-3 h-3 rounded ${item.color} mr-2`} />
                      <span className="text-sm text-slate-600 capitalize">
                        {item.status}: {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No campaigns found</p>
            )}
          </div>
        </div>

        {/* Fourth Row - Markets Overview & Campaigns at Risk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Markets Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Markets Overview</h3>
            </div>
            <div className="p-6">
              {marketOverview.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm font-medium text-slate-500 border-b">
                        <th className="pb-2">Market</th>
                        <th className="pb-2">Active Campaigns</th>
                        <th className="pb-2">Total Companies</th>
                        <th className="pb-2">PE Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketOverview.map((market) => (
                        <tr key={market.id} className="border-b border-slate-100">
                          <td className="py-3 font-medium text-slate-900">{market.name}</td>
                          <td className="py-3 text-slate-600">{market.activeCampaigns}</td>
                          <td className="py-3 text-slate-600">{market.totalCompanies}</td>
                          <td className="py-3">
                            <StatusBadge status={market.peActivityLevel} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No markets found</p>
              )}
            </div>
          </div>

          {/* Campaigns at Risk */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Campaigns at Risk</h3>
            </div>
            <div className="p-6">
              {campaignsAtRisk.length > 0 ? (
                <div className="space-y-4">
                  {campaignsAtRisk.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="p-4 rounded-lg border-l-4 border-red-400 bg-red-50 cursor-pointer hover:bg-red-100"
                      onClick={() => window.location.href = `/campaigns/${campaign.id}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-slate-900">{campaign.companyName}</div>
                        <div className="text-sm font-medium text-red-600">
                          {campaign.daysOverdue} days overdue
                        </div>
                      </div>
                      <div className="text-sm text-slate-600">{campaign.name}</div>
                      {campaign.lastCompletedActivity && (
                        <div className="text-sm text-slate-500 mt-1">
                          Last: {getActivityTypeDisplay(campaign.lastCompletedActivity)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-emerald-300" />
                  <p className="text-slate-500">All campaigns are on track!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}