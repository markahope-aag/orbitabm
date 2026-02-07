'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DataTable, SlideOver, StatusBadge } from '@/components/ui'
import { Plus } from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import type { 
  CampaignRow, 
  CompanyRow,
  MarketRow,
  VerticalRow,
  PlaybookTemplateRow,
  ProfileRow,
  PlaybookStepRow
} from '@/lib/types/database'

interface CampaignWithRelations extends CampaignRow {
  companies?: CompanyRow & {
    markets?: MarketRow
    verticals?: VerticalRow
  }
  playbook_templates?: PlaybookTemplateRow
  profiles?: ProfileRow
  total_steps?: number
}

interface CompanyOption {
  id: string
  name: string
  market_id?: string | null
  vertical_id?: string | null
  market_name?: string
  vertical_name?: string
}

export default function CampaignsPage() {
  const { currentOrgId } = useOrg()
  const supabase = createClient()

  // State
  const [campaigns, setCampaigns] = useState<CampaignWithRelations[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [markets, setMarkets] = useState<MarketRow[]>([])
  const [verticals, setVerticals] = useState<VerticalRow[]>([])
  const [playbooks, setPlaybooks] = useState<PlaybookTemplateRow[]>([])
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [filters, setFilters] = useState<{
    market_id?: string
    vertical_id?: string
    status?: string
  }>({})

  // Modal states
  const [campaignModalOpen, setCampaignModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState<{
    name: string
    company_id: string
    playbook_template_id: string
    market_id: string
    vertical_id: string
    start_date: string
    assigned_to: string
    notes: string
  }>({
    name: '',
    company_id: '',
    playbook_template_id: '',
    market_id: '',
    vertical_id: '',
    start_date: new Date().toISOString().split('T')[0],
    assigned_to: '',
    notes: ''
  })

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

      // Get playbook step counts for each campaign
      const campaignsWithSteps = await Promise.all(
        (campaignsData || []).map(async (campaign) => {
          if (campaign.playbook_template_id) {
            const { data: steps, error: stepsError } = await supabase
              .from('playbook_steps')
              .select('id')
              .eq('playbook_template_id', campaign.playbook_template_id)
              .is('deleted_at', null)

            if (stepsError) {
              console.error('Error fetching steps for campaign:', stepsError)
              return { ...campaign, total_steps: 0 }
            }

            return { ...campaign, total_steps: steps?.length || 0 }
          }
          return { ...campaign, total_steps: 0 }
        })
      )

      setCampaigns(campaignsWithSteps as CampaignWithRelations[])

      // Fetch companies for dropdown
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          market_id,
          vertical_id,
          markets (name),
          verticals (name)
        `)
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('name')

      if (companiesError) throw companiesError

      const companyOptions = (companiesData || []).map(company => {
        const companyWithJoins = company as unknown as {
          id: string
          name: string
          market_id?: string | null
          vertical_id?: string | null
          markets?: { name: string } | null
          verticals?: { name: string } | null
        }
        return {
          id: companyWithJoins.id,
          name: companyWithJoins.name,
          market_id: companyWithJoins.market_id,
          vertical_id: companyWithJoins.vertical_id,
          market_name: companyWithJoins.markets?.name,
          vertical_name: companyWithJoins.verticals?.name
        }
      })
      setCompanies(companyOptions)

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

      // Fetch active playbooks
      const { data: playbooksData, error: playbooksError } = await supabase
        .from('playbook_templates')
        .select('*')
        .eq('organization_id', currentOrgId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name')

      if (playbooksError) throw playbooksError
      setPlaybooks(playbooksData || [])

      // Fetch profiles for assignment
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', currentOrgId)
        .order('full_name')

      if (profilesError) throw profilesError
      setProfiles(profilesData || [])

    } catch (err) {
      console.error('Error fetching campaigns data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCampaign = async () => {
    if (!currentOrgId || !formData.name.trim() || !formData.company_id || !formData.playbook_template_id) return

    try {
      setSaving(true)

      // Create the campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert([{
          organization_id: currentOrgId,
          name: formData.name,
          company_id: formData.company_id,
          playbook_template_id: formData.playbook_template_id,
          market_id: formData.market_id || null,
          vertical_id: formData.vertical_id || null,
          start_date: formData.start_date,
          assigned_to: formData.assigned_to || null,
          notes: formData.notes,
          status: 'planned',
          current_step: 1
        }])
        .select()
        .single()

      if (campaignError) throw campaignError

      // Fetch playbook steps to generate activities
      const { data: playbookSteps, error: stepsError } = await supabase
        .from('playbook_steps')
        .select('*')
        .eq('playbook_template_id', formData.playbook_template_id)
        .is('deleted_at', null)
        .order('step_number')

      if (stepsError) throw stepsError

      // Generate activities for each step
      if (playbookSteps && playbookSteps.length > 0) {
        const startDate = new Date(formData.start_date)
        
        const activities = playbookSteps.map((step: PlaybookStepRow) => {
          const scheduledDate = new Date(startDate)
          scheduledDate.setDate(startDate.getDate() + step.day_offset - 1) // day_offset is 1-based
          
          return {
            organization_id: currentOrgId,
            campaign_id: campaign.id,
            company_id: formData.company_id,
            playbook_step_id: step.id,
            activity_type: step.channel === 'mail' ? 'letter_sent' : 
                          step.channel === 'email' ? 'email_sent' :
                          step.channel === 'linkedin' ? 'linkedin_message' :
                          step.channel === 'phone' ? 'phone_call' : 'other',
            channel: step.channel,
            title: step.title,
            description: step.description,
            scheduled_date: scheduledDate.toISOString().split('T')[0],
            status: 'scheduled',
            assigned_to: formData.assigned_to || null
          }
        })

        const { error: activitiesError } = await supabase
          .from('activities')
          .insert(activities)

        if (activitiesError) throw activitiesError
      }

      await fetchData()
      setCampaignModalOpen(false)
      resetForm()
    } catch (err) {
      console.error('Error saving campaign:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCompanyChange = (companyId: string) => {
    const selectedCompany = companies.find(c => c.id === companyId)
    setFormData(prev => ({
      ...prev,
      company_id: companyId,
      market_id: selectedCompany?.market_id || '',
      vertical_id: selectedCompany?.vertical_id || ''
    }))
  }

  const openAddCampaign = () => {
    resetForm()
    setCampaignModalOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      company_id: '',
      playbook_template_id: '',
      market_id: '',
      vertical_id: '',
      start_date: new Date().toISOString().split('T')[0],
      assigned_to: '',
      notes: ''
    })
  }

  // Filter campaigns based on selected filters
  const filteredCampaigns = campaigns.filter(campaign => {
    if (filters.market_id && campaign.market_id !== filters.market_id) return false
    if (filters.vertical_id && campaign.vertical_id !== filters.vertical_id) return false
    if (filters.status && campaign.status !== filters.status) return false
    return true
  })

  const handleRowClick = (campaign: CampaignWithRelations) => {
    // Navigate to campaign detail page
    window.location.href = `/campaigns/${campaign.id}`
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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Campaigns</h1>
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
              <h1 className="text-3xl font-bold text-navy-900 mb-2">Campaigns</h1>
              <p className="text-slate-600">Manage your active campaigns and outreach sequences</p>
            </div>
            <button
              onClick={openAddCampaign}
              className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="pivoted">Pivoted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <DataTable
            data={filteredCampaigns as unknown as Record<string, unknown>[]}
            loading={loading}
            columns={[
              {
                key: 'name',
                header: 'Campaign Name',
                render: (row) => (
                  <div className="font-medium text-slate-900">
                    {(row as unknown as CampaignWithRelations).name}
                  </div>
                )
              },
              {
                key: 'company',
                header: 'Target Company',
                render: (row) => (row as unknown as CampaignWithRelations).companies?.name || 'N/A'
              },
              {
                key: 'market',
                header: 'Market',
                render: (row) => (row as unknown as CampaignWithRelations).companies?.markets?.name || 'N/A'
              },
              {
                key: 'vertical',
                header: 'Vertical',
                render: (row) => (row as unknown as CampaignWithRelations).companies?.verticals?.name || 'N/A'
              },
              {
                key: 'playbook',
                header: 'Playbook',
                render: (row) => (row as unknown as CampaignWithRelations).playbook_templates?.name || 'N/A'
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <StatusBadge status={(row as unknown as CampaignWithRelations).status} />
                )
              },
              {
                key: 'start_date',
                header: 'Start Date',
                render: (row) => {
                  const date = (row as unknown as CampaignWithRelations).start_date
                  return date ? new Date(date).toLocaleDateString() : 'N/A'
                }
              },
              {
                key: 'current_step',
                header: 'Current Step',
                render: (row) => {
                  const campaign = row as unknown as CampaignWithRelations
                  return `Step ${campaign.current_step || 1} of ${campaign.total_steps || 0}`
                }
              },
              {
                key: 'assigned_to',
                header: 'Assigned To',
                render: (row) => (row as unknown as CampaignWithRelations).profiles?.full_name || 'Unassigned'
              }
            ]}
            onRowClick={(row) => handleRowClick(row as unknown as CampaignWithRelations)}
            searchable={true}
            searchFields={['name']}
            emptyMessage="No campaigns found"
          />
        </div>
      </div>

      {/* New Campaign Modal */}
      <SlideOver
        open={campaignModalOpen}
        onClose={() => setCampaignModalOpen(false)}
        title="New Campaign"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Campaign Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Target Company *
            </label>
            <select
              value={formData.company_id}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                  {(company.market_name || company.vertical_name) && (
                    <span className="text-slate-500">
                      {' '}— {[company.market_name, company.vertical_name].filter(Boolean).join(' • ')}
                    </span>
                  )}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Playbook Template *
            </label>
            <select
              value={formData.playbook_template_id}
              onChange={(e) => setFormData({ ...formData, playbook_template_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            >
              <option value="">Select Playbook</option>
              {playbooks.map((playbook) => (
                <option key={playbook.id} value={playbook.id}>
                  {playbook.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Market
              </label>
              <select
                value={formData.market_id}
                onChange={(e) => setFormData({ ...formData, market_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Select Market</option>
                {markets.map((market) => (
                  <option key={market.id} value={market.id}>
                    {market.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Vertical
              </label>
              <select
                value={formData.vertical_id}
                onChange={(e) => setFormData({ ...formData, vertical_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Select Vertical</option>
                {verticals.map((vertical) => (
                  <option key={vertical.id} value={vertical.id}>
                    {vertical.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Assigned To
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Unassigned</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setCampaignModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCampaign}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </div>
      </SlideOver>
    </div>
  )
}