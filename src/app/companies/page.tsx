'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useOrg } from '@/lib/context/OrgContext'
import { useCompanies, useMarkets, useVerticals, usePEPlatforms } from '@/lib/supabase/hooks'
import { createClient } from '@/lib/supabase/client'
import { DataTable, SlideOver, ConfirmDialog, StatusBadge } from '@/components/ui'
import { toastPromise } from '@/lib/utils/toast'
import type { CompanyRow, CompanyInsert, CompanyUpdate } from '@/lib/types/database'

interface CompanyFilters {
  market_id?: string
  vertical_id?: string
  status?: string
  ownership_type?: string
  qualifying_tier?: string
}

interface CompanyFormData {
  name: string
  market_id: string
  vertical_id: string
  website: string
  phone: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  estimated_revenue: number | null
  employee_count: number | null
  year_founded: number | null
  ownership_type: 'independent' | 'pe_backed' | 'franchise' | 'corporate'
  pe_platform_id: string
  manufacturer_affiliations: string
  certifications: string
  awards: string
  qualifying_tier: 'top' | 'qualified' | 'borderline' | 'excluded' | null
  status: 'prospect' | 'target' | 'active_campaign' | 'client' | 'lost' | 'churned' | 'excluded'
  notes: string
}

const initialFormData: CompanyFormData = {
  name: '',
  market_id: '',
  vertical_id: '',
  website: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip: '',
  estimated_revenue: null,
  employee_count: null,
  year_founded: null,
  ownership_type: 'independent',
  pe_platform_id: '',
  manufacturer_affiliations: '',
  certifications: '',
  awards: '',
  qualifying_tier: null,
  status: 'prospect',
  notes: ''
}

export default function Companies() {
  const router = useRouter()
  const { currentOrgId } = useOrg()
  
  // Filters state
  const [filters, setFilters] = useState<CompanyFilters>({})
  
  // Data hooks
  const { data: companies, loading, error, refetch } = useCompanies(currentOrgId || '', filters)
  const { data: markets } = useMarkets(currentOrgId || '')
  const { data: verticals } = useVerticals(currentOrgId || '')
  const { data: pePlatforms } = usePEPlatforms(currentOrgId || '')
  
  // Form state
  const [slideOverOpen, setSlideOverOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null)
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleAdd = () => {
    setEditingCompany(null)
    setFormData(initialFormData)
    setSlideOverOpen(true)
  }


  const handleRowClick = (company: CompanyRow) => {
    router.push(`/companies/${company.id}`)
  }

  const handleSave = useCallback(async () => {
    if (!currentOrgId || !formData.name.trim()) return

    setSaving(true)
    
    try {
      await toastPromise(
        (async () => {
          const supabase = createClient()
          
          if (editingCompany) {
            // Update existing company
            const updateData: CompanyUpdate = {
              name: formData.name.trim(),
              market_id: formData.market_id || null,
              vertical_id: formData.vertical_id || null,
              website: formData.website.trim() || null,
              phone: formData.phone.trim() || null,
              address_line1: formData.address_line1.trim() || null,
              address_line2: formData.address_line2.trim() || null,
              city: formData.city.trim() || null,
              state: formData.state.trim() || null,
              zip: formData.zip.trim() || null,
              estimated_revenue: formData.estimated_revenue,
              employee_count: formData.employee_count,
              year_founded: formData.year_founded,
              ownership_type: formData.ownership_type,
              pe_platform_id: formData.ownership_type === 'pe_backed' ? formData.pe_platform_id || null : null,
              manufacturer_affiliations: formData.manufacturer_affiliations.trim() || null,
              certifications: formData.certifications.trim() || null,
              awards: formData.awards.trim() || null,
              qualifying_tier: formData.qualifying_tier,
              status: formData.status,
              notes: formData.notes.trim() || null
            }
            const { error } = await supabase
              .from('companies')
              .update(updateData)
              .eq('id', editingCompany.id)
            
            if (error) throw error
            return { name: formData.name.trim() }
          } else {
            // Create new company
            const insertData: CompanyInsert = {
              organization_id: currentOrgId,
              name: formData.name.trim(),
              market_id: formData.market_id || null,
              vertical_id: formData.vertical_id || null,
              website: formData.website.trim() || null,
              phone: formData.phone.trim() || null,
              address_line1: formData.address_line1.trim() || null,
              address_line2: formData.address_line2.trim() || null,
              city: formData.city.trim() || null,
              state: formData.state.trim() || null,
              zip: formData.zip.trim() || null,
              estimated_revenue: formData.estimated_revenue,
              employee_count: formData.employee_count,
              year_founded: formData.year_founded,
              ownership_type: formData.ownership_type,
              pe_platform_id: formData.ownership_type === 'pe_backed' ? formData.pe_platform_id || null : null,
              manufacturer_affiliations: formData.manufacturer_affiliations.trim() || null,
              certifications: formData.certifications.trim() || null,
              awards: formData.awards.trim() || null,
              qualifying_tier: formData.qualifying_tier,
              status: formData.status,
              notes: formData.notes.trim() || null
            }
            const { error } = await supabase
              .from('companies')
              .insert(insertData)
            
            if (error) throw error
            return { name: formData.name.trim() }
          }
        })(),
        {
          loading: editingCompany ? 'Updating company...' : 'Creating company...',
          success: (data) => editingCompany 
            ? `Company "${data.name}" updated successfully`
            : `Company "${data.name}" created successfully`,
          error: editingCompany 
            ? 'Failed to update company'
            : 'Failed to create company'
        }
      )
      
      setSlideOverOpen(false)
      refetch()
    } catch (err) {
      // Error is already handled by toastPromise
      console.error('Error saving company:', err)
    } finally {
      setSaving(false)
    }
  }, [currentOrgId, formData, editingCompany, refetch])

  const handleDelete = useCallback(async () => {
    if (!editingCompany) return

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('companies')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', editingCompany.id)
      
      if (error) throw error
      
      setConfirmDeleteOpen(false)
      setSlideOverOpen(false)
      refetch()
    } catch (err) {
      console.error('Error deleting company:', err)
    } finally {
      setSaving(false)
    }
  }, [editingCompany, refetch])

  const formatCurrency = (num: number | null) => {
    if (!num) return ''
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}K`
    }
    return `$${num.toLocaleString()}`
  }


  const columns = [
    {
      key: 'name',
      header: 'Name',
      width: 'w-1/4',
      render: (row: Record<string, unknown>) => (
        <span className="font-semibold text-navy-900">
          {(row as unknown as CompanyRow).name}
        </span>
      )
    },
    {
      key: 'market',
      header: 'Market',
      width: 'w-32',
      render: (row: Record<string, unknown>) => {
        const company = row as unknown as CompanyRow & {
          markets?: { name: string }
        }
        return company.markets?.name || ''
      }
    },
    {
      key: 'vertical',
      header: 'Vertical',
      width: 'w-32',
      render: (row: Record<string, unknown>) => {
        const company = row as unknown as CompanyRow & {
          verticals?: { name: string }
        }
        return company.verticals?.name || ''
      }
    },
    {
      key: 'estimated_revenue',
      header: 'Est. Revenue',
      width: 'w-28',
      render: (row: Record<string, unknown>) => formatCurrency((row as unknown as CompanyRow).estimated_revenue)
    },
    {
      key: 'employee_count',
      header: 'Employees',
      width: 'w-24'
    },
    {
      key: 'year_founded',
      header: 'Founded',
      width: 'w-20'
    },
    {
      key: 'ownership_type',
      header: 'Ownership',
      width: 'w-28',
      render: (row: Record<string, unknown>) => {
        const company = row as unknown as CompanyRow
        return company.ownership_type ? (
          <StatusBadge status={company.ownership_type} />
        ) : null
      }
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-28',
      render: (row: Record<string, unknown>) => {
        const company = row as unknown as CompanyRow
        return company.status ? <StatusBadge status={company.status} /> : null
      }
    },
    {
      key: 'qualifying_tier',
      header: 'Tier',
      width: 'w-24',
      render: (row: Record<string, unknown>) => {
        const company = row as unknown as CompanyRow
        return company.qualifying_tier ? <StatusBadge status={company.qualifying_tier} /> : null
      }
    }
  ]

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error loading companies: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Companies</h1>
          <p className="text-slate-600">Manage your target companies and prospects</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Market</label>
              <select
                value={filters.market_id || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, market_id: e.target.value || undefined }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">All Markets</option>
                {markets?.map((market) => (
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
                {verticals?.map((vertical) => (
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
                <option value="prospect">Prospect</option>
                <option value="target">Target</option>
                <option value="active_campaign">Active Campaign</option>
                <option value="client">Client</option>
                <option value="lost">Lost</option>
                <option value="excluded">Excluded</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ownership</label>
              <select
                value={filters.ownership_type || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, ownership_type: e.target.value || undefined }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="independent">Independent</option>
                <option value="pe_backed">PE Backed</option>
                <option value="franchise">Franchise</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Qualifying Tier</label>
              <select
                value={filters.qualifying_tier || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, qualifying_tier: e.target.value || undefined }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">All Tiers</option>
                <option value="top">Top</option>
                <option value="qualified">Qualified</option>
                <option value="borderline">Borderline</option>
                <option value="excluded">Excluded</option>
              </select>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={(companies as unknown as Record<string, unknown>[]) || []}
          loading={loading}
          entityName="companies"
          onRowClick={(row) => handleRowClick(row as unknown as CompanyRow)}
          onAdd={handleAdd}
          addLabel="Add Company"
          emptyMessage="No companies found. Add your first company to get started."
          searchFields={['name', 'website', 'city', 'state']}
        />

        {/* Add/Edit SlideOver */}
        <SlideOver
          open={slideOverOpen}
          onClose={() => setSlideOverOpen(false)}
          title={editingCompany ? 'Edit Company' : 'Add Company'}
        >
          <div className="space-y-8">
            {/* Basic Info Section */}
            <div>
              <h3 className="text-lg font-medium text-navy-900 mb-4">Basic Info</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="e.g., ABC HVAC Services"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Market</label>
                    <select
                      value={formData.market_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, market_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      <option value="">Select Market</option>
                      {markets?.map((market) => (
                        <option key={market.id} value={market.id}>
                          {market.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Vertical</label>
                    <select
                      value={formData.vertical_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, vertical_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      <option value="">Select Vertical</option>
                      {verticals?.map((vertical) => (
                        <option key={vertical.id} value={vertical.id}>
                          {vertical.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div>
              <h3 className="text-lg font-medium text-navy-900 mb-4">Address</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address Line 1</label>
                  <input
                    type="text"
                    value={formData.address_line1}
                    onChange={(e) => setFormData(prev => ({ ...prev, address_line1: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.address_line2}
                    onChange={(e) => setFormData(prev => ({ ...prev, address_line2: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Suite 100"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      placeholder="Fort Wayne"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      placeholder="IN"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Zip</label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      placeholder="46804"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Business Details Section */}
            <div>
              <h3 className="text-lg font-medium text-navy-900 mb-4">Business Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Estimated Revenue</label>
                    <input
                      type="number"
                      value={formData.estimated_revenue || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        estimated_revenue: e.target.value ? parseInt(e.target.value) : null 
                      }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      placeholder="5000000"
                    />
                    <p className="text-sm text-slate-500 mt-1">Annual revenue in USD</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Employee Count</label>
                    <input
                      type="number"
                      value={formData.employee_count || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        employee_count: e.target.value ? parseInt(e.target.value) : null 
                      }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      placeholder="25"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Year Founded</label>
                    <input
                      type="number"
                      value={formData.year_founded || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        year_founded: e.target.value ? parseInt(e.target.value) : null 
                      }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      placeholder="1995"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ownership Type</label>
                    <select
                      value={formData.ownership_type}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        ownership_type: e.target.value as CompanyFormData['ownership_type']
                      }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      <option value="independent">Independent</option>
                      <option value="pe_backed">PE Backed</option>
                      <option value="franchise">Franchise</option>
                      <option value="corporate">Corporate</option>
                    </select>
                  </div>

                  {formData.ownership_type === 'pe_backed' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">PE Platform</label>
                      <select
                        value={formData.pe_platform_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, pe_platform_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      >
                        <option value="">Select PE Platform</option>
                        {pePlatforms?.map((platform) => (
                          <option key={platform.id} value={platform.id}>
                            {platform.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Manufacturer Affiliations</label>
                  <input
                    type="text"
                    value={formData.manufacturer_affiliations}
                    onChange={(e) => setFormData(prev => ({ ...prev, manufacturer_affiliations: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="e.g., Carrier Factory Authorized Dealer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Certifications</label>
                  <input
                    type="text"
                    value={formData.certifications}
                    onChange={(e) => setFormData(prev => ({ ...prev, certifications: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="e.g., NATE Certified, BBB A+"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Awards</label>
                  <input
                    type="text"
                    value={formData.awards}
                    onChange={(e) => setFormData(prev => ({ ...prev, awards: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="e.g., Best HVAC Company 2023"
                  />
                </div>
              </div>
            </div>

            {/* Classification Section */}
            <div>
              <h3 className="text-lg font-medium text-navy-900 mb-4">Classification</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Qualifying Tier</label>
                    <select
                      value={formData.qualifying_tier || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        qualifying_tier: e.target.value as CompanyFormData['qualifying_tier'] || null
                      }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      <option value="">Select Tier</option>
                      <option value="top">Top</option>
                      <option value="qualified">Qualified</option>
                      <option value="borderline">Borderline</option>
                      <option value="excluded">Excluded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        status: e.target.value as CompanyFormData['status']
                      }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      <option value="prospect">Prospect</option>
                      <option value="target">Target</option>
                      <option value="active_campaign">Active Campaign</option>
                      <option value="client">Client</option>
                      <option value="lost">Lost</option>
                      <option value="churned">Churned</option>
                      <option value="excluded">Excluded</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Additional notes about this company..."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6">
              {editingCompany && (
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
                  {saving ? 'Saving...' : editingCompany ? 'Update' : 'Create'}
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
          title="Delete Company"
          message={`Are you sure you want to delete "${editingCompany?.name}"? This action cannot be undone.`}
        />
      </div>
    </div>
  )
}