'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DataTable, SlideOver, StatusBadge } from '@/components/ui'
import { Plus } from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import type { 
  AssetRow, 
  CompanyRow,
  CampaignRow
} from '@/lib/types/database'

interface AssetWithRelations extends AssetRow {
  companies?: CompanyRow
  campaigns?: CampaignRow
}

export default function AssetsPage() {
  const { currentOrgId } = useOrg()
  const supabase = createClient()

  // State
  const [assets, setAssets] = useState<AssetWithRelations[]>([])
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<AssetWithRelations | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    asset_type: 'blueprint',
    company_id: '',
    campaign_id: '',
    description: '',
    file_url: '',
    landing_page_url: '',
    status: 'draft',
    delivered_date: ''
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

      // Fetch assets with company and campaign information
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select(`
          *,
          companies (name),
          campaigns (name)
        `)
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (assetsError) throw assetsError
      setAssets(assetsData as AssetWithRelations[] || [])

      // Fetch companies for dropdown
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('name')

      if (companiesError) throw companiesError
      setCompanies(companiesData || [])

      // Fetch campaigns for dropdown
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('organization_id', currentOrgId)
        .is('deleted_at', null)
        .order('name')

      if (campaignsError) throw campaignsError
      setCampaigns(campaignsData || [])

    } catch (err) {
      console.error('Error fetching assets data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!currentOrgId || !formData.title.trim()) return

    try {
      setSaving(true)

      const payload = {
        ...formData,
        organization_id: currentOrgId,
        delivered_date: formData.delivered_date || null
      }

      if (editingAsset) {
        // Update existing asset
        const { error } = await supabase
          .from('assets')
          .update(payload)
          .eq('id', editingAsset.id)

        if (error) throw error
      } else {
        // Create new asset
        const { error } = await supabase
          .from('assets')
          .insert([payload])

        if (error) throw error
      }

      await fetchData()
      setAssetModalOpen(false)
      setEditingAsset(null)
      resetForm()
    } catch (err) {
      console.error('Error saving asset:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (asset: AssetWithRelations) => {
    setEditingAsset(asset)
    setFormData({
      title: asset.title,
      asset_type: asset.asset_type,
      company_id: asset.company_id || '',
      campaign_id: asset.campaign_id || '',
      description: asset.description || '',
      file_url: asset.file_url || '',
      landing_page_url: asset.landing_page_url || '',
      status: asset.status,
      delivered_date: asset.delivered_date || ''
    })
    setAssetModalOpen(true)
  }

  const handleDelete = async (asset: AssetWithRelations) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    try {
      const { error } = await supabase
        .from('assets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', asset.id)

      if (error) throw error
      await fetchData()
    } catch (err) {
      console.error('Error deleting asset:', err)
    }
  }

  const openAddAsset = () => {
    setEditingAsset(null)
    resetForm()
    setAssetModalOpen(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      asset_type: 'blueprint',
      company_id: '',
      campaign_id: '',
      description: '',
      file_url: '',
      landing_page_url: '',
      status: 'draft',
      delivered_date: ''
    })
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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Assets</h1>
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
              <h1 className="text-3xl font-bold text-navy-900 mb-2">Assets</h1>
              <p className="text-slate-600">Manage campaign assets and deliverables</p>
            </div>
            <button
              onClick={openAddAsset}
              className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </button>
          </div>
        </div>

        {/* Assets Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
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
                    {(row as unknown as AssetWithRelations).title}
                  </div>
                )
              },
              {
                key: 'asset_type',
                header: 'Type',
                render: (row) => (
                  <StatusBadge status={(row as unknown as AssetWithRelations).asset_type} />
                )
              },
              {
                key: 'company',
                header: 'Company',
                render: (row) => (row as unknown as AssetWithRelations).companies?.name || 'N/A'
              },
              {
                key: 'campaign',
                header: 'Campaign',
                render: (row) => (row as unknown as AssetWithRelations).campaigns?.name || 'N/A'
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <StatusBadge status={(row as unknown as AssetWithRelations).status} />
                )
              },
              {
                key: 'delivered_date',
                header: 'Delivered Date',
                render: (row) => {
                  const asset = row as unknown as AssetWithRelations
                  return asset.delivered_date ? new Date(asset.delivered_date).toLocaleDateString() : 'N/A'
                }
              }
            ]}
            onRowClick={(row) => handleEdit(row as unknown as AssetWithRelations)}
            searchable={true}
            searchFields={['title']}
            emptyMessage="No assets found"
          />
        </div>
      </div>

      {/* Add/Edit Asset Modal */}
      <SlideOver
        open={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        title={editingAsset ? 'Edit Asset' : 'Add Asset'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Asset Type *
            </label>
            <select
              value={formData.asset_type}
              onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            >
              <option value="blueprint">Blueprint</option>
              <option value="website_audit">Website Audit</option>
              <option value="market_report">Market Report</option>
              <option value="landing_page">Landing Page</option>
              <option value="breakup_note">Breakup Note</option>
              <option value="proposal">Proposal</option>
              <option value="presentation">Presentation</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company
              </label>
              <select
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Campaign
              </label>
              <select
                value={formData.campaign_id}
                onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Select Campaign</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                File URL
              </label>
              <input
                type="url"
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Landing Page URL
              </label>
              <input
                type="url"
                value={formData.landing_page_url}
                onChange={(e) => setFormData({ ...formData, landing_page_url: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
                <option value="viewed">Viewed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Delivered Date
              </label>
              <input
                type="date"
                value={formData.delivered_date}
                onChange={(e) => setFormData({ ...formData, delivered_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setAssetModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            {editingAsset && (
              <button
                onClick={() => handleDelete(editingAsset)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingAsset ? 'Update Asset' : 'Add Asset'}
            </button>
          </div>
        </div>
      </SlideOver>
    </div>
  )
}