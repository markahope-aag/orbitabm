// OrbitABM Database Types
// Generated from database schema - matches Supabase generated types pattern

// =====================================================
// ENUM-LIKE UNION TYPES
// =====================================================

export type OrganizationType = 'agency' | 'client'
export type UserRole = 'admin' | 'manager' | 'viewer'
export type PEActivityLevel = 'none' | 'low' | 'moderate' | 'high' | 'critical'
export type B2BType = 'B2B' | 'B2C' | 'Both'
export type VerticalTier = 'tier_1' | 'tier_2' | 'tier_3' | 'borderline' | 'eliminated'
export type OwnershipType = 'independent' | 'pe_backed' | 'franchise' | 'corporate'
export type QualifyingTier = 'top' | 'qualified' | 'borderline' | 'excluded'
export type CompanyStatus = 'prospect' | 'target' | 'active_campaign' | 'client' | 'lost' | 'churned' | 'excluded'
export type RelationshipStatus = 'unknown' | 'identified' | 'connected' | 'engaged' | 'responsive' | 'meeting_held' | 'client'
export type Channel = 'mail' | 'email' | 'linkedin' | 'phone' | 'in_person' | 'other'
export type AssetTypeRequired = 'blueprint' | 'website_audit' | 'market_report' | 'landing_page' | 'breakup_note' | 'proposal' | 'none' | null
export type CampaignStatus = 'planned' | 'active' | 'paused' | 'completed' | 'won' | 'lost' | 'pivoted'
export type ThreatLevel = 'critical' | 'high' | 'medium' | 'low'
export type ActivityType = 'letter_sent' | 'email_sent' | 'linkedin_connect' | 'linkedin_message' | 'linkedin_engagement' | 'phone_call' | 'meeting' | 'audit_delivered' | 'report_delivered' | 'landing_page_shared' | 'breakup_note' | 'proposal_sent' | 'other'
export type ActivityStatus = 'scheduled' | 'completed' | 'skipped' | 'overdue'
export type ActivityOutcome = 'no_response' | 'opened' | 'clicked' | 'replied' | 'meeting_booked' | 'declined' | 'voicemail' | 'conversation' | null
export type AssetType = 'blueprint' | 'website_audit' | 'market_report' | 'landing_page' | 'breakup_note' | 'proposal' | 'presentation' | 'other'
export type AssetStatus = 'draft' | 'ready' | 'delivered' | 'viewed'
export type ResultType = 'meeting_scheduled' | 'proposal_sent' | 'proposal_accepted' | 'contract_signed' | 'contract_lost' | 'no_response' | 'declined' | 'breakup_sent' | 'referral_received' | 'other'

// Audit types
export type AuditAction = 'create' | 'update' | 'delete'
export type AuditEntityType =
  | 'organization'
  | 'market'
  | 'vertical'
  | 'company'
  | 'contact'
  | 'campaign'
  | 'activity'
  | 'asset'
  | 'result'
  | 'playbook_template'
  | 'playbook_step'
  | 'digital_snapshot'
  | 'email_template'
  | 'document_template'
  | 'generated_document'

// Document Intelligence types
export type DocumentType = 'prospect_research' | 'campaign_sequence' | 'competitive_analysis' | 'audit_report' | 'proposal'
export type DocumentStatus = 'draft' | 'in_review' | 'approved' | 'delivered' | 'archived'
export type TargetContactRole = 'economic_buyer' | 'technical_buyer' | 'brand_buyer' | 'champion' | 'any'
export type DMURole = 'economic_buyer' | 'technical_buyer' | 'brand_buyer' | 'champion' | 'blocker' | 'influencer' | 'unknown'

// =====================================================
// TABLE TYPES
// =====================================================

// Organizations
export interface OrganizationRow {
  id: string
  name: string
  slug: string
  type: OrganizationType
  website: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface OrganizationInsert {
  id?: string
  name: string
  slug: string
  type: OrganizationType
  website?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface OrganizationUpdate {
  id?: string
  name?: string
  slug?: string
  type?: OrganizationType
  website?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

// Profiles
export interface ProfileRow {
  id: string
  organization_id: string
  role: UserRole
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id: string
  organization_id: string
  role?: UserRole
  full_name?: string | null
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProfileUpdate {
  id?: string
  organization_id?: string
  role?: UserRole
  full_name?: string | null
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
}

// Markets
export interface MarketRow {
  id: string
  organization_id: string
  name: string
  state: string
  metro_population: number | null
  market_size_estimate: number | null
  pe_activity_level: PEActivityLevel | null
  name_normalized: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface MarketInsert {
  id?: string
  organization_id: string
  name: string
  state: string
  metro_population?: number | null
  market_size_estimate?: number | null
  pe_activity_level?: PEActivityLevel | null
  name_normalized?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface MarketUpdate {
  id?: string
  organization_id?: string
  name?: string
  state?: string
  metro_population?: number | null
  market_size_estimate?: number | null
  pe_activity_level?: PEActivityLevel | null
  name_normalized?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

// Verticals
export interface VerticalRow {
  id: string
  organization_id: string
  name: string
  sector: string | null
  b2b_b2c: B2BType | null
  naics_code: string | null
  revenue_floor: number | null
  typical_revenue_range: string | null
  typical_marketing_budget_pct: string | null
  key_decision_maker_title: string | null
  tier: VerticalTier | null
  name_normalized: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface VerticalInsert {
  id?: string
  organization_id: string
  name: string
  sector?: string | null
  b2b_b2c?: B2BType | null
  naics_code?: string | null
  revenue_floor?: number | null
  typical_revenue_range?: string | null
  typical_marketing_budget_pct?: string | null
  key_decision_maker_title?: string | null
  tier?: VerticalTier | null
  name_normalized?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface VerticalUpdate {
  id?: string
  organization_id?: string
  name?: string
  sector?: string | null
  b2b_b2c?: B2BType | null
  naics_code?: string | null
  revenue_floor?: number | null
  typical_revenue_range?: string | null
  typical_marketing_budget_pct?: string | null
  key_decision_maker_title?: string | null
  tier?: VerticalTier | null
  name_normalized?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

// PE Platforms
export interface PEPlatformRow {
  id: string
  organization_id: string
  name: string
  parent_firm: string | null
  estimated_valuation: number | null
  brand_count: number | null
  headquarters: string | null
  website: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PEPlatformInsert {
  id?: string
  organization_id: string
  name: string
  parent_firm?: string | null
  estimated_valuation?: number | null
  brand_count?: number | null
  headquarters?: string | null
  website?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface PEPlatformUpdate {
  id?: string
  organization_id?: string
  name?: string
  parent_firm?: string | null
  estimated_valuation?: number | null
  brand_count?: number | null
  headquarters?: string | null
  website?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

// Companies
export interface CompanyRow {
  id: string
  organization_id: string
  name: string
  market_id: string | null
  vertical_id: string | null
  website: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  estimated_revenue: number | null
  employee_count: number | null
  year_founded: number | null
  ownership_type: OwnershipType
  pe_platform_id: string | null
  qualifying_tier: QualifyingTier | null
  status: CompanyStatus
  manufacturer_affiliations: string | null
  certifications: string | null
  awards: string | null
  readiness_score: number | null
  last_researched_at: string | null
  domain: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CompanyInsert {
  id?: string
  organization_id: string
  name: string
  market_id?: string | null
  vertical_id?: string | null
  website?: string | null
  domain?: string | null
  phone?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  estimated_revenue?: number | null
  employee_count?: number | null
  year_founded?: number | null
  ownership_type?: OwnershipType
  pe_platform_id?: string | null
  qualifying_tier?: QualifyingTier | null
  status?: CompanyStatus
  manufacturer_affiliations?: string | null
  certifications?: string | null
  awards?: string | null
  readiness_score?: number | null
  last_researched_at?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CompanyUpdate {
  id?: string
  organization_id?: string
  name?: string
  market_id?: string | null
  vertical_id?: string | null
  website?: string | null
  domain?: string | null
  phone?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  estimated_revenue?: number | null
  employee_count?: number | null
  year_founded?: number | null
  ownership_type?: OwnershipType
  pe_platform_id?: string | null
  qualifying_tier?: QualifyingTier | null
  status?: CompanyStatus
  manufacturer_affiliations?: string | null
  certifications?: string | null
  awards?: string | null
  readiness_score?: number | null
  last_researched_at?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

// Contacts
export interface ContactRow {
  id: string
  organization_id: string
  company_id: string
  first_name: string
  last_name: string
  title: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  is_primary: boolean
  relationship_status: RelationshipStatus | null
  dmu_role: DMURole | null
  email_verified: boolean
  email_verification_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ContactInsert {
  id?: string
  organization_id: string
  company_id: string
  first_name: string
  last_name: string
  title?: string | null
  email?: string | null
  phone?: string | null
  linkedin_url?: string | null
  is_primary?: boolean
  relationship_status?: RelationshipStatus | null
  dmu_role?: DMURole | null
  email_verified?: boolean
  email_verification_date?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface ContactUpdate {
  id?: string
  organization_id?: string
  company_id?: string
  first_name?: string
  last_name?: string
  title?: string | null
  email?: string | null
  phone?: string | null
  linkedin_url?: string | null
  is_primary?: boolean
  relationship_status?: RelationshipStatus | null
  dmu_role?: DMURole | null
  email_verified?: boolean
  email_verification_date?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

// PE Acquisitions
export interface PEAcquisitionRow {
  id: string
  organization_id: string
  pe_platform_id: string
  company_id: string
  acquisition_date: string | null
  source_url: string | null
  notes: string | null
  created_at: string
}

export interface PEAcquisitionInsert {
  id?: string
  organization_id: string
  pe_platform_id: string
  company_id: string
  acquisition_date?: string | null
  source_url?: string | null
  notes?: string | null
  created_at?: string
}

export interface PEAcquisitionUpdate {
  id?: string
  organization_id?: string
  pe_platform_id?: string
  company_id?: string
  acquisition_date?: string | null
  source_url?: string | null
  notes?: string | null
  created_at?: string
}

// Digital Snapshots
export interface DigitalSnapshotRow {
  id: string
  organization_id: string
  company_id: string
  snapshot_date: string
  google_rating: number | null
  google_review_count: number | null
  yelp_rating: number | null
  yelp_review_count: number | null
  bbb_rating: string | null
  facebook_followers: number | null
  instagram_followers: number | null
  linkedin_followers: number | null
  domain_authority: number | null
  page_speed_mobile: number | null
  page_speed_desktop: number | null
  organic_keywords: number | null
  monthly_organic_traffic_est: number | null
  website_has_ssl: boolean | null
  website_is_mobile_responsive: boolean | null
  has_online_booking: boolean | null
  has_live_chat: boolean | null
  has_blog: boolean | null
  notes: string | null
  created_at: string
}

export interface DigitalSnapshotInsert {
  id?: string
  organization_id: string
  company_id: string
  snapshot_date?: string
  google_rating?: number | null
  google_review_count?: number | null
  yelp_rating?: number | null
  yelp_review_count?: number | null
  bbb_rating?: string | null
  facebook_followers?: number | null
  instagram_followers?: number | null
  linkedin_followers?: number | null
  domain_authority?: number | null
  page_speed_mobile?: number | null
  page_speed_desktop?: number | null
  organic_keywords?: number | null
  monthly_organic_traffic_est?: number | null
  website_has_ssl?: boolean | null
  website_is_mobile_responsive?: boolean | null
  has_online_booking?: boolean | null
  has_live_chat?: boolean | null
  has_blog?: boolean | null
  notes?: string | null
  created_at?: string
}

export interface DigitalSnapshotUpdate {
  id?: string
  organization_id?: string
  company_id?: string
  snapshot_date?: string
  google_rating?: number | null
  google_review_count?: number | null
  yelp_rating?: number | null
  yelp_review_count?: number | null
  bbb_rating?: string | null
  facebook_followers?: number | null
  instagram_followers?: number | null
  linkedin_followers?: number | null
  domain_authority?: number | null
  page_speed_mobile?: number | null
  page_speed_desktop?: number | null
  organic_keywords?: number | null
  monthly_organic_traffic_est?: number | null
  website_has_ssl?: boolean | null
  website_is_mobile_responsive?: boolean | null
  has_online_booking?: boolean | null
  has_live_chat?: boolean | null
  has_blog?: boolean | null
  notes?: string | null
  created_at?: string
}

// Playbook Templates
export interface PlaybookTemplateRow {
  id: string
  organization_id: string
  name: string
  vertical_id: string | null
  description: string | null
  total_duration_days: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PlaybookTemplateInsert {
  id?: string
  organization_id: string
  name: string
  vertical_id?: string | null
  description?: string | null
  total_duration_days?: number | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface PlaybookTemplateUpdate {
  id?: string
  organization_id?: string
  name?: string
  vertical_id?: string | null
  description?: string | null
  total_duration_days?: number | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

// Playbook Steps
export interface PlaybookStepRow {
  id: string
  organization_id: string
  playbook_template_id: string
  step_number: number
  day_offset: number
  channel: Channel
  title: string
  description: string | null
  asset_type_required: AssetTypeRequired
  is_pivot_trigger: boolean
  created_at: string
  updated_at: string
}

export interface PlaybookStepInsert {
  id?: string
  organization_id: string
  playbook_template_id: string
  step_number: number
  day_offset: number
  channel: Channel
  title: string
  description?: string | null
  asset_type_required?: AssetTypeRequired
  is_pivot_trigger?: boolean
  created_at?: string
  updated_at?: string
}

export interface PlaybookStepUpdate {
  id?: string
  organization_id?: string
  playbook_template_id?: string
  step_number?: number
  day_offset?: number
  channel?: Channel
  title?: string
  description?: string | null
  asset_type_required?: AssetTypeRequired
  is_pivot_trigger?: boolean
  created_at?: string
  updated_at?: string
}

// Campaigns
export interface CampaignRow {
  id: string
  organization_id: string
  name: string
  company_id: string
  playbook_template_id: string | null
  market_id: string
  vertical_id: string
  status: CampaignStatus
  start_date: string | null
  end_date: string | null
  current_step: number | null
  pivot_reason: string | null
  pivot_to_campaign_id: string | null
  assigned_to: string | null
  value_proposition: string | null
  primary_wedge: string | null
  backup_trigger: string | null
  success_criteria: string | null
  research_doc_id: string | null
  sequence_doc_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CampaignInsert {
  id?: string
  organization_id: string
  name: string
  company_id: string
  playbook_template_id?: string | null
  market_id: string
  vertical_id: string
  status?: CampaignStatus
  start_date?: string | null
  end_date?: string | null
  current_step?: number | null
  pivot_reason?: string | null
  pivot_to_campaign_id?: string | null
  assigned_to?: string | null
  value_proposition?: string | null
  primary_wedge?: string | null
  backup_trigger?: string | null
  success_criteria?: string | null
  research_doc_id?: string | null
  sequence_doc_id?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CampaignUpdate {
  id?: string
  organization_id?: string
  name?: string
  company_id?: string
  playbook_template_id?: string | null
  market_id?: string
  vertical_id?: string
  status?: CampaignStatus
  start_date?: string | null
  end_date?: string | null
  current_step?: number | null
  pivot_reason?: string | null
  pivot_to_campaign_id?: string | null
  assigned_to?: string | null
  value_proposition?: string | null
  primary_wedge?: string | null
  backup_trigger?: string | null
  success_criteria?: string | null
  research_doc_id?: string | null
  sequence_doc_id?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

// Campaign Competitors
export interface CampaignCompetitorRow {
  id: string
  organization_id: string
  campaign_id: string
  company_id: string
  threat_level: ThreatLevel | null
  notes: string | null
  created_at: string
}

export interface CampaignCompetitorInsert {
  id?: string
  organization_id: string
  campaign_id: string
  company_id: string
  threat_level?: ThreatLevel | null
  notes?: string | null
  created_at?: string
}

export interface CampaignCompetitorUpdate {
  id?: string
  organization_id?: string
  campaign_id?: string
  company_id?: string
  threat_level?: ThreatLevel | null
  notes?: string | null
  created_at?: string
}

// Activities
export interface ActivityRow {
  id: string
  organization_id: string
  campaign_id: string
  playbook_step_id: string | null
  contact_id: string | null
  activity_type: ActivityType
  channel: Channel | null
  scheduled_date: string | null
  completed_date: string | null
  status: ActivityStatus
  outcome: ActivityOutcome
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ActivityInsert {
  id?: string
  organization_id: string
  campaign_id: string
  playbook_step_id?: string | null
  contact_id?: string | null
  activity_type: ActivityType
  channel?: Channel | null
  scheduled_date?: string | null
  completed_date?: string | null
  status?: ActivityStatus
  outcome?: ActivityOutcome
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface ActivityUpdate {
  id?: string
  organization_id?: string
  campaign_id?: string
  playbook_step_id?: string | null
  contact_id?: string | null
  activity_type?: ActivityType
  channel?: Channel | null
  scheduled_date?: string | null
  completed_date?: string | null
  status?: ActivityStatus
  outcome?: ActivityOutcome
  notes?: string | null
  created_at?: string
  updated_at?: string
}

// Assets
export interface AssetRow {
  id: string
  organization_id: string
  campaign_id: string | null
  company_id: string | null
  asset_type: AssetType
  title: string
  description: string | null
  file_url: string | null
  landing_page_url: string | null
  status: AssetStatus
  delivered_date: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface AssetInsert {
  id?: string
  organization_id: string
  campaign_id?: string | null
  company_id?: string | null
  asset_type: AssetType
  title: string
  description?: string | null
  file_url?: string | null
  landing_page_url?: string | null
  status?: AssetStatus
  delivered_date?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface AssetUpdate {
  id?: string
  organization_id?: string
  campaign_id?: string | null
  company_id?: string | null
  asset_type?: AssetType
  title?: string
  description?: string | null
  file_url?: string | null
  landing_page_url?: string | null
  status?: AssetStatus
  delivered_date?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

// Results
export interface ResultRow {
  id: string
  organization_id: string
  campaign_id: string
  result_type: ResultType
  result_date: string
  contract_value_monthly: number | null
  contract_term_months: number | null
  total_contract_value: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ResultInsert {
  id?: string
  organization_id: string
  campaign_id: string
  result_type: ResultType
  result_date: string
  contract_value_monthly?: number | null
  contract_term_months?: number | null
  total_contract_value?: number | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface ResultUpdate {
  id?: string
  organization_id?: string
  campaign_id?: string
  result_type?: ResultType
  result_date?: string
  contract_value_monthly?: number | null
  contract_term_months?: number | null
  total_contract_value?: number | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

// =====================================================
// DOCUMENT INTELLIGENCE TABLES
// =====================================================

// Document Templates
export interface DocumentTemplateRow {
  id: string
  organization_id: string
  name: string
  document_type: DocumentType
  vertical_id: string | null
  template_structure: Record<string, unknown>
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface DocumentTemplateInsert {
  id?: string
  organization_id: string
  name: string
  document_type: DocumentType
  vertical_id?: string | null
  template_structure: Record<string, unknown>
  version?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface DocumentTemplateUpdate {
  id?: string
  organization_id?: string
  name?: string
  document_type?: DocumentType
  vertical_id?: string | null
  template_structure?: Record<string, unknown>
  version?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

// Generated Documents
export interface GeneratedDocumentRow {
  id: string
  organization_id: string
  document_template_id: string | null
  company_id: string | null
  campaign_id: string | null
  title: string
  document_type: DocumentType
  status: DocumentStatus
  content: Record<string, unknown>
  readiness_score: number | null
  version: number
  approved_by: string | null
  approved_at: string | null
  last_generated_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface GeneratedDocumentInsert {
  id?: string
  organization_id: string
  document_template_id?: string | null
  company_id?: string | null
  campaign_id?: string | null
  title: string
  document_type: DocumentType
  status?: DocumentStatus
  content?: Record<string, unknown>
  readiness_score?: number | null
  version?: number
  approved_by?: string | null
  approved_at?: string | null
  last_generated_at?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface GeneratedDocumentUpdate {
  id?: string
  organization_id?: string
  document_template_id?: string | null
  company_id?: string | null
  campaign_id?: string | null
  title?: string
  document_type?: DocumentType
  status?: DocumentStatus
  content?: Record<string, unknown>
  readiness_score?: number | null
  version?: number
  approved_by?: string | null
  approved_at?: string | null
  last_generated_at?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

// Email Templates
export interface EmailTemplateRow {
  id: string
  organization_id: string
  playbook_step_id: string | null
  campaign_id: string | null
  name: string
  subject_line: string
  subject_line_alt: string | null
  body: string
  target_contact_role: TargetContactRole | null
  merge_fields_required: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EmailTemplateInsert {
  id?: string
  organization_id: string
  playbook_step_id?: string | null
  campaign_id?: string | null
  name: string
  subject_line: string
  subject_line_alt?: string | null
  body: string
  target_contact_role?: TargetContactRole | null
  merge_fields_required?: string[] | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface EmailTemplateUpdate {
  id?: string
  organization_id?: string
  playbook_step_id?: string | null
  campaign_id?: string | null
  name?: string
  subject_line?: string
  subject_line_alt?: string | null
  body?: string
  target_contact_role?: TargetContactRole | null
  merge_fields_required?: string[] | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

// Audit Logs
export interface AuditLogRow {
  id: string
  organization_id: string | null
  entity_type: AuditEntityType
  entity_id: string
  action: AuditAction
  user_id: string | null
  user_email: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  changed_fields: string[] | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface AuditLogInsert {
  id?: string
  organization_id?: string | null
  entity_type: AuditEntityType
  entity_id: string
  action: AuditAction
  user_id?: string | null
  user_email?: string | null
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  changed_fields?: string[] | null
  ip_address?: string | null
  user_agent?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string
}

// =====================================================
// DATABASE TYPE MAP
// =====================================================

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationRow
        Insert: OrganizationInsert
        Update: OrganizationUpdate
      }
      profiles: {
        Row: ProfileRow
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      markets: {
        Row: MarketRow
        Insert: MarketInsert
        Update: MarketUpdate
      }
      verticals: {
        Row: VerticalRow
        Insert: VerticalInsert
        Update: VerticalUpdate
      }
      pe_platforms: {
        Row: PEPlatformRow
        Insert: PEPlatformInsert
        Update: PEPlatformUpdate
      }
      companies: {
        Row: CompanyRow
        Insert: CompanyInsert
        Update: CompanyUpdate
      }
      contacts: {
        Row: ContactRow
        Insert: ContactInsert
        Update: ContactUpdate
      }
      pe_acquisitions: {
        Row: PEAcquisitionRow
        Insert: PEAcquisitionInsert
        Update: PEAcquisitionUpdate
      }
      digital_snapshots: {
        Row: DigitalSnapshotRow
        Insert: DigitalSnapshotInsert
        Update: DigitalSnapshotUpdate
      }
      playbook_templates: {
        Row: PlaybookTemplateRow
        Insert: PlaybookTemplateInsert
        Update: PlaybookTemplateUpdate
      }
      playbook_steps: {
        Row: PlaybookStepRow
        Insert: PlaybookStepInsert
        Update: PlaybookStepUpdate
      }
      campaigns: {
        Row: CampaignRow
        Insert: CampaignInsert
        Update: CampaignUpdate
      }
      campaign_competitors: {
        Row: CampaignCompetitorRow
        Insert: CampaignCompetitorInsert
        Update: CampaignCompetitorUpdate
      }
      activities: {
        Row: ActivityRow
        Insert: ActivityInsert
        Update: ActivityUpdate
      }
      assets: {
        Row: AssetRow
        Insert: AssetInsert
        Update: AssetUpdate
      }
      results: {
        Row: ResultRow
        Insert: ResultInsert
        Update: ResultUpdate
      }
      document_templates: {
        Row: DocumentTemplateRow
        Insert: DocumentTemplateInsert
        Update: DocumentTemplateUpdate
      }
      generated_documents: {
        Row: GeneratedDocumentRow
        Insert: GeneratedDocumentInsert
        Update: GeneratedDocumentUpdate
      }
      email_templates: {
        Row: EmailTemplateRow
        Insert: EmailTemplateInsert
        Update: EmailTemplateUpdate
      }
      audit_logs: {
        Row: AuditLogRow
        Insert: AuditLogInsert
        Update: never
      }
    }
    Views: {
      active_campaigns_summary: {
        Row: {
          id: string
          campaign_name: string
          status: CampaignStatus
          start_date: string | null
          current_step: number | null
          assigned_to: string | null
          company_name: string
          company_website: string | null
          estimated_revenue: number | null
          market_name: string
          market_state: string
          vertical_name: string
          playbook_name: string | null
          total_duration_days: number | null
          assigned_to_name: string | null
          created_at: string
          updated_at: string
        }
      }
      company_latest_snapshot: {
        Row: DigitalSnapshotRow & {
          company_name: string
        }
      }
    }
  }
}