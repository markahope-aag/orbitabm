import { z } from 'zod'

// =====================================================
// SHARED BUILDING BLOCKS
// =====================================================

const uuid = z.string().uuid()
const shortText = z.string().min(1).max(255)
const longText = z.string().max(5000)
const optionalText = z.string().max(5000).nullable().optional()
const dateStr = z.string().datetime({ offset: true }).or(z.string().date())
const nonnegInt = z.number().int().nonnegative()
const nonnegNum = z.number().nonnegative()
const positiveInt = z.number().int().positive()

// =====================================================
// ENUM SCHEMAS
// =====================================================

const organizationTypeSchema = z.enum(['agency', 'client'])
const peActivityLevelSchema = z.enum(['none', 'low', 'moderate', 'high', 'critical'])
const b2bTypeSchema = z.enum(['B2B', 'B2C', 'Both'])
const verticalTierSchema = z.enum(['tier_1', 'tier_2', 'tier_3', 'borderline', 'eliminated'])
const ownershipTypeSchema = z.enum(['independent', 'pe_backed', 'franchise', 'corporate'])
const qualifyingTierSchema = z.enum(['top', 'qualified', 'borderline', 'excluded'])
const companyStatusSchema = z.enum(['prospect', 'target', 'active_campaign', 'client', 'lost', 'churned', 'excluded'])
const relationshipStatusSchema = z.enum(['unknown', 'identified', 'connected', 'engaged', 'responsive', 'meeting_held', 'client'])
const channelSchema = z.enum(['mail', 'email', 'linkedin', 'phone', 'in_person', 'other'])
const campaignStatusSchema = z.enum(['planned', 'active', 'paused', 'completed', 'won', 'lost', 'pivoted'])
const _threatLevelSchema = z.enum(['critical', 'high', 'medium', 'low'])
const activityTypeSchema = z.enum([
  'letter_sent', 'email_sent', 'linkedin_connect', 'linkedin_message',
  'linkedin_engagement', 'phone_call', 'meeting', 'audit_delivered',
  'report_delivered', 'landing_page_shared', 'breakup_note', 'proposal_sent', 'other',
])
const activityStatusSchema = z.enum(['scheduled', 'completed', 'skipped', 'overdue'])
const activityOutcomeSchema = z.enum([
  'no_response', 'opened', 'clicked', 'replied', 'meeting_booked',
  'declined', 'voicemail', 'conversation',
])
const assetTypeSchema = z.enum([
  'blueprint', 'website_audit', 'market_report', 'landing_page',
  'breakup_note', 'proposal', 'presentation', 'other',
])
const assetTypeRequiredSchema = z.enum([
  'blueprint', 'website_audit', 'market_report', 'landing_page',
  'breakup_note', 'proposal', 'none',
]).nullable().optional()
const assetStatusSchema = z.enum(['draft', 'ready', 'delivered', 'viewed'])
const resultTypeSchema = z.enum([
  'meeting_scheduled', 'proposal_sent', 'proposal_accepted', 'contract_signed',
  'contract_lost', 'no_response', 'declined', 'breakup_sent', 'referral_received', 'other',
])
const documentTypeSchema = z.enum(['prospect_research', 'campaign_sequence', 'competitive_analysis', 'audit_report', 'proposal'])
const documentStatusSchema = z.enum(['draft', 'in_review', 'approved', 'delivered', 'archived'])
const targetContactRoleSchema = z.enum(['economic_buyer', 'technical_buyer', 'brand_buyer', 'champion', 'any'])
const dmuRoleSchema = z.enum(['economic_buyer', 'technical_buyer', 'brand_buyer', 'champion', 'blocker', 'influencer', 'unknown'])

// =====================================================
// ENTITY SCHEMAS
// =====================================================

// --- Organizations ---
const createOrganizationFields = {
  name: shortText,
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  type: organizationTypeSchema,
  website: z.string().max(500).nullable().optional(),
  notes: optionalText,
}
export const createOrganizationSchema = z.object(createOrganizationFields).strict()
export const updateOrganizationSchema = z.object(createOrganizationFields).partial().strip()

// --- Markets ---
const createMarketFields = {
  organization_id: uuid,
  name: shortText,
  state: z.string().min(1).max(2),
  metro_population: nonnegInt.nullable().optional(),
  market_size_estimate: nonnegNum.nullable().optional(),
  pe_activity_level: peActivityLevelSchema.nullable().optional(),
  notes: optionalText,
}
export const createMarketSchema = z.object(createMarketFields).strict()
export const updateMarketSchema = z.object(createMarketFields).partial().strip()

// Markets import — passthrough allows extra CSV fields
const marketImportItemSchema = z.object({
  name: shortText,
  state: z.string().max(2).nullable().optional(),
  metro_population: z.union([z.number(), z.string()]).nullable().optional(),
  market_size_estimate: z.union([z.number(), z.string()]).nullable().optional(),
  pe_activity_level: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
}).passthrough()
export const importMarketsSchema = z.object({
  organization_id: uuid,
  data: z.array(marketImportItemSchema).min(1),
  mode: z.enum(['append', 'overwrite']).optional().default('append'),
}).strict()

// --- Verticals ---
const createVerticalFields = {
  organization_id: uuid,
  name: shortText,
  sector: z.string().max(255).nullable().optional(),
  b2b_b2c: b2bTypeSchema.nullable().optional(),
  naics_code: z.string().max(20).nullable().optional(),
  revenue_floor: nonnegNum.nullable().optional(),
  typical_revenue_range: z.string().max(255).nullable().optional(),
  typical_marketing_budget_pct: z.string().max(50).nullable().optional(),
  key_decision_maker_title: z.string().max(255).nullable().optional(),
  tier: verticalTierSchema.nullable().optional(),
  notes: optionalText,
}
export const createVerticalSchema = z.object(createVerticalFields).strict()
export const updateVerticalSchema = z.object(createVerticalFields).partial().strip()

// Verticals import
const verticalImportItemSchema = z.object({
  name: shortText,
  sector: z.string().max(255).nullable().optional(),
  b2b_b2c: z.string().nullable().optional(),
  naics_code: z.string().max(20).nullable().optional(),
  revenue_floor: z.union([z.number(), z.string()]).nullable().optional(),
  typical_revenue_range: z.string().max(255).nullable().optional(),
  typical_marketing_budget_pct: z.string().max(50).nullable().optional(),
  key_decision_maker_title: z.string().max(255).nullable().optional(),
  tier: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
}).passthrough()
export const importVerticalsSchema = z.object({
  organization_id: uuid,
  data: z.array(verticalImportItemSchema).min(1),
  mode: z.enum(['append', 'overwrite']).optional().default('append'),
}).strict()

// --- Companies ---
const createCompanyFields = {
  organization_id: uuid,
  name: shortText,
  market_id: uuid.nullable().optional(),
  vertical_id: uuid.nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  address_line1: z.string().max(255).nullable().optional(),
  address_line2: z.string().max(255).nullable().optional(),
  city: z.string().max(255).nullable().optional(),
  state: z.string().max(2).nullable().optional(),
  zip: z.string().max(20).nullable().optional(),
  estimated_revenue: nonnegNum.nullable().optional(),
  employee_count: nonnegInt.nullable().optional(),
  year_founded: z.number().int().min(1800).max(2100).nullable().optional(),
  ownership_type: ownershipTypeSchema.optional(),
  pe_platform_id: uuid.nullable().optional(),
  qualifying_tier: qualifyingTierSchema.nullable().optional(),
  status: companyStatusSchema.optional(),
  manufacturer_affiliations: optionalText,
  certifications: optionalText,
  awards: optionalText,
  readiness_score: z.number().min(0).max(10).nullable().optional(),
  last_researched_at: dateStr.nullable().optional(),
  notes: optionalText,
}
export const createCompanySchema = z.object(createCompanyFields).strict()
export const updateCompanySchema = z.object(createCompanyFields).partial().strip()

// Companies import — passthrough allows extra CSV fields (market, vertical, etc.)
const companyImportItemSchema = z.object({
  name: shortText,
  market_id: uuid.nullable().optional(),
  vertical_id: uuid.nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  address_line1: z.string().max(255).nullable().optional(),
  address_line2: z.string().max(255).nullable().optional(),
  city: z.string().max(255).nullable().optional(),
  state: z.string().max(2).nullable().optional(),
  zip: z.string().max(20).nullable().optional(),
  estimated_revenue: z.union([z.number(), z.string()]).nullable().optional(),
  employee_count: z.union([z.number(), z.string()]).nullable().optional(),
  year_founded: z.union([z.number(), z.string()]).nullable().optional(),
  ownership_type: z.string().nullable().optional(),
  qualifying_tier: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  manufacturer_affiliations: z.string().nullable().optional(),
  certifications: z.string().nullable().optional(),
  awards: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  market: z.string().nullable().optional(),
  vertical: z.string().nullable().optional(),
}).passthrough()
export const importCompaniesSchema = z.object({
  organization_id: uuid,
  data: z.array(companyImportItemSchema).min(1),
  mode: z.enum(['append', 'overwrite']).optional().default('append'),
}).strict()

// --- Contacts ---
const createContactFields = {
  organization_id: uuid,
  company_id: uuid,
  first_name: shortText,
  last_name: shortText,
  title: z.string().max(255).nullable().optional(),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  linkedin_url: z.string().url().max(500).nullable().optional(),
  is_primary: z.boolean().optional(),
  relationship_status: relationshipStatusSchema.nullable().optional(),
  dmu_role: dmuRoleSchema.nullable().optional(),
  email_verified: z.boolean().optional(),
  email_verification_date: dateStr.nullable().optional(),
  notes: optionalText,
}
export const createContactSchema = z.object(createContactFields).strict()
export const updateContactSchema = z.object(createContactFields).partial().strip()

// Contacts import
const contactImportItemSchema = z.object({
  first_name: shortText,
  last_name: shortText,
  company: z.string().nullable().optional(),
  title: z.string().max(255).nullable().optional(),
  email: z.string().max(255).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  linkedin_url: z.string().max(500).nullable().optional(),
  is_primary: z.union([z.boolean(), z.string()]).nullable().optional(),
  relationship_status: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
}).passthrough()
export const importContactsSchema = z.object({
  organization_id: uuid,
  data: z.array(contactImportItemSchema).min(1),
  mode: z.enum(['append', 'overwrite']).optional().default('append'),
}).strict()

// --- Campaigns ---
const createCampaignFields = {
  organization_id: uuid,
  name: shortText,
  company_id: uuid,
  playbook_template_id: uuid.nullable().optional(),
  market_id: uuid,
  vertical_id: uuid,
  status: campaignStatusSchema.optional(),
  start_date: dateStr.nullable().optional(),
  end_date: dateStr.nullable().optional(),
  current_step: nonnegInt.nullable().optional(),
  pivot_reason: optionalText,
  pivot_to_campaign_id: uuid.nullable().optional(),
  assigned_to: uuid.nullable().optional(),
  value_proposition: optionalText,
  primary_wedge: optionalText,
  backup_trigger: optionalText,
  success_criteria: optionalText,
  research_doc_id: uuid.nullable().optional(),
  sequence_doc_id: uuid.nullable().optional(),
  notes: optionalText,
}
export const createCampaignSchema = z.object(createCampaignFields).strict()
export const updateCampaignSchema = z.object(createCampaignFields).partial().strip()

// --- Activities ---
const createActivityFields = {
  organization_id: uuid,
  campaign_id: uuid,
  playbook_step_id: uuid.nullable().optional(),
  contact_id: uuid.nullable().optional(),
  activity_type: activityTypeSchema,
  channel: channelSchema.nullable().optional(),
  scheduled_date: dateStr.nullable().optional(),
  completed_date: dateStr.nullable().optional(),
  status: activityStatusSchema.optional(),
  outcome: activityOutcomeSchema.nullable().optional(),
  notes: optionalText,
}
export const createActivitySchema = z.object(createActivityFields).strict()
export const updateActivitySchema = z.object(createActivityFields).partial().strip()

// --- Assets ---
const createAssetFields = {
  organization_id: uuid,
  campaign_id: uuid.nullable().optional(),
  company_id: uuid.nullable().optional(),
  asset_type: assetTypeSchema,
  title: shortText,
  description: optionalText,
  file_url: z.string().max(1000).nullable().optional(),
  landing_page_url: z.string().max(1000).nullable().optional(),
  status: assetStatusSchema.optional(),
  delivered_date: dateStr.nullable().optional(),
}
export const createAssetSchema = z.object(createAssetFields).strict()
export const updateAssetSchema = z.object(createAssetFields).partial().strip()

// --- Results ---
const createResultFields = {
  organization_id: uuid,
  campaign_id: uuid,
  result_type: resultTypeSchema,
  result_date: dateStr,
  contract_value_monthly: nonnegNum.nullable().optional(),
  contract_term_months: nonnegInt.nullable().optional(),
  total_contract_value: nonnegNum.nullable().optional(),
  notes: optionalText,
}
export const createResultSchema = z.object(createResultFields).strict()
export const updateResultSchema = z.object(createResultFields).partial().strip()

// --- Playbook Templates ---
const createPlaybookTemplateFields = {
  organization_id: uuid,
  name: shortText,
  vertical_id: uuid.nullable().optional(),
  description: optionalText,
  total_duration_days: positiveInt.nullable().optional(),
  is_active: z.boolean().optional(),
}
export const createPlaybookTemplateSchema = z.object(createPlaybookTemplateFields).strict()
export const updatePlaybookTemplateSchema = z.object(createPlaybookTemplateFields).partial().strip()

// --- Playbook Steps ---
const createPlaybookStepFields = {
  organization_id: uuid,
  playbook_template_id: uuid,
  step_number: positiveInt,
  day_offset: nonnegInt,
  channel: channelSchema,
  title: shortText,
  description: optionalText,
  asset_type_required: assetTypeRequiredSchema,
  is_pivot_trigger: z.boolean().optional(),
}
export const createPlaybookStepSchema = z.object(createPlaybookStepFields).strict()
export const updatePlaybookStepSchema = z.object(createPlaybookStepFields).partial().strip()

// --- Digital Snapshots ---
const createDigitalSnapshotFields = {
  organization_id: uuid,
  company_id: uuid,
  snapshot_date: dateStr.optional(),
  google_rating: z.number().min(0).max(5).nullable().optional(),
  google_review_count: nonnegInt.nullable().optional(),
  yelp_rating: z.number().min(0).max(5).nullable().optional(),
  yelp_review_count: nonnegInt.nullable().optional(),
  bbb_rating: z.string().max(10).nullable().optional(),
  facebook_followers: nonnegInt.nullable().optional(),
  instagram_followers: nonnegInt.nullable().optional(),
  linkedin_followers: nonnegInt.nullable().optional(),
  domain_authority: z.number().min(0).max(100).nullable().optional(),
  page_speed_mobile: z.number().min(0).max(100).nullable().optional(),
  page_speed_desktop: z.number().min(0).max(100).nullable().optional(),
  organic_keywords: nonnegInt.nullable().optional(),
  monthly_organic_traffic_est: nonnegInt.nullable().optional(),
  website_has_ssl: z.boolean().nullable().optional(),
  website_is_mobile_responsive: z.boolean().nullable().optional(),
  has_online_booking: z.boolean().nullable().optional(),
  has_live_chat: z.boolean().nullable().optional(),
  has_blog: z.boolean().nullable().optional(),
  notes: optionalText,
}
export const createDigitalSnapshotSchema = z.object(createDigitalSnapshotFields).strict()
export const updateDigitalSnapshotSchema = z.object(createDigitalSnapshotFields).partial().strip()

// Digital snapshots import
const digitalSnapshotImportItemSchema = z.object({
  company: z.string(),
  snapshot_date: z.string().optional(),
  google_rating: z.union([z.number(), z.string()]).nullable().optional(),
  google_review_count: z.union([z.number(), z.string()]).nullable().optional(),
  yelp_rating: z.union([z.number(), z.string()]).nullable().optional(),
  yelp_review_count: z.union([z.number(), z.string()]).nullable().optional(),
  bbb_rating: z.string().max(10).nullable().optional(),
  facebook_followers: z.union([z.number(), z.string()]).nullable().optional(),
  instagram_followers: z.union([z.number(), z.string()]).nullable().optional(),
  linkedin_followers: z.union([z.number(), z.string()]).nullable().optional(),
  domain_authority: z.union([z.number(), z.string()]).nullable().optional(),
  page_speed_mobile: z.union([z.number(), z.string()]).nullable().optional(),
  page_speed_desktop: z.union([z.number(), z.string()]).nullable().optional(),
  organic_keywords: z.union([z.number(), z.string()]).nullable().optional(),
  monthly_organic_traffic_est: z.union([z.number(), z.string()]).nullable().optional(),
  has_blog: z.union([z.boolean(), z.string()]).nullable().optional(),
  has_online_booking: z.union([z.boolean(), z.string()]).nullable().optional(),
  has_live_chat: z.union([z.boolean(), z.string()]).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
}).passthrough()
export const importDigitalSnapshotsSchema = z.object({
  organization_id: uuid,
  data: z.array(digitalSnapshotImportItemSchema).min(1),
  mode: z.enum(['append', 'overwrite']).optional().default('append'),
}).strict()

// --- Email Templates ---
const createEmailTemplateFields = {
  organization_id: uuid,
  playbook_step_id: uuid.nullable().optional(),
  campaign_id: uuid.nullable().optional(),
  name: shortText,
  subject_line: shortText,
  subject_line_alt: z.string().max(255).nullable().optional(),
  body: longText,
  target_contact_role: targetContactRoleSchema.nullable().optional(),
  merge_fields_required: z.array(z.string().max(100)).nullable().optional(),
  notes: optionalText,
}
export const createEmailTemplateSchema = z.object(createEmailTemplateFields).strict()
export const updateEmailTemplateSchema = z.object(createEmailTemplateFields).partial().strip()

// --- Document Templates ---
const createDocumentTemplateFields = {
  organization_id: uuid,
  name: shortText,
  document_type: documentTypeSchema,
  vertical_id: uuid.nullable().optional(),
  template_structure: z.record(z.string(), z.unknown()),
  version: positiveInt.optional(),
  is_active: z.boolean().optional(),
}
export const createDocumentTemplateSchema = z.object(createDocumentTemplateFields).strict()
export const updateDocumentTemplateSchema = z.object(createDocumentTemplateFields).partial().strip()

// --- Generated Documents ---
const createGeneratedDocumentFields = {
  organization_id: uuid,
  document_template_id: uuid.nullable().optional(),
  company_id: uuid.nullable().optional(),
  campaign_id: uuid.nullable().optional(),
  title: shortText,
  document_type: documentTypeSchema,
  status: documentStatusSchema.optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  readiness_score: z.number().min(0).max(10).nullable().optional(),
  version: positiveInt.optional(),
  approved_by: uuid.nullable().optional(),
  approved_at: dateStr.nullable().optional(),
  last_generated_at: dateStr.nullable().optional(),
}
export const createGeneratedDocumentSchema = z.object(createGeneratedDocumentFields).strict()
export const updateGeneratedDocumentSchema = z.object(createGeneratedDocumentFields).partial().strip()
