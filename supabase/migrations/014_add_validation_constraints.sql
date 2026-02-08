-- =====================================================
-- Migration 014: Add missing validation constraints
-- Adds CHECK constraints for numeric ranges, string lengths,
-- logical date ordering, and uniqueness where missing.
-- All constraints use IF NOT EXISTS or DROP/ADD pattern
-- to be safely re-runnable.
-- =====================================================

-- =====================================================
-- MARKETS
-- =====================================================

-- state: max 2 characters (US state codes)
ALTER TABLE markets ADD CONSTRAINT markets_state_length
  CHECK (char_length(state) <= 2);

-- metro_population: non-negative
ALTER TABLE markets ADD CONSTRAINT markets_metro_population_nonneg
  CHECK (metro_population >= 0);

-- market_size_estimate: non-negative
ALTER TABLE markets ADD CONSTRAINT markets_market_size_estimate_nonneg
  CHECK (market_size_estimate >= 0);


-- =====================================================
-- VERTICALS
-- =====================================================

-- revenue_floor: non-negative
ALTER TABLE verticals ADD CONSTRAINT verticals_revenue_floor_nonneg
  CHECK (revenue_floor >= 0);


-- =====================================================
-- PE_PLATFORMS
-- =====================================================

-- brand_count: non-negative
ALTER TABLE pe_platforms ADD CONSTRAINT pe_platforms_brand_count_nonneg
  CHECK (brand_count >= 0);

-- estimated_valuation: non-negative
ALTER TABLE pe_platforms ADD CONSTRAINT pe_platforms_estimated_valuation_nonneg
  CHECK (estimated_valuation >= 0);

-- Deduplicate pe_platforms before adding unique constraint:
-- Keep the oldest record (earliest created_at) for each (org, name) pair,
-- soft-delete the rest.
UPDATE pe_platforms SET deleted_at = now()
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY organization_id, name
             ORDER BY created_at ASC
           ) AS rn
    FROM pe_platforms
    WHERE deleted_at IS NULL
  ) ranked
  WHERE rn > 1
);

-- unique name within organization (only for non-deleted records)
CREATE UNIQUE INDEX pe_platforms_org_name_unique
  ON pe_platforms (organization_id, name)
  WHERE deleted_at IS NULL;


-- =====================================================
-- COMPANIES
-- =====================================================

-- estimated_revenue: non-negative
ALTER TABLE companies ADD CONSTRAINT companies_estimated_revenue_nonneg
  CHECK (estimated_revenue >= 0);

-- employee_count: non-negative
ALTER TABLE companies ADD CONSTRAINT companies_employee_count_nonneg
  CHECK (employee_count >= 0);

-- year_founded: reasonable range
ALTER TABLE companies ADD CONSTRAINT companies_year_founded_range
  CHECK (year_founded BETWEEN 1800 AND 2100);

-- state: max 2 characters
ALTER TABLE companies ADD CONSTRAINT companies_state_length
  CHECK (char_length(state) <= 2);


-- =====================================================
-- CONTACTS
-- =====================================================

-- unique email per company (partial index allows NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_company_email_unique
  ON contacts (company_id, email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;


-- =====================================================
-- DIGITAL_SNAPSHOTS
-- =====================================================

-- google_rating: 0-5
ALTER TABLE digital_snapshots ADD CONSTRAINT digital_snapshots_google_rating_range
  CHECK (google_rating BETWEEN 0 AND 5);

-- yelp_rating: 0-5
ALTER TABLE digital_snapshots ADD CONSTRAINT digital_snapshots_yelp_rating_range
  CHECK (yelp_rating BETWEEN 0 AND 5);

-- domain_authority: 0-100
ALTER TABLE digital_snapshots ADD CONSTRAINT digital_snapshots_domain_authority_range
  CHECK (domain_authority BETWEEN 0 AND 100);

-- google_review_count: non-negative
ALTER TABLE digital_snapshots ADD CONSTRAINT digital_snapshots_google_review_count_nonneg
  CHECK (google_review_count >= 0);

-- yelp_review_count: non-negative
ALTER TABLE digital_snapshots ADD CONSTRAINT digital_snapshots_yelp_review_count_nonneg
  CHECK (yelp_review_count >= 0);

-- follower counts: non-negative
ALTER TABLE digital_snapshots ADD CONSTRAINT digital_snapshots_facebook_followers_nonneg
  CHECK (facebook_followers >= 0);

ALTER TABLE digital_snapshots ADD CONSTRAINT digital_snapshots_instagram_followers_nonneg
  CHECK (instagram_followers >= 0);

ALTER TABLE digital_snapshots ADD CONSTRAINT digital_snapshots_linkedin_followers_nonneg
  CHECK (linkedin_followers >= 0);

-- organic metrics: non-negative
ALTER TABLE digital_snapshots ADD CONSTRAINT digital_snapshots_organic_keywords_nonneg
  CHECK (organic_keywords >= 0);

ALTER TABLE digital_snapshots ADD CONSTRAINT digital_snapshots_monthly_traffic_nonneg
  CHECK (monthly_organic_traffic_est >= 0);


-- =====================================================
-- PLAYBOOK_TEMPLATES
-- =====================================================

-- total_duration_days: positive when set
ALTER TABLE playbook_templates ADD CONSTRAINT playbook_templates_duration_positive
  CHECK (total_duration_days > 0);


-- =====================================================
-- PLAYBOOK_STEPS
-- =====================================================

-- step_number: positive
ALTER TABLE playbook_steps ADD CONSTRAINT playbook_steps_step_number_positive
  CHECK (step_number > 0);

-- day_offset: non-negative
ALTER TABLE playbook_steps ADD CONSTRAINT playbook_steps_day_offset_nonneg
  CHECK (day_offset >= 0);


-- =====================================================
-- CAMPAIGNS
-- =====================================================

-- current_step: non-negative
ALTER TABLE campaigns ADD CONSTRAINT campaigns_current_step_nonneg
  CHECK (current_step >= 0);

-- end_date must be on or after start_date
ALTER TABLE campaigns ADD CONSTRAINT campaigns_date_order
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);


-- =====================================================
-- RESULTS
-- =====================================================

-- contract_value_monthly: non-negative
ALTER TABLE results ADD CONSTRAINT results_contract_value_monthly_nonneg
  CHECK (contract_value_monthly >= 0);

-- contract_term_months: non-negative
ALTER TABLE results ADD CONSTRAINT results_contract_term_months_nonneg
  CHECK (contract_term_months >= 0);

-- total_contract_value: non-negative
ALTER TABLE results ADD CONSTRAINT results_total_contract_value_nonneg
  CHECK (total_contract_value >= 0);


-- =====================================================
-- DOCUMENT_TEMPLATES
-- =====================================================

-- version: positive
ALTER TABLE document_templates ADD CONSTRAINT document_templates_version_positive
  CHECK (version > 0);


-- =====================================================
-- GENERATED_DOCUMENTS
-- =====================================================

-- version: positive
ALTER TABLE generated_documents ADD CONSTRAINT generated_documents_version_positive
  CHECK (version > 0);


-- Migration complete
SELECT 'Migration 014: Validation constraints added successfully' as status;
