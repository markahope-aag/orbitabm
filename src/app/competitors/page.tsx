'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import type { 
  CompanyRow, 
  MarketRow,
  VerticalRow,
  DigitalSnapshotRow,
  CampaignRow
} from '@/lib/types/database'

interface CompanyWithData extends CompanyRow {
  markets?: MarketRow
  verticals?: VerticalRow
  digital_snapshots?: DigitalSnapshotRow[]
  campaigns?: CampaignRow[]
}

interface VerticalGroup {
  vertical: VerticalRow
  companies: CompanyWithData[]
}

export default function CompetitorsPage() {
  const { currentOrgId } = useOrg()
  const supabase = createClient()

  // State
  const [markets, setMarkets] = useState<MarketRow[]>([])
  const [selectedMarketId, setSelectedMarketId] = useState<string>('')
  const [verticalGroups, setVerticalGroups] = useState<VerticalGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (currentOrgId) {
      fetchMarkets()
    }
  }, [currentOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedMarketId && currentOrgId) {
      fetchCompetitiveData()
    }
  }, [selectedMarketId, currentOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMarkets = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select('*')
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('name')

      if (marketsError) throw marketsError
      setMarkets(marketsData || [])

      // Auto-select first market if available
      if (marketsData && marketsData.length > 0 && !selectedMarketId) {
        setSelectedMarketId(marketsData[0].id)
      }

    } catch (err) {
      console.error('Error fetching markets:', err)
      setError(err instanceof Error ? err.message : 'Failed to load markets')
    } finally {
      setLoading(false)
    }
  }

  const fetchCompetitiveData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch companies in the selected market with all related data
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select(`
          *,
          markets (name),
          verticals (id, name),
          digital_snapshots (
            google_review_count,
            google_rating,
            yelp_review_count,
            yelp_rating,
            domain_authority,
            instagram_followers,
            created_at
          ),
          campaigns (
            id,
            status
          )
        `)
        .eq('organization_id', currentOrgId)
        .eq('market_id', selectedMarketId)
        .is('deleted_at', null)
        .order('name')

      if (companiesError) throw companiesError

      const companies = companiesData as CompanyWithData[] || []

      // Get unique verticals from the companies
      const verticalMap = new Map<string, VerticalRow>()
      companies.forEach(company => {
        if (company.verticals) {
          verticalMap.set(company.verticals.id, company.verticals)
        }
      })

      // Group companies by vertical
      const groups: VerticalGroup[] = Array.from(verticalMap.values()).map(vertical => ({
        vertical,
        companies: companies.filter(company => company.vertical_id === vertical.id)
      }))

      // Add companies without verticals to a "No Vertical" group
      const companiesWithoutVertical = companies.filter(company => !company.vertical_id)
      if (companiesWithoutVertical.length > 0 && currentOrgId) {
        groups.push({
          vertical: { 
            id: 'none', 
            name: 'No Vertical', 
            organization_id: currentOrgId, 
            sector: null,
            b2b_b2c: null,
            naics_code: null,
            revenue_floor: null,
            typical_revenue_range: null,
            typical_marketing_budget_pct: null,
            key_decision_maker_title: null,
            tier: null,
            notes: null,
            created_at: '', 
            updated_at: '', 
            deleted_at: null 
          },
          companies: companiesWithoutVertical
        })
      }

      setVerticalGroups(groups)

    } catch (err) {
      console.error('Error fetching competitive data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load competitive data')
    } finally {
      setLoading(false)
    }
  }

  const getLatestSnapshot = (company: CompanyWithData) => {
    if (!company.digital_snapshots || company.digital_snapshots.length === 0) return null
    
    return company.digital_snapshots.reduce((latest, current) => {
      return new Date(current.created_at) > new Date(latest.created_at) ? current : latest
    })
  }

  const getCompanyStatus = (company: CompanyWithData) => {
    if (!company.campaigns || company.campaigns.length === 0) {
      return { status: 'prospect', label: 'Prospect', color: 'gray' as const }
    }

    const activeCampaign = company.campaigns.find(c => c.status === 'active')
    if (activeCampaign) {
      return { status: 'active_target', label: 'Active Target', color: 'green' as const }
    }

    const completedCampaign = company.campaigns.find(c => c.status === 'won')
    if (completedCampaign) {
      return { status: 'client', label: 'Client', color: 'blue' as const }
    }

    return { status: 'past_target', label: 'Past Target', color: 'yellow' as const }
  }

  const formatNumber = (num: number | null | undefined) => {
    if (!num) return 'N/A'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'N/A'
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
    return `$${amount.toLocaleString()}`
  }

  const getRowBackgroundClass = (company: CompanyWithData) => {
    const companyStatus = getCompanyStatus(company)
    
    if (company.ownership_type === 'pe_backed') {
      return 'bg-red-50 border-red-200'
    }
    
    if (companyStatus.status === 'active_target') {
      return 'bg-emerald-50 border-emerald-200'
    }
    
    return 'bg-white border-slate-200'
  }

  if (loading && !selectedMarketId) {
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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Competitive Intelligence</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Competitive Intelligence</h1>
          <p className="text-slate-600">Analyze competitive landscapes by market and vertical</p>
        </div>

        {/* Market Selector */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-slate-200">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Market</label>
            <select
              value={selectedMarketId}
              onChange={(e) => setSelectedMarketId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">Choose a market...</option>
              {markets.map((market) => (
                <option key={market.id} value={market.id}>
                  {market.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Competitive Analysis */}
        {selectedMarketId && (
          <div className="space-y-8">
            {loading ? (
              <div className="bg-white rounded-lg p-8 shadow-sm border border-slate-200">
                <div className="animate-pulse">
                  <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-200 rounded"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-200 rounded w-4/6"></div>
                  </div>
                </div>
              </div>
            ) : verticalGroups.length === 0 ? (
              <div className="bg-white rounded-lg p-8 shadow-sm border border-slate-200 text-center">
                <p className="text-slate-600">No companies found in this market.</p>
              </div>
            ) : (
              verticalGroups.map((group) => (
                <div key={group.vertical.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                  {/* Vertical Header */}
                  <div className="bg-navy-50 border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-navy-900">
                      {group.vertical.name}
                      <span className="ml-2 text-sm font-normal text-slate-600">
                        ({group.companies.length} companies)
                      </span>
                    </h2>
                  </div>

                  {/* Companies Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Company
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Revenue
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Employees
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Ownership
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Google Reviews
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Yelp Reviews
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Domain Authority
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Instagram
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {group.companies.map((company) => {
                          const latestSnapshot = getLatestSnapshot(company)
                          const companyStatus = getCompanyStatus(company)
                          
                          return (
                            <tr
                              key={company.id}
                              className={`hover:bg-slate-50 cursor-pointer ${getRowBackgroundClass(company)}`}
                              onClick={() => window.location.href = `/companies/${company.id}`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-slate-900">
                                    {company.name}
                                  </div>
                                  <div className="text-sm text-slate-500">
                                    {company.qualifying_tier && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                                        Tier {company.qualifying_tier}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                {formatCurrency(company.estimated_revenue)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                {formatNumber(company.employee_count)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={company.ownership_type || 'unknown'} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                {latestSnapshot?.google_rating && latestSnapshot?.google_review_count ? (
                                  <div>
                                    <div className="font-medium">
                                      ⭐ {latestSnapshot.google_rating.toFixed(1)}
                                    </div>
                                    <div className="text-slate-500">
                                      {formatNumber(latestSnapshot.google_review_count)} reviews
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">N/A</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                {latestSnapshot?.yelp_rating && latestSnapshot?.yelp_review_count ? (
                                  <div>
                                    <div className="font-medium">
                                      ⭐ {latestSnapshot.yelp_rating.toFixed(1)}
                                    </div>
                                    <div className="text-slate-500">
                                      {formatNumber(latestSnapshot.yelp_review_count)} reviews
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">N/A</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                {latestSnapshot?.domain_authority ? (
                                  <span className="font-medium">{latestSnapshot.domain_authority}</span>
                                ) : (
                                  <span className="text-slate-400">N/A</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                {latestSnapshot?.instagram_followers ? (
                                  formatNumber(latestSnapshot.instagram_followers)
                                ) : (
                                  <span className="text-slate-400">N/A</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={companyStatus.status} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}

            {/* Legend */}
            {verticalGroups.length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                <h3 className="text-sm font-medium text-slate-700 mb-3">Legend</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                    <span>PE-Backed Companies</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-emerald-50 border border-emerald-200 rounded"></div>
                    <span>Active Campaign Targets</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}