'use client'

// OrbitABM React Hooks for Data Fetching
// Simple hooks using useState + useEffect for MVP approach

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  OrganizationRow,
  ProfileRow,
  MarketRow,
  VerticalRow,
  PEPlatformRow,
  CompanyRow,
  ContactRow,
  PEAcquisitionRow,
  DigitalSnapshotRow,
  PlaybookTemplateRow,
  PlaybookStepRow,
  CampaignRow,
  ActivityRow,
  AssetRow,
  ResultRow
} from '@/lib/types/database'

// Hook return type
interface UseDataResult<T> {
  data: T[] | null
  loading: boolean
  error: string | null
  refetch: () => void
}

interface UseDataSingleResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// =====================================================
// ORGANIZATIONS
// =====================================================

export function useOrganizations(): UseDataResult<OrganizationRow> {
  const [data, setData] = useState<OrganizationRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: organizations, error } = await supabase
        .from('organizations')
        .select('*')
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      setData(organizations)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return { data, loading, error, refetch: fetchData }
}

// =====================================================
// PROFILES
// =====================================================

export function useProfiles(orgId: string): UseDataResult<ProfileRow> {
  const [data, setData] = useState<ProfileRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', orgId)
        .order('full_name')

      if (error) throw error
      setData(profiles)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId])

  return { data, loading, error, refetch: fetchData }
}

// =====================================================
// MARKETS
// =====================================================

export function useMarkets(orgId: string): UseDataResult<MarketRow> {
  const [data, setData] = useState<MarketRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: markets, error } = await supabase
        .from('markets')
        .select('*')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      setData(markets)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId])

  return { data, loading, error, refetch: fetchData }
}

// =====================================================
// VERTICALS
// =====================================================

export function useVerticals(orgId: string): UseDataResult<VerticalRow> {
  const [data, setData] = useState<VerticalRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: verticals, error } = await supabase
        .from('verticals')
        .select('*')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      setData(verticals)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId])

  return { data, loading, error, refetch: fetchData }
}

// =====================================================
// PE PLATFORMS
// =====================================================

export function usePEPlatforms(orgId: string): UseDataResult<PEPlatformRow> {
  const [data, setData] = useState<PEPlatformRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: platforms, error } = await supabase
        .from('pe_platforms')
        .select('*')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      setData(platforms)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId])

  return { data, loading, error, refetch: fetchData }
}

// =====================================================
// COMPANIES
// =====================================================

export function useCompanies(orgId: string, filters?: {
  market_id?: string
  vertical_id?: string
  status?: string
  ownership_type?: string
  qualifying_tier?: string
}): UseDataResult<CompanyRow> {
  const [data, setData] = useState<CompanyRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      let query = supabase
        .from('companies')
        .select(`
          *,
          markets:market_id(name, state),
          verticals:vertical_id(name),
          pe_platforms:pe_platform_id(name)
        `)
        .eq('organization_id', orgId)
        .is('deleted_at', null)

      if (filters?.market_id) query = query.eq('market_id', filters.market_id)
      if (filters?.vertical_id) query = query.eq('vertical_id', filters.vertical_id)
      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.ownership_type) query = query.eq('ownership_type', filters.ownership_type)
      if (filters?.qualifying_tier) query = query.eq('qualifying_tier', filters.qualifying_tier)

      const { data: companies, error } = await query.order('name')

      if (error) throw error
      setData(companies as CompanyRow[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId, filters?.market_id, filters?.vertical_id, filters?.status, filters?.ownership_type, filters?.qualifying_tier])

  return { data, loading, error, refetch: fetchData }
}

export function useCompany(id: string): UseDataSingleResult<CompanyRow> {
  const [data, setData] = useState<CompanyRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: company, error } = await supabase
        .from('companies')
        .select(`
          *,
          markets:market_id(name, state),
          verticals:vertical_id(name),
          pe_platforms:pe_platform_id(name)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      setData(company as CompanyRow)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchData()
    }
  }, [id])

  return { data, loading, error, refetch: fetchData }
}

// =====================================================
// CONTACTS
// =====================================================

export function useContacts(orgId: string, filters?: {
  company_id?: string
  relationship_status?: string
}): UseDataResult<ContactRow> {
  const [data, setData] = useState<ContactRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      let query = supabase
        .from('contacts')
        .select(`
          *,
          companies:company_id(name)
        `)
        .eq('organization_id', orgId)
        .is('deleted_at', null)

      if (filters?.company_id) query = query.eq('company_id', filters.company_id)
      if (filters?.relationship_status) query = query.eq('relationship_status', filters.relationship_status)

      const { data: contacts, error } = await query.order('last_name')

      if (error) throw error
      setData(contacts as ContactRow[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId, filters?.company_id, filters?.relationship_status])

  return { data, loading, error, refetch: fetchData }
}

// =====================================================
// PE ACQUISITIONS
// =====================================================

export function usePEAcquisitions(orgId: string, filters?: {
  pe_platform_id?: string
}): UseDataResult<PEAcquisitionRow> {
  const [data, setData] = useState<PEAcquisitionRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      let query = supabase
        .from('pe_acquisitions')
        .select(`
          *,
          pe_platforms:pe_platform_id(name),
          companies:company_id(name, market_id, vertical_id)
        `)
        .eq('organization_id', orgId)

      if (filters?.pe_platform_id) query = query.eq('pe_platform_id', filters.pe_platform_id)

      const { data: acquisitions, error } = await query.order('acquisition_date', { ascending: false })

      if (error) throw error
      setData(acquisitions as PEAcquisitionRow[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId, filters?.pe_platform_id])

  return { data, loading, error, refetch: fetchData }
}

// =====================================================
// DIGITAL SNAPSHOTS
// =====================================================

export function useDigitalSnapshots(orgId: string, filters?: {
  company_id?: string
}): UseDataResult<DigitalSnapshotRow> {
  const [data, setData] = useState<DigitalSnapshotRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      let query = supabase
        .from('digital_snapshots')
        .select(`
          *,
          companies:company_id(name)
        `)
        .eq('organization_id', orgId)

      if (filters?.company_id) query = query.eq('company_id', filters.company_id)

      const { data: snapshots, error } = await query.order('snapshot_date', { ascending: false })

      if (error) throw error
      setData(snapshots as DigitalSnapshotRow[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId, filters?.company_id])

  return { data, loading, error, refetch: fetchData }
}

// =====================================================
// PLAYBOOK TEMPLATES
// =====================================================

export function usePlaybookTemplates(orgId: string): UseDataResult<PlaybookTemplateRow> {
  const [data, setData] = useState<PlaybookTemplateRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: templates, error } = await supabase
        .from('playbook_templates')
        .select(`
          *,
          verticals:vertical_id(name)
        `)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      setData(templates as PlaybookTemplateRow[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId])

  return { data, loading, error, refetch: fetchData }
}

// =====================================================
// PLAYBOOK STEPS
// =====================================================

export function usePlaybookSteps(orgId: string, playbookTemplateId: string): UseDataResult<PlaybookStepRow> {
  const [data, setData] = useState<PlaybookStepRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: steps, error } = await supabase
        .from('playbook_steps')
        .select('*')
        .eq('organization_id', orgId)
        .eq('playbook_template_id', playbookTemplateId)
        .order('step_number')

      if (error) throw error
      setData(steps)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId && playbookTemplateId) {
      fetchData()
    }
  }, [orgId, playbookTemplateId])

  return { data, loading, error, refetch: fetchData }
}

// =====================================================
// CAMPAIGNS
// =====================================================

export function useCampaigns(orgId: string, filters?: {
  market_id?: string
  vertical_id?: string
  status?: string
}): UseDataResult<CampaignRow> {
  const [data, setData] = useState<CampaignRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      let query = supabase
        .from('campaigns')
        .select(`
          *,
          companies:company_id(name),
          markets:market_id(name, state),
          verticals:vertical_id(name),
          playbook_templates:playbook_template_id(name),
          profiles:assigned_to(full_name)
        `)
        .eq('organization_id', orgId)
        .is('deleted_at', null)

      if (filters?.market_id) query = query.eq('market_id', filters.market_id)
      if (filters?.vertical_id) query = query.eq('vertical_id', filters.vertical_id)
      if (filters?.status) query = query.eq('status', filters.status)

      const { data: campaigns, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setData(campaigns as CampaignRow[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId, filters?.market_id, filters?.vertical_id, filters?.status])

  return { data, loading, error, refetch: fetchData }
}

export function useCampaign(id: string): UseDataSingleResult<CampaignRow> {
  const [data, setData] = useState<CampaignRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          companies:company_id(name, website, estimated_revenue, employee_count),
          markets:market_id(name, state),
          verticals:vertical_id(name),
          playbook_templates:playbook_template_id(name, total_duration_days),
          profiles:assigned_to(full_name)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      setData(campaign as CampaignRow)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchData()
    }
  }, [id])

  return { data, loading, error, refetch: fetchData }
}

// =====================================================
// ACTIVITIES
// =====================================================

export function useActivities(orgId: string, filters?: {
  campaign_id?: string
  status?: string
  scheduled_date_from?: string
  scheduled_date_to?: string
}): UseDataResult<ActivityRow> {
  const [data, setData] = useState<ActivityRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      let query = supabase
        .from('activities')
        .select(`
          *,
          campaigns:campaign_id(name, companies:company_id(name)),
          contacts:contact_id(first_name, last_name),
          playbook_steps:playbook_step_id(title)
        `)
        .eq('organization_id', orgId)

      if (filters?.campaign_id) query = query.eq('campaign_id', filters.campaign_id)
      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.scheduled_date_from) query = query.gte('scheduled_date', filters.scheduled_date_from)
      if (filters?.scheduled_date_to) query = query.lte('scheduled_date', filters.scheduled_date_to)

      const { data: activities, error } = await query.order('scheduled_date')

      if (error) throw error
      setData(activities as ActivityRow[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId, filters?.campaign_id, filters?.status, filters?.scheduled_date_from, filters?.scheduled_date_to])

  return { data, loading, error, refetch: fetchData }
}

// =====================================================
// ASSETS
// =====================================================

export function useAssets(orgId: string, filters?: {
  campaign_id?: string
  company_id?: string
  asset_type?: string
}): UseDataResult<AssetRow> {
  const [data, setData] = useState<AssetRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      let query = supabase
        .from('assets')
        .select(`
          *,
          campaigns:campaign_id(name),
          companies:company_id(name)
        `)
        .eq('organization_id', orgId)
        .is('deleted_at', null)

      if (filters?.campaign_id) query = query.eq('campaign_id', filters.campaign_id)
      if (filters?.company_id) query = query.eq('company_id', filters.company_id)
      if (filters?.asset_type) query = query.eq('asset_type', filters.asset_type)

      const { data: assets, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setData(assets as AssetRow[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId, filters?.campaign_id, filters?.company_id, filters?.asset_type])

  return { data, loading, error, refetch: fetchData }
}

// =====================================================
// RESULTS
// =====================================================

export function useResults(orgId: string, filters?: {
  campaign_id?: string
  result_type?: string
}): UseDataResult<ResultRow> {
  const [data, setData] = useState<ResultRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      let query = supabase
        .from('results')
        .select(`
          *,
          campaigns:campaign_id(name, companies:company_id(name))
        `)
        .eq('organization_id', orgId)

      if (filters?.campaign_id) query = query.eq('campaign_id', filters.campaign_id)
      if (filters?.result_type) query = query.eq('result_type', filters.result_type)

      const { data: results, error } = await query.order('result_date', { ascending: false })

      if (error) throw error
      setData(results as ResultRow[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId, filters?.campaign_id, filters?.result_type])

  return { data, loading, error, refetch: fetchData }
}