// OrbitABM Supabase Query Helpers
// Basic CRUD operations for all entities

import { createClient } from '@/lib/supabase/server'
import type {
  OrganizationInsert, OrganizationUpdate,
  ProfileInsert, ProfileUpdate,
  MarketInsert, MarketUpdate,
  VerticalInsert, VerticalUpdate,
  PEPlatformInsert, PEPlatformUpdate,
  CompanyInsert, CompanyUpdate,
  ContactInsert, ContactUpdate,
  PEAcquisitionInsert, PEAcquisitionUpdate,
  DigitalSnapshotInsert, DigitalSnapshotUpdate,
  PlaybookTemplateInsert, PlaybookTemplateUpdate,
  PlaybookStepInsert, PlaybookStepUpdate,
  CampaignInsert, CampaignUpdate,
  CampaignCompetitorInsert,
  ActivityInsert, ActivityUpdate,
  AssetInsert, AssetUpdate,
  ResultInsert, ResultUpdate
} from '@/lib/types/database'

// =====================================================
// ORGANIZATIONS
// =====================================================

export async function getAllOrganizations() {
  const supabase = await createClient()
  return supabase
    .from('organizations')
    .select('*')
    .is('deleted_at', null)
    .order('name')
}

export async function getOrganizationById(id: string) {
  const supabase = await createClient()
  return supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
}

export async function createOrganization(data: OrganizationInsert) {
  const supabase = await createClient()
  return supabase
    .from('organizations')
    .insert(data)
    .select()
    .single()
}

export async function updateOrganization(id: string, data: OrganizationUpdate) {
  const supabase = await createClient()
  return supabase
    .from('organizations')
    .update(data)
    .eq('id', id)
    .select()
    .single()
}

export async function softDeleteOrganization(id: string) {
  const supabase = await createClient()
  return supabase
    .from('organizations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
}

// =====================================================
// PROFILES
// =====================================================

export async function getAllProfiles(orgId: string) {
  const supabase = await createClient()
  return supabase
    .from('profiles')
    .select('*')
    .eq('organization_id', orgId)
    .order('full_name')
}

export async function getProfileById(id: string) {
  const supabase = await createClient()
  return supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
}

export async function createProfile(data: ProfileInsert) {
  const supabase = await createClient()
  return supabase
    .from('profiles')
    .insert(data)
    .select()
    .single()
}

export async function updateProfile(id: string, data: ProfileUpdate) {
  const supabase = await createClient()
  return supabase
    .from('profiles')
    .update(data)
    .eq('id', id)
    .select()
    .single()
}

// =====================================================
// MARKETS
// =====================================================

export async function getAllMarkets(orgId: string) {
  const supabase = await createClient()
  return supabase
    .from('markets')
    .select('*')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('name')
}

export async function getMarketById(id: string) {
  const supabase = await createClient()
  return supabase
    .from('markets')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
}

export async function createMarket(data: MarketInsert) {
  const supabase = await createClient()
  return supabase
    .from('markets')
    .insert(data)
    .select()
    .single()
}

export async function updateMarket(id: string, data: MarketUpdate) {
  const supabase = await createClient()
  return supabase
    .from('markets')
    .update(data)
    .eq('id', id)
    .select()
    .single()
}

export async function softDeleteMarket(id: string) {
  const supabase = await createClient()
  return supabase
    .from('markets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
}

// =====================================================
// VERTICALS
// =====================================================

export async function getAllVerticals(orgId: string) {
  const supabase = await createClient()
  return supabase
    .from('verticals')
    .select('*')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('name')
}

export async function getVerticalById(id: string) {
  const supabase = await createClient()
  return supabase
    .from('verticals')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
}

export async function createVertical(data: VerticalInsert) {
  const supabase = await createClient()
  return supabase
    .from('verticals')
    .insert(data)
    .select()
    .single()
}

export async function updateVertical(id: string, data: VerticalUpdate) {
  const supabase = await createClient()
  return supabase
    .from('verticals')
    .update(data)
    .eq('id', id)
    .select()
    .single()
}

export async function softDeleteVertical(id: string) {
  const supabase = await createClient()
  return supabase
    .from('verticals')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
}

// =====================================================
// PE PLATFORMS
// =====================================================

export async function getAllPEPlatforms(orgId: string) {
  const supabase = await createClient()
  return supabase
    .from('pe_platforms')
    .select('*')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('name')
}

export async function getPEPlatformById(id: string) {
  const supabase = await createClient()
  return supabase
    .from('pe_platforms')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
}

export async function createPEPlatform(data: PEPlatformInsert) {
  const supabase = await createClient()
  return supabase
    .from('pe_platforms')
    .insert(data)
    .select()
    .single()
}

export async function updatePEPlatform(id: string, data: PEPlatformUpdate) {
  const supabase = await createClient()
  return supabase
    .from('pe_platforms')
    .update(data)
    .eq('id', id)
    .select()
    .single()
}

export async function softDeletePEPlatform(id: string) {
  const supabase = await createClient()
  return supabase
    .from('pe_platforms')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
}

// =====================================================
// COMPANIES
// =====================================================

export async function getAllCompanies(orgId: string, filters?: {
  market_id?: string
  vertical_id?: string
  status?: string
  ownership_type?: string
  qualifying_tier?: string
}) {
  const supabase = await createClient()
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

  return query.order('name')
}

export async function getCompanyById(id: string) {
  const supabase = await createClient()
  return supabase
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
}

export async function createCompany(data: CompanyInsert) {
  const supabase = await createClient()
  return supabase
    .from('companies')
    .insert(data)
    .select()
    .single()
}

export async function updateCompany(id: string, data: CompanyUpdate) {
  const supabase = await createClient()
  return supabase
    .from('companies')
    .update(data)
    .eq('id', id)
    .select()
    .single()
}

export async function softDeleteCompany(id: string) {
  const supabase = await createClient()
  return supabase
    .from('companies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
}

// =====================================================
// CONTACTS
// =====================================================

export async function getAllContacts(orgId: string, filters?: {
  company_id?: string
  relationship_status?: string
}) {
  const supabase = await createClient()
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

  return query.order('last_name')
}

export async function getContactById(id: string) {
  const supabase = await createClient()
  return supabase
    .from('contacts')
    .select(`
      *,
      companies:company_id(name)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()
}

export async function createContact(data: ContactInsert) {
  const supabase = await createClient()
  return supabase
    .from('contacts')
    .insert(data)
    .select()
    .single()
}

export async function updateContact(id: string, data: ContactUpdate) {
  const supabase = await createClient()
  return supabase
    .from('contacts')
    .update(data)
    .eq('id', id)
    .select()
    .single()
}

export async function softDeleteContact(id: string) {
  const supabase = await createClient()
  return supabase
    .from('contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
}

// =====================================================
// PE ACQUISITIONS
// =====================================================

export async function getAllPEAcquisitions(orgId: string, filters?: {
  pe_platform_id?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from('pe_acquisitions')
    .select(`
      *,
      pe_platforms:pe_platform_id(name),
      companies:company_id(name, market_id, vertical_id)
    `)
    .eq('organization_id', orgId)

  if (filters?.pe_platform_id) query = query.eq('pe_platform_id', filters.pe_platform_id)

  return query.order('acquisition_date', { ascending: false })
}

export async function getPEAcquisitionById(id: string) {
  const supabase = await createClient()
  return supabase
    .from('pe_acquisitions')
    .select(`
      *,
      pe_platforms:pe_platform_id(name),
      companies:company_id(name)
    `)
    .eq('id', id)
    .single()
}

export async function createPEAcquisition(data: PEAcquisitionInsert) {
  const supabase = await createClient()
  return supabase
    .from('pe_acquisitions')
    .insert(data)
    .select()
    .single()
}

export async function updatePEAcquisition(id: string, data: PEAcquisitionUpdate) {
  const supabase = await createClient()
  return supabase
    .from('pe_acquisitions')
    .update(data)
    .eq('id', id)
    .select()
    .single()
}

// =====================================================
// DIGITAL SNAPSHOTS
// =====================================================

export async function getAllDigitalSnapshots(orgId: string, filters?: {
  company_id?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from('digital_snapshots')
    .select(`
      *,
      companies:company_id(name)
    `)
    .eq('organization_id', orgId)

  if (filters?.company_id) query = query.eq('company_id', filters.company_id)

  return query.order('snapshot_date', { ascending: false })
}

export async function getDigitalSnapshotById(id: string) {
  const supabase = await createClient()
  return supabase
    .from('digital_snapshots')
    .select(`
      *,
      companies:company_id(name)
    `)
    .eq('id', id)
    .single()
}

export async function createDigitalSnapshot(data: DigitalSnapshotInsert) {
  const supabase = await createClient()
  return supabase
    .from('digital_snapshots')
    .insert(data)
    .select()
    .single()
}

export async function updateDigitalSnapshot(id: string, data: DigitalSnapshotUpdate) {
  const supabase = await createClient()
  return supabase
    .from('digital_snapshots')
    .update(data)
    .eq('id', id)
    .select()
    .single()
}

// =====================================================
// PLAYBOOK TEMPLATES
// =====================================================

export async function getAllPlaybookTemplates(orgId: string) {
  const supabase = await createClient()
  return supabase
    .from('playbook_templates')
    .select(`
      *,
      verticals:vertical_id(name)
    `)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('name')
}

export async function getPlaybookTemplateById(id: string) {
  const supabase = await createClient()
  return supabase
    .from('playbook_templates')
    .select(`
      *,
      verticals:vertical_id(name),
      playbook_steps(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()
}

export async function createPlaybookTemplate(data: PlaybookTemplateInsert) {
  const supabase = await createClient()
  return supabase
    .from('playbook_templates')
    .insert(data)
    .select()
    .single()
}

export async function updatePlaybookTemplate(id: string, data: PlaybookTemplateUpdate) {
  const supabase = await createClient()
  return supabase
    .from('playbook_templates')
    .update(data)
    .eq('id', id)
    .select()
    .single()
}

export async function softDeletePlaybookTemplate(id: string) {
  const supabase = await createClient()
  return supabase
    .from('playbook_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
}

// =====================================================
// PLAYBOOK STEPS
// =====================================================

export async function getAllPlaybookSteps(orgId: string, playbookTemplateId: string) {
  const supabase = await createClient()
  return supabase
    .from('playbook_steps')
    .select('*')
    .eq('organization_id', orgId)
    .eq('playbook_template_id', playbookTemplateId)
    .order('step_number')
}

export async function getPlaybookStepById(id: string) {
  const supabase = await createClient()
  return supabase
    .from('playbook_steps')
    .select('*')
    .eq('id', id)
    .single()
}

export async function createPlaybookStep(data: PlaybookStepInsert) {
  const supabase = await createClient()
  return supabase
    .from('playbook_steps')
    .insert(data)
    .select()
    .single()
}

export async function updatePlaybookStep(id: string, data: PlaybookStepUpdate) {
  const supabase = await createClient()
  return supabase
    .from('playbook_steps')
    .update(data)
    .eq('id', id)
    .select()
    .single()
}

// =====================================================
// CAMPAIGNS
// =====================================================

export async function getAllCampaigns(orgId: string, filters?: {
  market_id?: string
  vertical_id?: string
  status?: string
}) {
  const supabase = await createClient()
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

  return query.order('created_at', { ascending: false })
}

export async function getCampaignById(id: string) {
  const supabase = await createClient()
  return supabase
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
}

export async function createCampaign(data: CampaignInsert) {
  const supabase = await createClient()
  return supabase
    .from('campaigns')
    .insert(data)
    .select()
    .single()
}

export async function updateCampaign(id: string, data: CampaignUpdate) {
  const supabase = await createClient()
  return supabase
    .from('campaigns')
    .update(data)
    .eq('id', id)
    .select()
    .single()
}

export async function softDeleteCampaign(id: string) {
  const supabase = await createClient()
  return supabase
    .from('campaigns')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
}

// =====================================================
// CAMPAIGN COMPETITORS
// =====================================================

export async function getAllCampaignCompetitors(orgId: string, campaignId: string) {
  const supabase = await createClient()
  return supabase
    .from('campaign_competitors')
    .select(`
      *,
      companies:company_id(name, estimated_revenue, employee_count)
    `)
    .eq('organization_id', orgId)
    .eq('campaign_id', campaignId)
    .order('threat_level')
}

export async function createCampaignCompetitor(data: CampaignCompetitorInsert) {
  const supabase = await createClient()
  return supabase
    .from('campaign_competitors')
    .insert(data)
    .select()
    .single()
}

// =====================================================
// ACTIVITIES
// =====================================================

export async function getAllActivities(orgId: string, filters?: {
  campaign_id?: string
  status?: string
  scheduled_date_from?: string
  scheduled_date_to?: string
}) {
  const supabase = await createClient()
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

  return query.order('scheduled_date')
}

export async function getActivityById(id: string) {
  const supabase = await createClient()
  return supabase
    .from('activities')
    .select(`
      *,
      campaigns:campaign_id(name),
      contacts:contact_id(first_name, last_name),
      playbook_steps:playbook_step_id(title)
    `)
    .eq('id', id)
    .single()
}

export async function createActivity(data: ActivityInsert) {
  const supabase = await createClient()
  return supabase
    .from('activities')
    .insert(data)
    .select()
    .single()
}

export async function updateActivity(id: string, data: ActivityUpdate) {
  const supabase = await createClient()
  return supabase
    .from('activities')
    .update(data)
    .eq('id', id)
    .select()
    .single()
}

// =====================================================
// ASSETS
// =====================================================

export async function getAllAssets(orgId: string, filters?: {
  campaign_id?: string
  company_id?: string
  asset_type?: string
}) {
  const supabase = await createClient()
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

  return query.order('created_at', { ascending: false })
}

export async function getAssetById(id: string) {
  const supabase = await createClient()
  return supabase
    .from('assets')
    .select(`
      *,
      campaigns:campaign_id(name),
      companies:company_id(name)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()
}

export async function createAsset(data: AssetInsert) {
  const supabase = await createClient()
  return supabase
    .from('assets')
    .insert(data)
    .select()
    .single()
}

export async function updateAsset(id: string, data: AssetUpdate) {
  const supabase = await createClient()
  return supabase
    .from('assets')
    .update(data)
    .eq('id', id)
    .select()
    .single()
}

export async function softDeleteAsset(id: string) {
  const supabase = await createClient()
  return supabase
    .from('assets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
}

// =====================================================
// RESULTS
// =====================================================

export async function getAllResults(orgId: string, filters?: {
  campaign_id?: string
  result_type?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from('results')
    .select(`
      *,
      campaigns:campaign_id(name, companies:company_id(name))
    `)
    .eq('organization_id', orgId)

  if (filters?.campaign_id) query = query.eq('campaign_id', filters.campaign_id)
  if (filters?.result_type) query = query.eq('result_type', filters.result_type)

  return query.order('result_date', { ascending: false })
}

export async function getResultById(id: string) {
  const supabase = await createClient()
  return supabase
    .from('results')
    .select(`
      *,
      campaigns:campaign_id(name)
    `)
    .eq('id', id)
    .single()
}

export async function createResult(data: ResultInsert) {
  const supabase = await createClient()
  return supabase
    .from('results')
    .insert(data)
    .select()
    .single()
}

export async function updateResult(id: string, data: ResultUpdate) {
  const supabase = await createClient()
  return supabase
    .from('results')
    .update(data)
    .eq('id', id)
    .select()
    .single()
}