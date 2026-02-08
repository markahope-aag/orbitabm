'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/context/OrgContext'
import { DataTable, StatusBadge } from '@/components/ui'
import type { CompanyRow, MarketRow, VerticalRow } from '@/lib/types/database'

interface TargetRow extends CompanyRow {
  markets?: { name: string; state: string }
  verticals?: { name: string }
  campaign_id: string | null
  campaign_name: string | null
  campaign_status: string | null
  campaign_current_step: number | null
  campaign_start_date: string | null
  campaign_assigned_to: string | null
}

export default function TargetsPage() {
  const router = useRouter()
  const { currentOrgId } = useOrg()
  const supabase = createClient()

  const [rows, setRows] = useState<TargetRow[]>([])
  const [markets, setMarkets] = useState<MarketRow[]>([])
  const [verticals, setVerticals] = useState<VerticalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filters, setFilters] = useState<{
    market_id?: string
    vertical_id?: string
    status?: string
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

      // 1. Fetch target / active_campaign companies
      const { data: companies, error: compError } = await supabase
        .from('companies')
        .select('*, markets(name, state), verticals(name)')
        .eq('organization_id', currentOrgId!)
        .in('status', ['target', 'active_campaign'])
        .is('deleted_at', null)
        .order('name')

      if (compError) throw compError

      const companyIds = (companies || []).map((c) => c.id)

      // 2. Batch-fetch campaigns for those companies (skip if none)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let campaignsByCompany: Record<string, any> = {}

      if (companyIds.length > 0) {
        const { data: cData, error: campError } = await supabase
          .from('campaigns')
          .select('id, name, status, current_step, start_date, company_id, created_at, playbook_templates(name), profiles:assigned_to(full_name)')
          .in('company_id', companyIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (campError) throw campError

        // Pick the "best" campaign per company: active > planned > most recent
        const statusPriority: Record<string, number> = { active: 0, planned: 1 }

        for (const camp of cData || []) {
          const companyId = camp.company_id as string
          const existing = campaignsByCompany[companyId]
          if (!existing) {
            campaignsByCompany[companyId] = camp
          } else {
            const existingPri = statusPriority[existing.status] ?? 99
            const newPri = statusPriority[camp.status as string] ?? 99
            if (newPri < existingPri) {
              campaignsByCompany[companyId] = camp
            }
            // If same priority, the first one seen wins (already sorted by created_at desc = most recent first)
          }
        }
      }

      // 3. Merge into TargetRow[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const merged: TargetRow[] = (companies || []).map((company: any) => {
        const camp = campaignsByCompany[company.id]
        // Supabase joins return single object for FK relations
        const assignedProfile = camp?.profiles
        const assignedName = assignedProfile?.full_name ?? null
        return {
          ...company,
          campaign_id: camp?.id ?? null,
          campaign_name: camp?.name ?? null,
          campaign_status: camp?.status ?? null,
          campaign_current_step: camp?.current_step ?? null,
          campaign_start_date: camp?.start_date ?? null,
          campaign_assigned_to: assignedName,
        }
      })

      setRows(merged)

      // Fetch markets & verticals for filter dropdowns
      const [{ data: mData }, { data: vData }] = await Promise.all([
        supabase.from('markets').select('*').eq('organization_id', currentOrgId!).is('deleted_at', null).order('name'),
        supabase.from('verticals').select('*').eq('organization_id', currentOrgId!).is('deleted_at', null).order('name'),
      ])

      setMarkets(mData || [])
      setVerticals(vData || [])
    } catch (err) {
      console.error('Error fetching targets data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Client-side filtering
  const filteredRows = rows.filter((row) => {
    if (filters.market_id && row.market_id !== filters.market_id) return false
    if (filters.vertical_id && row.vertical_id !== filters.vertical_id) return false
    if (filters.status && row.status !== filters.status) return false
    return true
  })

  const formatCurrency = (num: number | null) => {
    if (!num) return '\u2014'
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`
    return `$${num.toLocaleString()}`
  }

  const formatDate = (date: string | null) => {
    if (!date) return '\u2014'
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const columns = [
    {
      key: 'name',
      header: 'Company',
      width: 'w-48',
      render: (row: Record<string, unknown>) => (
        <span className="font-semibold text-navy-900">
          {(row as unknown as TargetRow).name}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-32',
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as TargetRow
        return r.status ? <StatusBadge status={r.status} /> : null
      },
    },
    {
      key: 'estimated_revenue',
      header: 'Revenue',
      width: 'w-28',
      render: (row: Record<string, unknown>) =>
        formatCurrency((row as unknown as TargetRow).estimated_revenue),
    },
    {
      key: 'market',
      header: 'Market',
      width: 'w-32',
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as TargetRow
        return r.markets?.name || '\u2014'
      },
    },
    {
      key: 'vertical',
      header: 'Vertical',
      width: 'w-32',
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as TargetRow
        return r.verticals?.name || '\u2014'
      },
    },
    {
      key: 'campaign_name',
      header: 'Campaign',
      width: 'w-40',
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as TargetRow
        return r.campaign_name ? (
          <span>{r.campaign_name}</span>
        ) : (
          <span className="italic text-slate-400">No campaign</span>
        )
      },
    },
    {
      key: 'campaign_status',
      header: 'Campaign Status',
      width: 'w-32',
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as TargetRow
        return r.campaign_status ? <StatusBadge status={r.campaign_status} /> : null
      },
    },
    {
      key: 'campaign_current_step',
      header: 'Step',
      width: 'w-20',
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as TargetRow
        return r.campaign_current_step != null ? `Step ${r.campaign_current_step}` : '\u2014'
      },
    },
    {
      key: 'campaign_start_date',
      header: 'Started',
      width: 'w-28',
      render: (row: Record<string, unknown>) =>
        formatDate((row as unknown as TargetRow).campaign_start_date),
    },
    {
      key: 'campaign_assigned_to',
      header: 'Assigned To',
      width: 'w-32',
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as TargetRow
        return r.campaign_assigned_to || <span className="text-slate-400">Unassigned</span>
      },
    },
  ]

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error loading targets: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Targets</h1>
          <p className="text-slate-600">
            Companies being actively pursued &mdash; targets and active campaigns
          </p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Market</label>
              <select
                value={filters.market_id || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, market_id: e.target.value || undefined }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">All Markets</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vertical</label>
              <select
                value={filters.vertical_id || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, vertical_id: e.target.value || undefined }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">All Verticals</option>
                {verticals.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value || undefined }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="target">Target</option>
                <option value="active_campaign">Active Campaign</option>
              </select>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={(filteredRows as unknown as Record<string, unknown>[]) || []}
          loading={loading}
          entityName="targets"
          onRowClick={(row) => router.push(`/companies/${(row as unknown as TargetRow).id}`)}
          emptyMessage="No target companies found. Promote companies to 'Target' status from the Companies page."
          searchFields={['name', 'campaign_name']}
        />
      </div>
    </div>
  )
}
