'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge, StatusBadge, Tabs, SlideOver, DataTable } from '@/components/ui'
import { ExternalLink, Edit, Plus, TrendingUp, TrendingDown, Minus, FileText, BookOpen } from 'lucide-react'
import type {
  CompanyRow,
  ContactRow,
  CampaignRow,
  DigitalSnapshotRow,
  AssetRow,
  MarketRow,
  VerticalRow,
  GeneratedDocumentRow
} from '@/lib/types/database'

interface CompanyWithRelations extends CompanyRow {
  markets?: MarketRow
  verticals?: VerticalRow
}

interface ContactWithCompany extends ContactRow {
  companies?: { name: string }
}

interface CampaignWithCompany extends CampaignRow {
  companies?: { name: string }
  playbook_templates?: { name: string }
}

interface AssetWithCompany extends AssetRow {
  companies?: { name: string }
}

export default function CompanyDetailPage() {
  const params = useParams()
  const companyId = params.id as string
  const supabase = createClient()

  // State
  const [company, setCompany] = useState<CompanyWithRelations | null>(null)
  const [contacts, setContacts] = useState<ContactWithCompany[]>([])
  const [campaigns, setCampaigns] = useState<CampaignWithCompany[]>([])
  const [digitalSnapshots, setDigitalSnapshots] = useState<DigitalSnapshotRow[]>([])
  const [assets, setAssets] = useState<AssetWithCompany[]>([])
  const [competitors, setCompetitors] = useState<CompanyWithRelations[]>([])
  const [researchDoc, setResearchDoc] = useState<GeneratedDocumentRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Form state for editing
  const [editFormData, setEditFormData] = useState<Partial<CompanyRow>>({})

  useEffect(() => {
    fetchCompanyData()
  }, [companyId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCompanyData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch company with market and vertical
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select(`
          *,
          markets (name),
          verticals (name)
        `)
        .eq('id', companyId)
        .is('deleted_at', null)
        .single()

      if (companyError) throw companyError
      if (!companyData) throw new Error('Company not found')

      setCompany(companyData as CompanyWithRelations)
      setEditFormData(companyData)

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          companies (name)
        `)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('is_primary', { ascending: false })

      if (contactsError) throw contactsError
      setContacts(contactsData as ContactWithCompany[] || [])

      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          companies (name),
          playbook_templates (name)
        `)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (campaignsError) throw campaignsError
      setCampaigns(campaignsData as CampaignWithCompany[] || [])

      // Fetch digital snapshots
      const { data: snapshotsData, error: snapshotsError } = await supabase
        .from('digital_snapshots')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('snapshot_date', { ascending: false })

      if (snapshotsError) throw snapshotsError
      setDigitalSnapshots(snapshotsData || [])

      // Fetch assets
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select(`
          *,
          companies (name)
        `)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (assetsError) throw assetsError
      setAssets(assetsData as AssetWithCompany[] || [])

      // Fetch competitors (same market AND vertical, excluding current company)
      if (companyData.market_id && companyData.vertical_id) {
        const { data: competitorsData, error: competitorsError } = await supabase
          .from('companies')
          .select(`
            *,
            markets (name),
            verticals (name)
          `)
          .eq('market_id', companyData.market_id)
          .eq('vertical_id', companyData.vertical_id)
          .neq('id', companyId)
          .is('deleted_at', null)
          .order('estimated_revenue', { ascending: false })

        if (competitorsError) throw competitorsError
        setCompetitors(competitorsData as CompanyWithRelations[] || [])
      }

      // Fetch research document
      const { data: researchData } = await supabase
        .from('generated_documents')
        .select('*')
        .eq('company_id', companyId)
        .eq('document_type', 'prospect_research')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setResearchDoc(researchData as GeneratedDocumentRow | null)

    } catch (err) {
      console.error('Error fetching company data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load company data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from('companies')
        .update(editFormData)
        .eq('id', companyId)

      if (error) throw error

      await fetchCompanyData()
      setEditModalOpen(false)
    } catch (err) {
      console.error('Error updating company:', err)
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

  const getChangeIndicator = (current: number | null, previous: number | null) => {
    if (!current || !previous) return <Minus className="w-4 h-4 text-slate-400" />
    if (current > previous) return <TrendingUp className="w-4 h-4 text-emerald-500" />
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-slate-400" />
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

  if (error || !company) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Company Not Found</h1>
          <p className="text-slate-600">{error || 'The requested company could not be found.'}</p>
        </div>
      </div>
    )
  }

  // Latest digital snapshot for overview
  const latestSnapshot = digitalSnapshots[0]

  // Primary contact
  const primaryContact = contacts.find(c => c.is_primary) || contacts[0]

  // Additional contacts (non-primary)
  const additionalContacts = contacts.filter(c => !c.is_primary)

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="grid grid-cols-3 gap-8">
          {/* Left column - 2/3 width */}
          <div className="col-span-2 space-y-6">
            {/* Business Details */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Business Details</h3>
              <div className="space-y-3">
                {company.manufacturer_affiliations && (
                  <div>
                    <span className="font-medium text-slate-700">Affiliations:</span>
                    <span className="ml-2 text-slate-600">{company.manufacturer_affiliations}</span>
                  </div>
                )}
                {company.certifications && (
                  <div>
                    <span className="font-medium text-slate-700">Certifications:</span>
                    <span className="ml-2 text-slate-600">{company.certifications}</span>
                  </div>
                )}
                {company.awards && (
                  <div>
                    <span className="font-medium text-slate-700">Awards:</span>
                    <span className="ml-2 text-slate-600">{company.awards}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {company.notes && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Notes</h3>
                <p className="text-slate-600 whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}

            {/* Latest Digital Snapshot */}
            {latestSnapshot && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Latest Digital Snapshot
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    {new Date(latestSnapshot.snapshot_date).toLocaleDateString()}
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                      {latestSnapshot.google_rating && (
                    <div className="bg-slate-50 rounded p-3">
                      <div className="text-sm font-medium text-slate-700">Google Rating</div>
                      <div className="text-lg font-semibold text-slate-900">
                        {latestSnapshot.google_rating}/5
                        {latestSnapshot.google_review_count && (
                          <span className="ml-1 text-sm font-normal text-slate-500">
                            ({formatNumber(latestSnapshot.google_review_count)} reviews)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {latestSnapshot.yelp_rating && (
                    <div className="bg-slate-50 rounded p-3">
                      <div className="text-sm font-medium text-slate-700">Yelp Rating</div>
                      <div className="text-lg font-semibold text-slate-900">
                        {latestSnapshot.yelp_rating}/5
                        {latestSnapshot.yelp_review_count && (
                          <span className="ml-1 text-sm font-normal text-slate-500">
                            ({formatNumber(latestSnapshot.yelp_review_count)} reviews)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {latestSnapshot.domain_authority && (
                    <div className="bg-slate-50 rounded p-3">
                      <div className="text-sm font-medium text-slate-700">Domain Authority</div>
                      <div className="text-lg font-semibold text-slate-900">{latestSnapshot.domain_authority}</div>
                    </div>
                  )}
                  {(latestSnapshot.page_speed_mobile || latestSnapshot.page_speed_desktop) && (
                    <div className="bg-slate-50 rounded p-3">
                      <div className="text-sm font-medium text-slate-700">Page Speed</div>
                      <div className="text-lg font-semibold text-slate-900">
                        {latestSnapshot.page_speed_mobile || latestSnapshot.page_speed_desktop}/100
                      </div>
                    </div>
                  )}
                  {(latestSnapshot.facebook_followers || latestSnapshot.instagram_followers || latestSnapshot.linkedin_followers) && (
                    <div className="bg-slate-50 rounded p-3">
                      <div className="text-sm font-medium text-slate-700">Social Followers</div>
                      <div className="text-lg font-semibold text-slate-900">
                        {formatNumber((latestSnapshot.facebook_followers || 0) + (latestSnapshot.instagram_followers || 0) + (latestSnapshot.linkedin_followers || 0))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right column - 1/3 width */}
          <div className="space-y-6">
            {/* Primary Contact */}
            {primaryContact && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Primary Contact</h3>
                <div className="space-y-2">
                  <div className="font-medium text-slate-900">{primaryContact.first_name} {primaryContact.last_name}</div>
                  {primaryContact.title && (
                    <div className="text-slate-600">{primaryContact.title}</div>
                  )}
                  {primaryContact.email && (
                    <div className="text-slate-600">{primaryContact.email}</div>
                  )}
                  {primaryContact.phone && (
                    <div className="text-slate-600">{primaryContact.phone}</div>
                  )}
                  {primaryContact.linkedin_url && (
                    <a
                      href={primaryContact.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-cyan-600 hover:text-cyan-700"
                    >
                      LinkedIn <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Additional Contacts */}
            {additionalContacts.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Additional Contacts</h3>
                <div className="space-y-3">
                  {additionalContacts.map((contact) => (
                    <div key={contact.id} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                      <div className="font-medium text-slate-900">{contact.first_name} {contact.last_name}</div>
                      {contact.title && (
                        <div className="text-sm text-slate-600">{contact.title}</div>
                      )}
                      {contact.email && (
                        <div className="text-sm text-slate-600">{contact.email}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Contact Button */}
            <button className="w-full flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'competitive',
      label: 'Competitive Landscape',
      content: (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              Competitors in {company.markets?.name} - {company.verticals?.name}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {competitors.length} companies in the same market and vertical
            </p>
          </div>
          {competitors.length > 0 ? (
            <DataTable
              data={competitors as unknown as Record<string, unknown>[]}
              loading={loading}
              entityName="competitors"
              columns={[
                {
                  key: 'name',
                  header: 'Company Name',
                  render: (row) => {
                    const company = row as unknown as CompanyWithRelations
                    return (
                      <div className="font-medium text-slate-900">
                        {company.name}
                        {company.ownership_type === 'pe_backed' && (
                          <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">PE</span>
                        )}
                      </div>
                    )
                  }
                },
                {
                  key: 'estimated_revenue',
                  header: 'Revenue',
                  render: (row) => formatCurrency((row as unknown as CompanyWithRelations).estimated_revenue)
                },
                {
                  key: 'employee_count',
                  header: 'Employees',
                  render: (row) => formatNumber((row as unknown as CompanyWithRelations).employee_count)
                },
                {
                  key: 'year_founded',
                  header: 'Founded',
                  render: (row) => (row as unknown as CompanyWithRelations).year_founded || 'N/A'
                },
                {
                  key: 'ownership_type',
                  header: 'Ownership',
                  render: (row) => (
                    <StatusBadge 
                      status={(row as unknown as CompanyWithRelations).ownership_type || ''} 
                    />
                  )
                }
              ]}
              searchable={false}
            />
          ) : (
            <div className="p-8 text-center text-slate-500">
              No competitors found in the same market and vertical.
            </div>
          )}
        </div>
      )
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      content: (
        <div className="bg-white rounded-lg border border-slate-200">
          {campaigns.length > 0 ? (
            <DataTable
              data={campaigns as unknown as Record<string, unknown>[]}
              loading={loading}
              entityName="campaigns"
              columns={[
                {
                  key: 'name',
                  header: 'Campaign Name',
                  render: (row) => (
                    <div className="font-medium text-slate-900">
                      {(row as unknown as CampaignWithCompany).name}
                    </div>
                  )
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => (
                    <StatusBadge 
                      status={(row as unknown as CampaignWithCompany).status} 
                    />
                  )
                },
                {
                  key: 'start_date',
                  header: 'Start Date',
                  render: (row) => {
                    const date = (row as unknown as CampaignWithCompany).start_date
                    return date ? new Date(date).toLocaleDateString() : 'N/A'
                  }
                },
                {
                  key: 'current_step',
                  header: 'Current Step',
                  render: (row) => (row as unknown as CampaignWithCompany).current_step || 'N/A'
                },
                {
                  key: 'playbook_name',
                  header: 'Playbook',
                  render: (row) => (row as unknown as CampaignWithCompany).playbook_templates?.name || 'N/A'
                }
              ]}
              searchable={false}
              onRowClick={(row) => {
                // Navigate to campaign detail
                window.location.href = `/campaigns/${(row as unknown as CampaignWithCompany).id}`
              }}
            />
          ) : (
            <div className="p-8 text-center text-slate-500">
              No campaigns found for this company.
            </div>
          )}
        </div>
      )
    },
    {
      id: 'digital',
      label: 'Digital History',
      content: (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Digital Snapshots</h3>
            <button className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Snapshot
            </button>
          </div>
          {digitalSnapshots.length > 0 ? (
            <DataTable
              data={digitalSnapshots as unknown as Record<string, unknown>[]}
              loading={loading}
              entityName="digital_snapshots"
              columns={[
                {
                  key: 'snapshot_date',
                  header: 'Date',
                  render: (row) => new Date((row as unknown as DigitalSnapshotRow).snapshot_date).toLocaleDateString()
                },
                {
                  key: 'google_rating',
                  header: 'Google Rating',
                  render: (row) => {
                    const current = (row as unknown as DigitalSnapshotRow).google_rating
                    const rowIndex = digitalSnapshots.findIndex(s => s.id === (row as unknown as DigitalSnapshotRow).id)
                    const previous = rowIndex < digitalSnapshots.length - 1 ? digitalSnapshots[rowIndex + 1].google_rating : null
                    return (
                      <div className="flex items-center">
                        <span>{current || 'N/A'}</span>
                        <span className="ml-2">{getChangeIndicator(current, previous)}</span>
                      </div>
                    )
                  }
                },
                {
                  key: 'yelp_rating',
                  header: 'Yelp Rating',
                  render: (row) => {
                    const current = (row as unknown as DigitalSnapshotRow).yelp_rating
                    const rowIndex = digitalSnapshots.findIndex(s => s.id === (row as unknown as DigitalSnapshotRow).id)
                    const previous = rowIndex < digitalSnapshots.length - 1 ? digitalSnapshots[rowIndex + 1].yelp_rating : null
                    return (
                      <div className="flex items-center">
                        <span>{current || 'N/A'}</span>
                        <span className="ml-2">{getChangeIndicator(current, previous)}</span>
                      </div>
                    )
                  }
                },
                {
                  key: 'domain_authority',
                  header: 'Domain Authority',
                  render: (row) => {
                    const current = (row as unknown as DigitalSnapshotRow).domain_authority
                    const rowIndex = digitalSnapshots.findIndex(s => s.id === (row as unknown as DigitalSnapshotRow).id)
                    const previous = rowIndex < digitalSnapshots.length - 1 ? digitalSnapshots[rowIndex + 1].domain_authority : null
                    return (
                      <div className="flex items-center">
                        <span>{current || 'N/A'}</span>
                        <span className="ml-2">{getChangeIndicator(current, previous)}</span>
                      </div>
                    )
                  }
                },
                {
                  key: 'social_followers',
                  header: 'Social Followers',
                  render: (row) => {
                    const snapshot = (row as unknown as DigitalSnapshotRow)
                    const current = (snapshot.facebook_followers || 0) + (snapshot.instagram_followers || 0) + (snapshot.linkedin_followers || 0)
                    const rowIndex = digitalSnapshots.findIndex(s => s.id === snapshot.id)
                    const previousSnapshot = rowIndex < digitalSnapshots.length - 1 ? digitalSnapshots[rowIndex + 1] : null
                    const previous = previousSnapshot ? (previousSnapshot.facebook_followers || 0) + (previousSnapshot.instagram_followers || 0) + (previousSnapshot.linkedin_followers || 0) : null
                    return (
                      <div className="flex items-center">
                        <span>{formatNumber(current || null)}</span>
                        <span className="ml-2">{getChangeIndicator(current, previous)}</span>
                      </div>
                    )
                  }
                }
              ]}
              searchable={false}
            />
          ) : (
            <div className="p-8 text-center text-slate-500">
              No digital snapshots found for this company.
            </div>
          )}
        </div>
      )
    },
    {
      id: 'assets',
      label: 'Assets',
      content: (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Assets</h3>
            <button className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </button>
          </div>
          {assets.length > 0 ? (
            <DataTable
              data={assets as unknown as Record<string, unknown>[]}
              loading={loading}
              entityName="assets"
              columns={[
                {
                  key: 'title',
                  header: 'Title',
                  render: (row) => (
                    <div className="font-medium text-slate-900">
                      {(row as unknown as AssetWithCompany).title}
                    </div>
                  )
                },
                {
                  key: 'asset_type',
                  header: 'Type',
                  render: (row) => (
                    <StatusBadge 
                      status={(row as unknown as AssetWithCompany).asset_type} 
                    />
                  )
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => (
                    <StatusBadge 
                      status={(row as unknown as AssetWithCompany).status} 
                    />
                  )
                },
                {
                  key: 'delivered_date',
                  header: 'Delivered Date',
                  render: (row) => {
                    const date = (row as unknown as AssetWithCompany).delivered_date
                    return date ? new Date(date).toLocaleDateString() : 'N/A'
                  }
                }
              ]}
              searchable={false}
            />
          ) : (
            <div className="p-8 text-center text-slate-500">
              No assets found for this company.
            </div>
          )}
        </div>
      )
    },
    {
      id: 'research',
      label: 'Research',
      content: (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          {researchDoc ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{researchDoc.title}</h3>
                  <div className="flex items-center space-x-3 mt-2">
                    <StatusBadge status={researchDoc.status} />
                    {researchDoc.readiness_score != null && (
                      <span className={`text-sm font-medium ${
                        researchDoc.readiness_score >= 7 ? 'text-emerald-600' : researchDoc.readiness_score >= 4 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        Readiness: {researchDoc.readiness_score}/10
                      </span>
                    )}
                    <span className="text-sm text-slate-500">
                      Updated {new Date(researchDoc.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <a
                  href={`/companies/${companyId}/research`}
                  className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Open Research Doc
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-4">No research document found for this company.</p>
              <a
                href={`/companies/${companyId}/research`}
                className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Build Research Doc
              </a>
            </div>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Company Name */}
              <h1 className="text-3xl font-bold text-slate-900 mb-3">{company.name}</h1>
              
              {/* Badges Row */}
              <div className="flex items-center space-x-3 mb-4">
                {company.markets?.name && (
                  <Badge label={company.markets.name} color="gray" />
                )}
                {company.verticals?.name && (
                  <Badge label={company.verticals.name} color="gray" />
                )}
                <StatusBadge status={company.status} />
                <StatusBadge status={company.ownership_type || ''} />
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-cyan-600 hover:text-cyan-700"
                  >
                    Website <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                )}
              </div>

              {/* Quick Stats */}
              <div className="flex items-center space-x-8 text-sm">
                <div>
                  <span className="font-medium text-slate-700">Revenue:</span>
                  <span className="ml-1 text-slate-900">{formatCurrency(company.estimated_revenue)}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Employees:</span>
                  <span className="ml-1 text-slate-900">{formatNumber(company.employee_count)}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Founded:</span>
                  <span className="ml-1 text-slate-900">{company.year_founded || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Tier:</span>
                  <span className="ml-1">
                    <StatusBadge status={company.qualifying_tier || ''} />
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <a
                href={`/companies/${companyId}/research`}
                className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200"
              >
                <FileText className="w-4 h-4 mr-2" />
                Research
              </a>
              <button
                onClick={() => setEditModalOpen(true)}
                className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs tabs={tabs} defaultTab="overview" />
      </div>

      {/* Edit Modal */}
      <SlideOver
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Company"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              value={editFormData.name || ''}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Website URL
            </label>
            <input
              type="url"
              value={editFormData.website || ''}
              onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Estimated Revenue
              </label>
              <input
                type="number"
                value={editFormData.estimated_revenue || ''}
                onChange={(e) => setEditFormData({ ...editFormData, estimated_revenue: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Employee Count
              </label>
              <input
                type="number"
                value={editFormData.employee_count || ''}
                onChange={(e) => setEditFormData({ ...editFormData, employee_count: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              rows={4}
              value={editFormData.notes || ''}
              onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </SlideOver>
    </div>
  )
}