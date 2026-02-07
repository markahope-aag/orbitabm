-- OrbitABM Security Migration - Enable RLS and Create Policies
-- Fixes all security linter issues
-- Created: 2026-02-07

-- =====================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================

-- Core tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Reference data tables
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pe_platforms ENABLE ROW LEVEL SECURITY;

-- Company and contact tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pe_acquisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_snapshots ENABLE ROW LEVEL SECURITY;

-- Campaign and playbook tables
ALTER TABLE playbook_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_competitors ENABLE ROW LEVEL SECURITY;

-- Activity and asset tables
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Document intelligence tables
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTION FOR ORGANIZATION ACCESS
-- =====================================================

-- Function to get user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id 
  FROM profiles 
  WHERE id = auth.uid()
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role = 'admin'
  FROM profiles 
  WHERE id = auth.uid()
$$;

-- Function to check if user can manage organization
CREATE OR REPLACE FUNCTION can_manage_organization(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND organization_id = org_id 
    AND role IN ('admin', 'manager')
  )
$$;

-- =====================================================
-- ORGANIZATIONS TABLE POLICIES
-- =====================================================

-- Users can view organizations they belong to
CREATE POLICY "Users can view their organization"
ON organizations FOR SELECT
USING (id = get_user_organization_id());

-- Admins can create organizations (for agency model)
CREATE POLICY "Admins can create organizations"
ON organizations FOR INSERT
WITH CHECK (is_user_admin());

-- Users can update their own organization if they're admin/manager
CREATE POLICY "Managers can update their organization"
ON organizations FOR UPDATE
USING (can_manage_organization(id))
WITH CHECK (can_manage_organization(id));

-- Only admins can delete organizations
CREATE POLICY "Admins can delete organizations"
ON organizations FOR DELETE
USING (is_user_admin());

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Users can view profiles in their organization
CREATE POLICY "Users can view profiles in their organization"
ON profiles FOR SELECT
USING (organization_id = get_user_organization_id());

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admins can manage profiles in their organization
CREATE POLICY "Admins can manage profiles in their organization"
ON profiles FOR ALL
USING (
  is_user_admin() AND 
  organization_id = get_user_organization_id()
)
WITH CHECK (
  is_user_admin() AND 
  organization_id = get_user_organization_id()
);

-- =====================================================
-- REFERENCE DATA POLICIES (SHARED ACROSS ORGANIZATIONS)
-- =====================================================

-- Markets - read-only for all authenticated users
CREATE POLICY "Authenticated users can view markets"
ON markets FOR SELECT
USING (auth.role() = 'authenticated');

-- PE Platforms - read-only for all authenticated users
CREATE POLICY "Authenticated users can view pe_platforms"
ON pe_platforms FOR SELECT
USING (auth.role() = 'authenticated');

-- =====================================================
-- ORGANIZATION-SCOPED DATA POLICIES
-- =====================================================

-- Verticals - scoped to organization
CREATE POLICY "Users can view verticals in their organization"
ON verticals FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Managers can manage verticals in their organization"
ON verticals FOR ALL
USING (
  can_manage_organization(organization_id)
)
WITH CHECK (
  organization_id = get_user_organization_id() AND
  can_manage_organization(organization_id)
);

-- Companies - scoped to organization
CREATE POLICY "Users can view companies in their organization"
ON companies FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage companies in their organization"
ON companies FOR ALL
USING (
  organization_id = get_user_organization_id()
)
WITH CHECK (
  organization_id = get_user_organization_id()
);

-- Contacts - scoped to organization
CREATE POLICY "Users can view contacts in their organization"
ON contacts FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage contacts in their organization"
ON contacts FOR ALL
USING (
  organization_id = get_user_organization_id()
)
WITH CHECK (
  organization_id = get_user_organization_id()
);

-- PE Acquisitions - scoped to organization
CREATE POLICY "Users can view pe_acquisitions in their organization"
ON pe_acquisitions FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage pe_acquisitions in their organization"
ON pe_acquisitions FOR ALL
USING (
  organization_id = get_user_organization_id()
)
WITH CHECK (
  organization_id = get_user_organization_id()
);

-- Digital Snapshots - scoped to organization
CREATE POLICY "Users can view digital_snapshots in their organization"
ON digital_snapshots FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage digital_snapshots in their organization"
ON digital_snapshots FOR ALL
USING (
  organization_id = get_user_organization_id()
)
WITH CHECK (
  organization_id = get_user_organization_id()
);

-- Playbook Templates - scoped to organization
CREATE POLICY "Users can view playbook_templates in their organization"
ON playbook_templates FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Managers can manage playbook_templates in their organization"
ON playbook_templates FOR ALL
USING (
  can_manage_organization(organization_id)
)
WITH CHECK (
  organization_id = get_user_organization_id() AND
  can_manage_organization(organization_id)
);

-- Playbook Steps - scoped to organization via template
CREATE POLICY "Users can view playbook_steps in their organization"
ON playbook_steps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM playbook_templates pt
    WHERE pt.id = playbook_template_id 
    AND pt.organization_id = get_user_organization_id()
  )
);

CREATE POLICY "Managers can manage playbook_steps in their organization"
ON playbook_steps FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM playbook_templates pt
    WHERE pt.id = playbook_template_id 
    AND pt.organization_id = get_user_organization_id()
    AND can_manage_organization(pt.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM playbook_templates pt
    WHERE pt.id = playbook_template_id 
    AND pt.organization_id = get_user_organization_id()
    AND can_manage_organization(pt.organization_id)
  )
);

-- Campaigns - scoped to organization
CREATE POLICY "Users can view campaigns in their organization"
ON campaigns FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage campaigns in their organization"
ON campaigns FOR ALL
USING (
  organization_id = get_user_organization_id()
)
WITH CHECK (
  organization_id = get_user_organization_id()
);

-- Campaign Competitors - scoped to organization via campaign
CREATE POLICY "Users can view campaign_competitors in their organization"
ON campaign_competitors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id 
    AND c.organization_id = get_user_organization_id()
  )
);

CREATE POLICY "Users can manage campaign_competitors in their organization"
ON campaign_competitors FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id 
    AND c.organization_id = get_user_organization_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id 
    AND c.organization_id = get_user_organization_id()
  )
);

-- Activities - scoped to organization via campaign
CREATE POLICY "Users can view activities in their organization"
ON activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id 
    AND c.organization_id = get_user_organization_id()
  )
);

CREATE POLICY "Users can manage activities in their organization"
ON activities FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id 
    AND c.organization_id = get_user_organization_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id 
    AND c.organization_id = get_user_organization_id()
  )
);

-- Assets - scoped to organization via campaign
CREATE POLICY "Users can view assets in their organization"
ON assets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id 
    AND c.organization_id = get_user_organization_id()
  )
);

CREATE POLICY "Users can manage assets in their organization"
ON assets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id 
    AND c.organization_id = get_user_organization_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id 
    AND c.organization_id = get_user_organization_id()
  )
);

-- Results - scoped to organization via campaign
CREATE POLICY "Users can view results in their organization"
ON results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id 
    AND c.organization_id = get_user_organization_id()
  )
);

CREATE POLICY "Users can manage results in their organization"
ON results FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id 
    AND c.organization_id = get_user_organization_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id 
    AND c.organization_id = get_user_organization_id()
  )
);

-- =====================================================
-- FIX SECURITY DEFINER VIEWS
-- =====================================================

-- Drop and recreate views without SECURITY DEFINER
DROP VIEW IF EXISTS company_latest_snapshot;
DROP VIEW IF EXISTS active_campaigns_summary;

-- Recreate company_latest_snapshot view (without SECURITY DEFINER)
CREATE VIEW company_latest_snapshot AS
SELECT DISTINCT ON (ds.company_id)
  c.id as company_id,
  c.name as company_name,
  c.organization_id,
  ds.id as snapshot_id,
  ds.snapshot_date,
  ds.google_rating,
  ds.google_review_count,
  ds.yelp_rating,
  ds.yelp_review_count,
  ds.domain_authority,
  ds.page_speed_mobile,
  ds.page_speed_desktop,
  ds.organic_keywords,
  ds.monthly_organic_traffic_est,
  ds.website_has_ssl,
  ds.website_is_mobile_responsive,
  ds.has_online_booking,
  ds.has_live_chat,
  ds.has_blog,
  ds.notes as snapshot_notes
FROM companies c
LEFT JOIN digital_snapshots ds ON c.id = ds.company_id
WHERE c.deleted_at IS NULL
ORDER BY ds.company_id, ds.snapshot_date DESC;

-- Recreate active_campaigns_summary view (without SECURITY DEFINER)
CREATE VIEW active_campaigns_summary AS
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.organization_id,
  c.status,
  c.start_date,
  c.end_date,
  comp.name as company_name,
  m.name as market_name,
  v.name as vertical_name,
  COUNT(a.id) as activity_count,
  COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_activities,
  COUNT(r.id) as result_count
FROM campaigns c
LEFT JOIN companies comp ON c.company_id = comp.id
LEFT JOIN markets m ON c.market_id = m.id
LEFT JOIN verticals v ON c.vertical_id = v.id
LEFT JOIN activities a ON c.id = a.campaign_id
LEFT JOIN results r ON c.id = r.campaign_id
WHERE c.deleted_at IS NULL
  AND c.status IN ('active', 'planned')
GROUP BY 
  c.id, c.name, c.organization_id, c.status, c.start_date, c.end_date,
  comp.name, m.name, v.name;

-- =====================================================
-- GRANT PERMISSIONS FOR AUTHENTICATED USERS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant select on reference tables (markets, pe_platforms)
GRANT SELECT ON markets TO authenticated;
GRANT SELECT ON pe_platforms TO authenticated;

-- Grant select on views
GRANT SELECT ON company_latest_snapshot TO authenticated;
GRANT SELECT ON active_campaigns_summary TO authenticated;

-- All other table permissions are handled by RLS policies

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Add indexes for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_companies_organization_id ON companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_verticals_organization_id ON verticals(organization_id);
CREATE INDEX IF NOT EXISTS idx_digital_snapshots_organization_id ON digital_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_pe_acquisitions_organization_id ON pe_acquisitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_playbook_templates_organization_id ON playbook_templates(organization_id);

-- Document Templates - scoped to organization
CREATE POLICY "Users can view document_templates in their organization"
ON document_templates FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Managers can manage document_templates in their organization"
ON document_templates FOR ALL
USING (
  can_manage_organization(organization_id)
)
WITH CHECK (
  organization_id = get_user_organization_id() AND
  can_manage_organization(organization_id)
);

-- Generated Documents - scoped to organization
CREATE POLICY "Users can view generated_documents in their organization"
ON generated_documents FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage generated_documents in their organization"
ON generated_documents FOR ALL
USING (
  organization_id = get_user_organization_id()
)
WITH CHECK (
  organization_id = get_user_organization_id()
);

-- Email Templates - scoped to organization
CREATE POLICY "Users can view email_templates in their organization"
ON email_templates FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Managers can manage email_templates in their organization"
ON email_templates FOR ALL
USING (
  can_manage_organization(organization_id)
)
WITH CHECK (
  organization_id = get_user_organization_id() AND
  can_manage_organization(organization_id)
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Composite indexes for foreign key lookups in RLS
CREATE INDEX IF NOT EXISTS idx_playbook_steps_template_org ON playbook_steps(playbook_template_id);
CREATE INDEX IF NOT EXISTS idx_campaign_competitors_campaign_id ON campaign_competitors(campaign_id);
CREATE INDEX IF NOT EXISTS idx_activities_campaign_id ON activities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_assets_campaign_id ON assets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_results_campaign_id ON results(campaign_id);

-- Document intelligence indexes
CREATE INDEX IF NOT EXISTS idx_document_templates_organization_id_rls ON document_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_organization_id_rls ON generated_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_organization_id_rls ON email_templates(organization_id);