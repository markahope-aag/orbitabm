'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge, StatusBadge, SlideOver } from '@/components/ui'
import {
  ExternalLink,
  Edit,
  Play,
  Pause,
  RotateCcw,
  Trophy,
  X,
  ArrowRight,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Mail,
  MessageSquare,
  Linkedin,
  Phone,
  Users,
  MoreHorizontal,
  Target,
  FileText
} from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import type { 
  CampaignRow, 
  CompanyRow,
  ContactRow,
  MarketRow,
  VerticalRow,
  PlaybookTemplateRow,
  ProfileRow,
  ActivityRow,
  CampaignCompetitorRow,
  ResultRow,
  AssetRow,
  DigitalSnapshotRow
} from '@/lib/types/database'

interface CampaignWithRelations extends CampaignRow {
  companies?: CompanyRow & {
    markets?: MarketRow
    verticals?: VerticalRow
  }
  playbook_templates?: PlaybookTemplateRow
  profiles?: ProfileRow
}

interface ActivityWithRelations extends ActivityRow {
  playbook_steps?: {
    step_number: number
    day_offset: number
  }
}

interface ContactWithCompany extends ContactRow {
  companies?: { name: string }
}

interface CompetitorWithCompany extends CampaignCompetitorRow {
  companies?: CompanyRow
}

interface AssetWithCompany extends AssetRow {
  companies?: { name: string }
}

const channelIcons = {
  mail: Mail,
  email: MessageSquare,
  linkedin: Linkedin,
  phone: Phone,
  in_person: Users,
  other: MoreHorizontal
}

export default function CampaignDetailPage() {
  const params = useParams()
  const campaignId = params.id as string
  const { currentOrgId } = useOrg()
  const supabase = createClient()

  // State
  const [campaign, setCampaign] = useState<CampaignWithRelations | null>(null)
  const [activities, setActivities] = useState<ActivityWithRelations[]>([])
  const [primaryContact, setPrimaryContact] = useState<ContactWithCompany | null>(null)
  const [competitors, setCompetitors] = useState<CompetitorWithCompany[]>([])
  const [results, setResults] = useState<ResultRow[]>([])
  const [assets, setAssets] = useState<AssetWithCompany[]>([])
  const [latestSnapshot, setLatestSnapshot] = useState<DigitalSnapshotRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [activityModalOpen, setActivityModalOpen] = useState(false)
  const [resultModalOpen, setResultModalOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<ActivityWithRelations | null>(null)

  // Form states
  const [activityFormData, setActivityFormData] = useState({
    completed_date: new Date().toISOString().split('T')[0],
    outcome: 'no_response',
    notes: ''
  })

  const [resultFormData, setResultFormData] = useState({
    result_type: 'meeting_scheduled',
    result_date: new Date().toISOString().split('T')[0],
    total_contract_value: '',
    contract_term_months: '',
    notes: ''
  })

  useEffect(() => {
    if (campaignId && currentOrgId) {
      fetchCampaignData()
    }
  }, [campaignId, currentOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCampaignData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch campaign with relations
      const { data: campaignData, error: campaignError } = await supabase
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
        .eq('id', campaignId)
        .is('deleted_at', null)
        .single()

      if (campaignError) throw campaignError
      if (!campaignData) throw new Error('Campaign not found')

      setCampaign(campaignData as CampaignWithRelations)

      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          *,
          playbook_steps (step_number, day_offset)
        `)
        .eq('campaign_id', campaignId)
        .is('deleted_at', null)
        .order('scheduled_date')

      if (activitiesError) throw activitiesError
      setActivities(activitiesData as ActivityWithRelations[] || [])

      // Fetch primary contact
      if (campaignData.company_id) {
        const { data: contactData, error: contactError } = await supabase
          .from('contacts')
          .select(`
            *,
            companies (name)
          `)
          .eq('company_id', campaignData.company_id)
          .eq('is_primary', true)
          .is('deleted_at', null)
          .single()

        if (!contactError && contactData) {
          setPrimaryContact(contactData as ContactWithCompany)
        }

        // Fetch latest digital snapshot
        const { data: snapshotData, error: snapshotError } = await supabase
          .from('digital_snapshots')
          .select('*')
          .eq('company_id', campaignData.company_id)
          .is('deleted_at', null)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .single()

        if (!snapshotError && snapshotData) {
          setLatestSnapshot(snapshotData)
        }
      }

      // Fetch competitors
      const { data: competitorsData, error: competitorsError } = await supabase
        .from('campaign_competitors')
        .select(`
          *,
          companies (*)
        `)
        .eq('campaign_id', campaignId)
        .is('deleted_at', null)

      if (competitorsError) throw competitorsError
      setCompetitors(competitorsData as CompetitorWithCompany[] || [])

      // Fetch results
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select('*')
        .eq('campaign_id', campaignId)
        .is('deleted_at', null)
        .order('result_date', { ascending: false })

      if (resultsError) throw resultsError
      setResults(resultsData || [])

      // Fetch assets
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select(`
          *,
          companies (name)
        `)
        .eq('campaign_id', campaignId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (assetsError) throw assetsError
      setAssets(assetsData as AssetWithCompany[] || [])

    } catch (err) {
      console.error('Error fetching campaign data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load campaign data')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!campaign) return

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaignId)

      if (error) throw error
      await fetchCampaignData()
    } catch (err) {
      console.error('Error updating campaign status:', err)
    }
  }

  const handleCompleteActivity = async () => {
    if (!selectedActivity) return

    try {
      const { error } = await supabase
        .from('activities')
        .update({
          status: 'completed',
          completed_date: activityFormData.completed_date,
          outcome: activityFormData.outcome,
          notes: activityFormData.notes
        })
        .eq('id', selectedActivity.id)

      if (error) throw error

      await fetchCampaignData()
      setActivityModalOpen(false)
      setSelectedActivity(null)
      setActivityFormData({
        completed_date: new Date().toISOString().split('T')[0],
        outcome: 'no_response',
        notes: ''
      })
    } catch (err) {
      console.error('Error completing activity:', err)
    }
  }

  const handleLogResult = async () => {
    if (!campaign) return

    try {
      const payload = {
        organization_id: currentOrgId,
        campaign_id: campaignId,
        result_type: resultFormData.result_type,
        result_date: resultFormData.result_date,
        total_contract_value: resultFormData.total_contract_value ? parseInt(resultFormData.total_contract_value) : null,
        contract_term_months: resultFormData.contract_term_months ? parseInt(resultFormData.contract_term_months) : null,
        notes: resultFormData.notes
      }

      const { error } = await supabase
        .from('results')
        .insert([payload])

      if (error) throw error

      await fetchCampaignData()
      setResultModalOpen(false)
      setResultFormData({
        result_type: 'meeting_scheduled',
        result_date: new Date().toISOString().split('T')[0],
        total_contract_value: '',
        contract_term_months: '',
        notes: ''
      })
    } catch (err) {
      console.error('Error logging result:', err)
    }
  }

  const openCompleteActivity = (activity: ActivityWithRelations) => {
    setSelectedActivity(activity)
    setActivityFormData({
      completed_date: new Date().toISOString().split('T')[0],
      outcome: 'no_response',
      notes: ''
    })
    setActivityModalOpen(true)
  }

  const getActivityStatusIcon = (activity: ActivityWithRelations) => {
    const today = new Date()
    const scheduledDate = activity.scheduled_date ? new Date(activity.scheduled_date) : new Date()
    
    switch (activity.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case 'skipped':
        return <X className="w-5 h-5 text-slate-400" />
      case 'scheduled':
        if (scheduledDate < today) {
          return <AlertCircle className="w-5 h-5 text-red-500 animate-pulse" />
        }
        return <Clock className="w-5 h-5 text-blue-500" />
      default:
        return <Clock className="w-5 h-5 text-slate-400" />
    }
  }

  const getActivityStatusColor = (activity: ActivityWithRelations) => {
    const today = new Date()
    const scheduledDate = activity.scheduled_date ? new Date(activity.scheduled_date) : new Date()
    
    switch (activity.status) {
      case 'completed':
        return 'border-emerald-200 bg-emerald-50'
      case 'skipped':
        return 'border-slate-200 bg-slate-50'
      case 'scheduled':
        if (scheduledDate < today) {
          return 'border-red-200 bg-red-50'
        }
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-slate-200 bg-slate-50'
    }
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number | null) => {
    if (!value) return 'N/A'
    return new Intl.NumberFormat('en-US').format(value)
  }

  const calculateDaysElapsed = () => {
    if (!campaign?.start_date) return 0
    const startDate = new Date(campaign.start_date)
    const today = new Date()
    return Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
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

  if (error || !campaign) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Campaign Not Found</h1>
          <p className="text-slate-600">{error || 'The requested campaign could not be found.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Campaign Name */}
              <h1 className="text-3xl font-bold text-slate-900 mb-3">{campaign.name}</h1>
              
              {/* Company and Badges */}
              <div className="flex items-center space-x-3 mb-4">
                <a
                  href={`/companies/${campaign.company_id}`}
                  className="text-lg font-medium text-cyan-600 hover:text-cyan-700"
                >
                  {campaign.companies?.name || 'Unknown Company'}
                </a>
                {campaign.companies?.markets?.name && (
                  <Badge label={campaign.companies.markets.name} color="gray" />
                )}
                {campaign.companies?.verticals?.name && (
                  <Badge label={campaign.companies.verticals.name} color="gray" />
                )}
                <StatusBadge status={campaign.status} />
              </div>

              {/* Campaign Info */}
              <div className="flex items-center space-x-8 text-sm text-slate-600">
                <div>
                  <span className="font-medium">Start Date:</span>
                  <span className="ml-1">{campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Days Elapsed:</span>
                  <span className="ml-1">{calculateDaysElapsed()}</span>
                </div>
                <div>
                  <span className="font-medium">Playbook:</span>
                  <span className="ml-1">{campaign.playbook_templates?.name || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <a
                href={`/campaigns/${campaignId}/sequence`}
                className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200"
              >
                <FileText className="w-4 h-4 mr-2" />
                Build Sequence
              </a>
              <button className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200">
                <Edit className="w-4 h-4 mr-2" />
                Edit Campaign
              </button>
              
              {/* Status Change Buttons */}
              {campaign.status === 'planned' && (
                <button
                  onClick={() => handleStatusChange('active')}
                  className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </button>
              )}
              
              {campaign.status === 'active' && (
                <button
                  onClick={() => handleStatusChange('paused')}
                  className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </button>
              )}
              
              {campaign.status === 'paused' && (
                <button
                  onClick={() => handleStatusChange('active')}
                  className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Resume
                </button>
              )}

              <button
                onClick={() => handleStatusChange('won')}
                className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Mark Won
              </button>
              
              <button
                onClick={() => handleStatusChange('lost')}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <X className="w-4 h-4 mr-2" />
                Mark Lost
              </button>
              
              <button
                onClick={() => handleStatusChange('pivoted')}
                className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Pivot
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Left Column - Activity Timeline */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-slate-900">Activity Timeline</h2>
                <button className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Ad-Hoc Activity
                </button>
              </div>

              <div className="p-6">
                {activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map((activity, index) => {
                      const ChannelIcon = channelIcons[activity.channel as keyof typeof channelIcons] || MoreHorizontal
                      
                      return (
                        <div key={activity.id} className="flex items-start space-x-4">
                          {/* Timeline line */}
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full border-2 bg-white flex items-center justify-center">
                              {getActivityStatusIcon(activity)}
                            </div>
                            {index < activities.length - 1 && (
                              <div className="w-px h-16 bg-slate-200 mt-2"></div>
                            )}
                          </div>

                          {/* Activity content */}
                          <div className={`flex-1 rounded-lg border-2 p-4 ${getActivityStatusColor(activity)}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-slate-900">
                                    Step {activity.playbook_steps?.step_number || '?'}
                                  </span>
                                  <span className="text-sm text-slate-500">
                                    Day {activity.playbook_steps?.day_offset || '?'}
                                  </span>
                                  <ChannelIcon className="w-4 h-4 text-slate-600" />
                                </div>
                                <h4 className="font-medium text-slate-900">{activity.activity_type.replace('_', ' ')}</h4>
                              </div>
                              
                              {activity.status === 'scheduled' && (
                                <button
                                  onClick={() => openCompleteActivity(activity)}
                                  className="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700"
                                >
                                  Mark Complete
                                </button>
                              )}
                            </div>

                            <div className="flex items-center space-x-4 text-sm text-slate-600 mb-2">
                              <div>
                                <span className="font-medium">Scheduled:</span>
                                <span className="ml-1">{activity.scheduled_date ? new Date(activity.scheduled_date).toLocaleDateString() : 'N/A'}</span>
                              </div>
                              {activity.completed_date && (
                                <div>
                                  <span className="font-medium">Completed:</span>
                                  <span className="ml-1">{new Date(activity.completed_date).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>

                            {activity.outcome && (
                              <div className="mb-2">
                                <StatusBadge status={activity.outcome} />
                              </div>
                            )}


                            {activity.notes && (
                              <div className="bg-white rounded p-3 border border-slate-200">
                                <p className="text-sm text-slate-600">{activity.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <Target className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>No activities found for this campaign.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Cards */}
          <div className="space-y-6">
            {/* Target Company Card */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Target Company</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">{campaign.companies?.name}</h4>
                  {campaign.companies?.website && (
                    <a
                      href={campaign.companies.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-cyan-600 hover:text-cyan-700 text-sm"
                    >
                      Website <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Revenue:</span>
                    <div className="font-medium">{formatCurrency(campaign.companies?.estimated_revenue || null)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Employees:</span>
                    <div className="font-medium">{formatNumber(campaign.companies?.employee_count || null)}</div>
                  </div>
                </div>

                {primaryContact && (
                  <div className="border-t border-slate-200 pt-4">
                    <h5 className="font-medium text-slate-900 mb-2">Primary Contact</h5>
                    <div className="space-y-1 text-sm">
                      <div className="font-medium">{primaryContact.first_name} {primaryContact.last_name}</div>
                      {primaryContact.title && <div className="text-slate-600">{primaryContact.title}</div>}
                      {primaryContact.email && <div className="text-slate-600">{primaryContact.email}</div>}
                      {primaryContact.phone && <div className="text-slate-600">{primaryContact.phone}</div>}
                      {primaryContact.linkedin_url && (
                        <a
                          href={primaryContact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-cyan-600 hover:text-cyan-700"
                        >
                          LinkedIn <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {latestSnapshot && (
                  <div className="border-t border-slate-200 pt-4">
                    <h5 className="font-medium text-slate-900 mb-2">Latest Digital Snapshot</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {latestSnapshot.google_rating && (
                        <div>
                          <span className="text-slate-500">Google:</span>
                          <div className="font-medium">
                            {latestSnapshot.google_rating}/5
                            {latestSnapshot.google_review_count && (
                              <span className="text-slate-500 ml-1">
                                ({latestSnapshot.google_review_count})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {latestSnapshot.domain_authority && (
                        <div>
                          <span className="text-slate-500">DA:</span>
                          <div className="font-medium">{latestSnapshot.domain_authority}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Named Competitors Card */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900">Named Competitors</h3>
                <button className="flex items-center px-3 py-1 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-700">
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </button>
              </div>
              <div className="p-6">
                {competitors.length > 0 ? (
                  <div className="space-y-3">
                    {competitors.map((competitor) => (
                      <div key={competitor.id} className="flex justify-between items-center">
                        <span className="font-medium text-slate-900">
                          {competitor.companies?.name || 'Unknown'}
                        </span>
                        <StatusBadge status={competitor.threat_level || 'low'} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No competitors identified yet.</p>
                )}
              </div>
            </div>

            {/* Results Card */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900">Results</h3>
                <button
                  onClick={() => setResultModalOpen(true)}
                  className="flex items-center px-3 py-1 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-700"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Log Result
                </button>
              </div>
              <div className="p-6">
                {results.length > 0 ? (
                  <div className="space-y-3">
                    {results.map((result) => (
                      <div key={result.id} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                        <div className="flex justify-between items-start mb-1">
                          <StatusBadge status={result.result_type} />
                          <span className="text-sm text-slate-500">
                            {new Date(result.result_date).toLocaleDateString()}
                          </span>
                        </div>
                        {result.total_contract_value && (
                          <div className="text-sm font-medium text-emerald-600">
                            {formatCurrency(result.total_contract_value)}
                            {result.contract_term_months && (
                              <span className="text-slate-500 ml-1">
                                ({result.contract_term_months} months)
                              </span>
                            )}
                          </div>
                        )}
                        {result.notes && (
                          <p className="text-sm text-slate-600 mt-1">{result.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No results logged yet.</p>
                )}
              </div>
            </div>

            {/* Assets Card */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900">Assets</h3>
                <button className="flex items-center px-3 py-1 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-700">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Asset
                </button>
              </div>
              <div className="p-6">
                {assets.length > 0 ? (
                  <div className="space-y-3">
                    {assets.map((asset) => (
                      <div key={asset.id} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-slate-900">{asset.title}</span>
                          <StatusBadge status={asset.status} />
                        </div>
                        <div className="text-sm text-slate-600">
                          <StatusBadge status={asset.asset_type} />
                          {asset.delivered_date && (
                            <span className="ml-2">
                              Delivered: {new Date(asset.delivered_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No assets created yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Activity Modal */}
      <SlideOver
        open={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        title="Complete Activity"
      >
        <div className="space-y-4">
          {selectedActivity && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-slate-900">{selectedActivity.activity_type.replace('_', ' ')}</h4>
              <p className="text-sm text-slate-600">
                Scheduled: {selectedActivity.scheduled_date ? new Date(selectedActivity.scheduled_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Completed Date *
            </label>
            <input
              type="date"
              value={activityFormData.completed_date}
              onChange={(e) => setActivityFormData({ ...activityFormData, completed_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Outcome *
            </label>
            <select
              value={activityFormData.outcome}
              onChange={(e) => setActivityFormData({ ...activityFormData, outcome: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            >
              <option value="no_response">No Response</option>
              <option value="opened">Opened</option>
              <option value="clicked">Clicked</option>
              <option value="replied">Replied</option>
              <option value="meeting_booked">Meeting Booked</option>
              <option value="declined">Declined</option>
              <option value="voicemail">Voicemail</option>
              <option value="conversation">Conversation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={activityFormData.notes}
              onChange={(e) => setActivityFormData({ ...activityFormData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setActivityModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteActivity}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
            >
              Complete Activity
            </button>
          </div>
        </div>
      </SlideOver>

      {/* Log Result Modal */}
      <SlideOver
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        title="Log Result"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Result Type *
            </label>
            <select
              value={resultFormData.result_type}
              onChange={(e) => setResultFormData({ ...resultFormData, result_type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            >
              <option value="meeting_scheduled">Meeting Scheduled</option>
              <option value="proposal_sent">Proposal Sent</option>
              <option value="proposal_accepted">Proposal Accepted</option>
              <option value="contract_signed">Contract Signed</option>
              <option value="contract_lost">Contract Lost</option>
              <option value="no_response">No Response</option>
              <option value="declined">Declined</option>
              <option value="breakup_sent">Breakup Sent</option>
              <option value="referral_received">Referral Received</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={resultFormData.result_date}
              onChange={(e) => setResultFormData({ ...resultFormData, result_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contract Value ($)
              </label>
              <input
                type="number"
                value={resultFormData.total_contract_value}
                onChange={(e) => setResultFormData({ ...resultFormData, total_contract_value: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contract Term (months)
              </label>
              <input
                type="number"
                value={resultFormData.contract_term_months}
                onChange={(e) => setResultFormData({ ...resultFormData, contract_term_months: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={resultFormData.notes}
              onChange={(e) => setResultFormData({ ...resultFormData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setResultModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleLogResult}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700"
            >
              Log Result
            </button>
          </div>
        </div>
      </SlideOver>
    </div>
  )
}