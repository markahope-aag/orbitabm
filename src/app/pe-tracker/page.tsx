'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DataTable, SlideOver } from '@/components/ui'
import { Plus, ExternalLink, Building2, TrendingUp, Users } from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
import type { 
  PEPlatformRow, 
  PEAcquisitionRow, 
  CompanyRow,
  MarketRow,
  VerticalRow
} from '@/lib/types/database'

interface PEPlatformWithStats extends PEPlatformRow {
  acquisition_count?: number
}

interface PEAcquisitionWithCompany extends PEAcquisitionRow {
  companies?: CompanyRow & {
    markets?: MarketRow
    verticals?: VerticalRow
  }
}

interface CompanyOption {
  id: string
  name: string
  market_name?: string
  vertical_name?: string
}

export default function PETrackerPage() {
  const { currentOrgId } = useOrg()
  const supabase = createClient()

  // State
  const [platforms, setPlatforms] = useState<PEPlatformWithStats[]>([])
  const [acquisitions, setAcquisitions] = useState<PEAcquisitionWithCompany[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<PEPlatformWithStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [platformModalOpen, setPlatformModalOpen] = useState(false)
  const [acquisitionModalOpen, setAcquisitionModalOpen] = useState(false)
  const [editingPlatform, setEditingPlatform] = useState<PEPlatformWithStats | null>(null)

  // Form states
  const [platformFormData, setPlatformFormData] = useState<Partial<PEPlatformRow>>({
    name: '',
    parent_firm: '',
    estimated_valuation: null,
    headquarters: '',
    notes: ''
  })

  const [acquisitionFormData, setAcquisitionFormData] = useState<{
    company_id?: string
    new_company_name?: string
    pe_platform_id?: string
    acquisition_date: string
    source_url?: string
    notes?: string
    use_existing_company: boolean
  }>({
    company_id: '',
    new_company_name: '',
    pe_platform_id: '',
    acquisition_date: '',
    source_url: '',
    notes: '',
    use_existing_company: true
  })

  // Stats
  const [stats, setStats] = useState({
    totalPlatforms: 0,
    totalAcquisitions: 0,
    marketsWithPEActivity: 0
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

      // Fetch PE platforms with acquisition counts
      const { data: platformsData, error: platformsError } = await supabase
        .from('pe_platforms')
        .select(`
          *,
          pe_acquisitions (count)
        `)
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('name')

      if (platformsError) throw platformsError

      const platformsWithStats = (platformsData || []).map(platform => ({
        ...platform,
        acquisition_count: platform.pe_acquisitions?.[0]?.count || 0
      }))
      setPlatforms(platformsWithStats)

      // Fetch all acquisitions
      const { data: acquisitionsData, error: acquisitionsError } = await supabase
        .from('pe_acquisitions')
        .select(`
          *,
          companies (
            *,
            markets (name),
            verticals (name)
          )
        `)
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('acquisition_date', { ascending: false })

      if (acquisitionsError) throw acquisitionsError
      setAcquisitions(acquisitionsData as PEAcquisitionWithCompany[] || [])

      // Fetch companies for dropdown
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select(`
          id,
          name,
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
          markets?: { name: string } | null
          verticals?: { name: string } | null
        }
        return {
          id: companyWithJoins.id,
          name: companyWithJoins.name,
          market_name: companyWithJoins.markets?.name,
          vertical_name: companyWithJoins.verticals?.name
        }
      })
      setCompanies(companyOptions)

      // Calculate stats
      const uniqueMarkets = new Set(
        acquisitionsData
          ?.map(acq => acq.companies?.markets?.name)
          .filter(Boolean) || []
      )

      setStats({
        totalPlatforms: platformsWithStats.length,
        totalAcquisitions: acquisitionsData?.length || 0,
        marketsWithPEActivity: uniqueMarkets.size
      })

    } catch (err) {
      console.error('Error fetching PE tracker data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handlePlatformRowClick = (platform: PEPlatformWithStats) => {
    setSelectedPlatform(platform)
    // Update the acquisition form to pre-select this platform
    setAcquisitionFormData(prev => ({
      ...prev,
      pe_platform_id: platform.id
    }))
  }

  const handleSavePlatform = async () => {
    if (!currentOrgId || !platformFormData.name?.trim()) return

    try {
      const payload = {
        ...platformFormData,
        organization_id: currentOrgId
      }

      if (editingPlatform) {
        // Update existing platform
        const { error } = await supabase
          .from('pe_platforms')
          .update(payload)
          .eq('id', editingPlatform.id)

        if (error) throw error
      } else {
        // Create new platform
        const { error } = await supabase
          .from('pe_platforms')
          .insert([payload])

        if (error) throw error
      }

      await fetchData()
      setPlatformModalOpen(false)
      setEditingPlatform(null)
      setPlatformFormData({
        name: '',
        parent_firm: '',
        estimated_valuation: null,
        headquarters: '',
        notes: ''
      })
      showSuccessToast(editingPlatform ? 'Platform updated' : 'Platform added')
    } catch (err) {
      console.error('Error saving platform:', err)
      showErrorToast(err)
    }
  }

  const handleSaveAcquisition = async () => {
    if (!currentOrgId || !acquisitionFormData.pe_platform_id || !acquisitionFormData.acquisition_date) return

    try {
      let companyId = acquisitionFormData.company_id

      // If creating a new company
      if (!acquisitionFormData.use_existing_company && acquisitionFormData.new_company_name?.trim()) {
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert([{
            organization_id: currentOrgId,
            name: acquisitionFormData.new_company_name,
            ownership_type: 'pe_backed',
            pe_platform_id: acquisitionFormData.pe_platform_id,
            status: 'prospect'
          }])
          .select()
          .single()

        if (companyError) throw companyError
        companyId = newCompany.id
      } else if (acquisitionFormData.use_existing_company && companyId) {
        // Update existing company to be PE-backed
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            ownership_type: 'pe_backed',
            pe_platform_id: acquisitionFormData.pe_platform_id
          })
          .eq('id', companyId)

        if (updateError) throw updateError
      }

      // Create the acquisition record
      const { error: acquisitionError } = await supabase
        .from('pe_acquisitions')
        .insert([{
          organization_id: currentOrgId,
          company_id: companyId,
          pe_platform_id: acquisitionFormData.pe_platform_id,
          acquisition_date: acquisitionFormData.acquisition_date,
          source_url: acquisitionFormData.source_url,
          notes: acquisitionFormData.notes
        }])

      if (acquisitionError) throw acquisitionError

      await fetchData()
      setAcquisitionModalOpen(false)
      setAcquisitionFormData({
        company_id: '',
        new_company_name: '',
        pe_platform_id: selectedPlatform?.id || '',
        acquisition_date: '',
        source_url: '',
        notes: '',
        use_existing_company: true
      })
      showSuccessToast('Acquisition added')
    } catch (err) {
      console.error('Error saving acquisition:', err)
      showErrorToast(err)
    }
  }

  const openAddPlatform = () => {
    setEditingPlatform(null)
    setPlatformFormData({
      name: '',
      parent_firm: '',
      estimated_valuation: null,
      headquarters: '',
      notes: ''
    })
    setPlatformModalOpen(true)
  }

  const openAddAcquisition = () => {
    setAcquisitionFormData({
      company_id: '',
      new_company_name: '',
      pe_platform_id: selectedPlatform?.id || '',
      acquisition_date: '',
      source_url: '',
      notes: '',
      use_existing_company: true
    })
    setAcquisitionModalOpen(true)
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: value >= 1000000000 ? 'compact' : 'standard'
    }).format(value)
  }

  const selectedPlatformAcquisitions = selectedPlatform 
    ? acquisitions.filter(acq => acq.pe_platform_id === selectedPlatform.id)
    : []

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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Error Loading PE Tracker</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">PE Tracker</h1>
          <p className="text-slate-600">Track private equity consolidation platforms and their acquisitions</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building2 className="h-8 w-8 text-cyan-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">PE Platforms Tracked</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalPlatforms}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Acquisitions</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalAcquisitions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Markets with PE Activity</p>
                <p className="text-2xl font-bold text-slate-900">{stats.marketsWithPEActivity}</p>
              </div>
            </div>
          </div>
        </div>

        {/* PE Platforms Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-8">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-900">PE Platforms</h2>
            <button
              onClick={openAddPlatform}
              className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Platform
            </button>
          </div>

          <DataTable
            data={platforms as unknown as Record<string, unknown>[]}
            loading={loading}
            entityName="platforms"
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (row) => (
                  <div className="font-medium text-slate-900">
                    {(row as unknown as PEPlatformWithStats).name}
                  </div>
                )
              },
              {
                key: 'parent_firm',
                header: 'Parent Firm',
                render: (row) => (row as unknown as PEPlatformWithStats).parent_firm || 'N/A'
              },
              {
                key: 'estimated_valuation',
                header: 'Est. Valuation',
                render: (row) => formatCurrency((row as unknown as PEPlatformWithStats).estimated_valuation)
              },
              {
                key: 'acquisition_count',
                header: 'Brand Count',
                render: (row) => (row as unknown as PEPlatformWithStats).acquisition_count || 0
              },
              {
                key: 'headquarters',
                header: 'Headquarters',
                render: (row) => (row as unknown as PEPlatformWithStats).headquarters || 'N/A'
              }
            ]}
            onRowClick={(row) => handlePlatformRowClick(row as unknown as PEPlatformWithStats)}
            searchable={true}
            searchFields={['name', 'parent_firm', 'headquarters']}
            emptyMessage="No PE platforms found"
          />
        </div>

        {/* Acquisitions Timeline Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-900">
              Acquisitions Timeline
              {selectedPlatform && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  — {selectedPlatform.name}
                </span>
              )}
            </h2>
            <button
              onClick={openAddAcquisition}
              className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Acquisition
            </button>
          </div>

          {selectedPlatform ? (
            selectedPlatformAcquisitions.length > 0 ? (
              <DataTable
                data={selectedPlatformAcquisitions as unknown as Record<string, unknown>[]}
                loading={loading}
                entityName="acquisitions"
                columns={[
                  {
                    key: 'company_name',
                    header: 'Company Name',
                    render: (row) => {
                      const acquisition = row as unknown as PEAcquisitionWithCompany
                      return (
                        <div className="font-medium text-slate-900">
                          {acquisition.companies?.name || 'N/A'}
                        </div>
                      )
                    }
                  },
                  {
                    key: 'market',
                    header: 'Market',
                    render: (row) => {
                      const acquisition = row as unknown as PEAcquisitionWithCompany
                      return acquisition.companies?.markets?.name || 'N/A'
                    }
                  },
                  {
                    key: 'vertical',
                    header: 'Vertical',
                    render: (row) => {
                      const acquisition = row as unknown as PEAcquisitionWithCompany
                      return acquisition.companies?.verticals?.name || 'N/A'
                    }
                  },
                    {
                      key: 'acquisition_date',
                      header: 'Acquisition Date',
                      render: (row) => {
                        const date = (row as unknown as PEAcquisitionWithCompany).acquisition_date
                        return date ? new Date(date).toLocaleDateString() : 'N/A'
                      }
                    },
                  {
                    key: 'source_url',
                    header: 'Source',
                    render: (row) => {
                      const url = (row as unknown as PEAcquisitionWithCompany).source_url
                      return url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-cyan-600 hover:text-cyan-700"
                        >
                          Link <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      ) : 'N/A'
                    }
                  }
                ]}
                searchable={false}
                emptyMessage="No acquisitions found for this platform"
              />
            ) : (
              <div className="p-8 text-center text-slate-500">
                No acquisitions found for {selectedPlatform.name}.
              </div>
            )
          ) : (
            <div className="p-8 text-center text-slate-500">
              Select a PE platform above to view its acquisitions.
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Platform Modal */}
      <SlideOver
        open={platformModalOpen}
        onClose={() => setPlatformModalOpen(false)}
        title={editingPlatform ? 'Edit Platform' : 'Add PE Platform'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Platform Name *
            </label>
            <input
              type="text"
              value={platformFormData.name || ''}
              onChange={(e) => setPlatformFormData({ ...platformFormData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Parent Firm
            </label>
            <input
              type="text"
              value={platformFormData.parent_firm || ''}
              onChange={(e) => setPlatformFormData({ ...platformFormData, parent_firm: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Estimated Valuation ($)
            </label>
            <input
              type="number"
              value={platformFormData.estimated_valuation || ''}
              onChange={(e) => setPlatformFormData({ ...platformFormData, estimated_valuation: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Headquarters
            </label>
            <input
              type="text"
              value={platformFormData.headquarters || ''}
              onChange={(e) => setPlatformFormData({ ...platformFormData, headquarters: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={platformFormData.notes || ''}
              onChange={(e) => setPlatformFormData({ ...platformFormData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setPlatformModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePlatform}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700"
            >
              {editingPlatform ? 'Update Platform' : 'Add Platform'}
            </button>
          </div>
        </div>
      </SlideOver>

      {/* Add Acquisition Modal */}
      <SlideOver
        open={acquisitionModalOpen}
        onClose={() => setAcquisitionModalOpen(false)}
        title="Add Acquisition"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              PE Platform *
            </label>
            <select
              value={acquisitionFormData.pe_platform_id || ''}
              onChange={(e) => setAcquisitionFormData({ ...acquisitionFormData, pe_platform_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            >
              <option value="">Select Platform</option>
              {platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>
          </div>

          {/* Company Selection Toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Company
            </label>
            <div className="flex space-x-4 mb-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={acquisitionFormData.use_existing_company}
                  onChange={() => setAcquisitionFormData({ ...acquisitionFormData, use_existing_company: true, new_company_name: '' })}
                  className="mr-2"
                />
                Existing Company
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!acquisitionFormData.use_existing_company}
                  onChange={() => setAcquisitionFormData({ ...acquisitionFormData, use_existing_company: false, company_id: '' })}
                  className="mr-2"
                />
                New Company
              </label>
            </div>

            {acquisitionFormData.use_existing_company ? (
              <select
                value={acquisitionFormData.company_id || ''}
                onChange={(e) => setAcquisitionFormData({ ...acquisitionFormData, company_id: e.target.value })}
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
            ) : (
              <input
                type="text"
                placeholder="Enter new company name"
                value={acquisitionFormData.new_company_name || ''}
                onChange={(e) => setAcquisitionFormData({ ...acquisitionFormData, new_company_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Acquisition Date *
            </label>
            <input
              type="date"
              value={acquisitionFormData.acquisition_date}
              onChange={(e) => setAcquisitionFormData({ ...acquisitionFormData, acquisition_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Source URL
            </label>
            <input
              type="url"
              value={acquisitionFormData.source_url || ''}
              onChange={(e) => setAcquisitionFormData({ ...acquisitionFormData, source_url: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={acquisitionFormData.notes || ''}
              onChange={(e) => setAcquisitionFormData({ ...acquisitionFormData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setAcquisitionModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAcquisition}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700"
            >
              Add Acquisition
            </button>
          </div>
        </div>
      </SlideOver>
    </div>
  )
}