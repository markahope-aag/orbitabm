-- =====================================================
-- ABM IMPORT FIELDS
-- Adds columns needed for the ABM Factory → OrbitABM
-- import pipeline: enrichment tracking, CRM IDs,
-- and firmographic fields from ZoomInfo/campaign sheets.
-- =====================================================

-- ── Companies ─────────────────────────────────────────

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS sub_industry text,
  ADD COLUMN IF NOT EXISTS revenue_range text,
  ADD COLUMN IF NOT EXISTS current_vendor text,
  ADD COLUMN IF NOT EXISTS hubspot_company_id text;

COMMENT ON COLUMN companies.sub_industry IS 'Sub-industry from ZoomInfo or manual classification';
COMMENT ON COLUMN companies.revenue_range IS 'Text revenue range from ZoomInfo (e.g. "$10M-$50M")';
COMMENT ON COLUMN companies.current_vendor IS 'Current vendor/competitor for displacement campaigns';
COMMENT ON COLUMN companies.hubspot_company_id IS 'HubSpot CRM company ID for writeback';

-- ── Contacts ──────────────────────────────────────────

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS email_source text,
  ADD COLUMN IF NOT EXISTS persona text,
  ADD COLUMN IF NOT EXISTS priority text CHECK (priority IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS buying_role text,
  ADD COLUMN IF NOT EXISTS enrich_status text DEFAULT 'not_started'
    CHECK (enrich_status IN ('not_started', 'email_found', 'verified', 'no_email', 'skip')),
  ADD COLUMN IF NOT EXISTS hubspot_contact_id text;

COMMENT ON COLUMN contacts.department IS 'Department (Operations, Finance, IT, etc.)';
COMMENT ON COLUMN contacts.email_source IS 'How email was found (Hunter, ZoomInfo, Apollo, Manual, etc.)';
COMMENT ON COLUMN contacts.persona IS 'Buyer persona type from strategy doc';
COMMENT ON COLUMN contacts.priority IS 'Contact priority: high, medium, low';
COMMENT ON COLUMN contacts.buying_role IS 'Buying committee role from strategy doc (may overlap with dmu_role)';
COMMENT ON COLUMN contacts.enrich_status IS 'Enrichment workflow status: not_started, email_found, verified, no_email, skip';
COMMENT ON COLUMN contacts.hubspot_contact_id IS 'HubSpot CRM contact ID for writeback';

CREATE INDEX IF NOT EXISTS idx_contacts_enrich_status ON contacts(enrich_status);
CREATE INDEX IF NOT EXISTS idx_contacts_priority ON contacts(priority);

-- ── Email Templates ───────────────────────────────────

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS cta_type text;

COMMENT ON COLUMN email_templates.cta_type IS 'CTA type: meeting_request, value_offer, case_study, demo, content, breakup, etc.';

-- Migration complete
SELECT 'ABM import fields migration completed successfully' as status;
