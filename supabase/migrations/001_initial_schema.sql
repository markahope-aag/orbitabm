-- OrbitABM Initial Schema Migration
-- Multi-tenant ABM campaign intelligence platform
-- Created: 2026-02-07

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- ORGANIZATIONS TABLE
-- Top-level tenant (Asymmetric Marketing, clients)
-- =====================================================
CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    type text NOT NULL CHECK (type IN ('agency', 'client')),
    website text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_slug ON organizations(slug);

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PROFILES TABLE
-- Extends Supabase auth.users with organization link
-- =====================================================
CREATE TABLE profiles (
    id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations(id),
    role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
    full_name text,
    avatar_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX idx_profiles_role ON profiles(role);

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MARKETS TABLE
-- Geographic markets (cities/metro areas)
-- =====================================================
CREATE TABLE markets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    name text NOT NULL,
    state text NOT NULL,
    metro_population integer,
    market_size_estimate numeric(12,2),
    pe_activity_level text CHECK (pe_activity_level IN ('none', 'low', 'moderate', 'high', 'critical')),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    UNIQUE(organization_id, name, state)
);

CREATE INDEX idx_markets_organization_id ON markets(organization_id);
CREATE INDEX idx_markets_pe_activity ON markets(pe_activity_level);

CREATE TRIGGER update_markets_updated_at
    BEFORE UPDATE ON markets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERTICALS TABLE
-- Industry verticals (HVAC, Plumbing, etc.)
-- =====================================================
CREATE TABLE verticals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    name text NOT NULL,
    sector text,
    b2b_b2c text CHECK (b2b_b2c IN ('B2B', 'B2C', 'Both')),
    naics_code text,
    revenue_floor numeric(12,2),
    typical_revenue_range text,
    typical_marketing_budget_pct text,
    key_decision_maker_title text,
    tier text CHECK (tier IN ('tier_1', 'tier_2', 'tier_3', 'borderline', 'eliminated')),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    UNIQUE(organization_id, name)
);

CREATE INDEX idx_verticals_organization_id ON verticals(organization_id);
CREATE INDEX idx_verticals_tier ON verticals(tier);
CREATE INDEX idx_verticals_sector ON verticals(sector);

CREATE TRIGGER update_verticals_updated_at
    BEFORE UPDATE ON verticals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PE_PLATFORMS TABLE
-- Private equity consolidation platforms
-- =====================================================
CREATE TABLE pe_platforms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    name text NOT NULL,
    parent_firm text,
    estimated_valuation numeric(14,2),
    brand_count integer,
    headquarters text,
    website text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX idx_pe_platforms_organization_id ON pe_platforms(organization_id);

CREATE TRIGGER update_pe_platforms_updated_at
    BEFORE UPDATE ON pe_platforms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMPANIES TABLE
-- Both prospects/targets AND competitors
-- =====================================================
CREATE TABLE companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    name text NOT NULL,
    market_id uuid REFERENCES markets(id),
    vertical_id uuid REFERENCES verticals(id),
    website text,
    phone text,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    zip text,
    estimated_revenue numeric(14,2),
    employee_count integer,
    year_founded integer,
    ownership_type text NOT NULL DEFAULT 'independent' CHECK (ownership_type IN ('independent', 'pe_backed', 'franchise', 'corporate')),
    pe_platform_id uuid REFERENCES pe_platforms(id),
    qualifying_tier text CHECK (qualifying_tier IN ('top', 'qualified', 'borderline', 'excluded')),
    status text NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'target', 'active_campaign', 'client', 'lost', 'churned', 'excluded')),
    manufacturer_affiliations text,
    certifications text,
    awards text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX idx_companies_organization_id ON companies(organization_id);
CREATE INDEX idx_companies_market_id ON companies(market_id);
CREATE INDEX idx_companies_vertical_id ON companies(vertical_id);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_qualifying_tier ON companies(qualifying_tier);
CREATE INDEX idx_companies_ownership_type ON companies(ownership_type);
CREATE INDEX idx_companies_pe_platform_id ON companies(pe_platform_id);

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CONTACTS TABLE
-- People at target companies
-- =====================================================
CREATE TABLE contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    company_id uuid NOT NULL REFERENCES companies(id),
    first_name text NOT NULL,
    last_name text NOT NULL,
    title text,
    email text,
    phone text,
    linkedin_url text,
    is_primary boolean DEFAULT false,
    relationship_status text CHECK (relationship_status IN ('unknown', 'identified', 'connected', 'engaged', 'responsive', 'meeting_held', 'client')),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_relationship_status ON contacts(relationship_status);
CREATE INDEX idx_contacts_is_primary ON contacts(is_primary);

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PE_ACQUISITIONS TABLE
-- Links PE platforms to acquired companies
-- =====================================================
CREATE TABLE pe_acquisitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    pe_platform_id uuid NOT NULL REFERENCES pe_platforms(id),
    company_id uuid NOT NULL REFERENCES companies(id),
    acquisition_date date,
    source_url text,
    notes text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(pe_platform_id, company_id)
);

CREATE INDEX idx_pe_acquisitions_organization_id ON pe_acquisitions(organization_id);
CREATE INDEX idx_pe_acquisitions_pe_platform_id ON pe_acquisitions(pe_platform_id);
CREATE INDEX idx_pe_acquisitions_company_id ON pe_acquisitions(company_id);
CREATE INDEX idx_pe_acquisitions_date ON pe_acquisitions(acquisition_date);

-- =====================================================
-- DIGITAL_SNAPSHOTS TABLE
-- Point-in-time digital presence capture
-- =====================================================
CREATE TABLE digital_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    company_id uuid NOT NULL REFERENCES companies(id),
    snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
    google_rating numeric(2,1),
    google_review_count integer,
    yelp_rating numeric(2,1),
    yelp_review_count integer,
    bbb_rating text,
    facebook_followers integer,
    instagram_followers integer,
    linkedin_followers integer,
    domain_authority integer,
    page_speed_mobile integer CHECK (page_speed_mobile >= 0 AND page_speed_mobile <= 100),
    page_speed_desktop integer CHECK (page_speed_desktop >= 0 AND page_speed_desktop <= 100),
    organic_keywords integer,
    monthly_organic_traffic_est integer,
    website_has_ssl boolean,
    website_is_mobile_responsive boolean,
    has_online_booking boolean,
    has_live_chat boolean,
    has_blog boolean,
    notes text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_digital_snapshots_organization_id ON digital_snapshots(organization_id);
CREATE INDEX idx_digital_snapshots_company_id ON digital_snapshots(company_id);
CREATE INDEX idx_digital_snapshots_date ON digital_snapshots(snapshot_date);

-- =====================================================
-- PLAYBOOK_TEMPLATES TABLE
-- Reusable multi-touch campaign sequences
-- =====================================================
CREATE TABLE playbook_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    name text NOT NULL,
    vertical_id uuid REFERENCES verticals(id),
    description text,
    total_duration_days integer,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX idx_playbook_templates_organization_id ON playbook_templates(organization_id);
CREATE INDEX idx_playbook_templates_vertical_id ON playbook_templates(vertical_id);
CREATE INDEX idx_playbook_templates_is_active ON playbook_templates(is_active);

CREATE TRIGGER update_playbook_templates_updated_at
    BEFORE UPDATE ON playbook_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PLAYBOOK_STEPS TABLE
-- Individual steps within playbook templates
-- =====================================================
CREATE TABLE playbook_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    playbook_template_id uuid NOT NULL REFERENCES playbook_templates(id) ON DELETE CASCADE,
    step_number integer NOT NULL,
    day_offset integer NOT NULL,
    channel text NOT NULL CHECK (channel IN ('mail', 'email', 'linkedin', 'phone', 'in_person', 'other')),
    title text NOT NULL,
    description text,
    asset_type_required text CHECK (asset_type_required IN ('blueprint', 'website_audit', 'market_report', 'landing_page', 'breakup_note', 'proposal', 'none', null)),
    is_pivot_trigger boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(playbook_template_id, step_number)
);

CREATE INDEX idx_playbook_steps_organization_id ON playbook_steps(organization_id);
CREATE INDEX idx_playbook_steps_playbook_template_id ON playbook_steps(playbook_template_id);
CREATE INDEX idx_playbook_steps_channel ON playbook_steps(channel);

CREATE TRIGGER update_playbook_steps_updated_at
    BEFORE UPDATE ON playbook_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CAMPAIGNS TABLE
-- Playbook instances applied to target companies
-- =====================================================
CREATE TABLE campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    name text NOT NULL,
    company_id uuid NOT NULL REFERENCES companies(id),
    playbook_template_id uuid REFERENCES playbook_templates(id),
    market_id uuid NOT NULL REFERENCES markets(id),
    vertical_id uuid NOT NULL REFERENCES verticals(id),
    status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'paused', 'completed', 'won', 'lost', 'pivoted')),
    start_date date,
    end_date date,
    current_step integer,
    pivot_reason text,
    pivot_to_campaign_id uuid REFERENCES campaigns(id),
    assigned_to uuid REFERENCES profiles(id),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX idx_campaigns_organization_id ON campaigns(organization_id);
CREATE INDEX idx_campaigns_company_id ON campaigns(company_id);
CREATE INDEX idx_campaigns_playbook_template_id ON campaigns(playbook_template_id);
CREATE INDEX idx_campaigns_market_id ON campaigns(market_id);
CREATE INDEX idx_campaigns_vertical_id ON campaigns(vertical_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_assigned_to ON campaigns(assigned_to);
CREATE INDEX idx_campaigns_start_date ON campaigns(start_date);

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CAMPAIGN_COMPETITORS TABLE
-- Junction: competitors referenced in campaigns
-- =====================================================
CREATE TABLE campaign_competitors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES companies(id),
    threat_level text CHECK (threat_level IN ('critical', 'high', 'medium', 'low')),
    notes text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(campaign_id, company_id)
);

CREATE INDEX idx_campaign_competitors_organization_id ON campaign_competitors(organization_id);
CREATE INDEX idx_campaign_competitors_campaign_id ON campaign_competitors(campaign_id);
CREATE INDEX idx_campaign_competitors_company_id ON campaign_competitors(company_id);

-- =====================================================
-- ACTIVITIES TABLE
-- Individual touchpoints in campaigns
-- =====================================================
CREATE TABLE activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    campaign_id uuid NOT NULL REFERENCES campaigns(id),
    playbook_step_id uuid REFERENCES playbook_steps(id),
    contact_id uuid REFERENCES contacts(id),
    activity_type text NOT NULL CHECK (activity_type IN ('letter_sent', 'email_sent', 'linkedin_connect', 'linkedin_message', 'linkedin_engagement', 'phone_call', 'meeting', 'audit_delivered', 'report_delivered', 'landing_page_shared', 'breakup_note', 'proposal_sent', 'other')),
    channel text CHECK (channel IN ('mail', 'email', 'linkedin', 'phone', 'in_person', 'other')),
    scheduled_date date,
    completed_date date,
    status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'skipped', 'overdue')),
    outcome text CHECK (outcome IN ('no_response', 'opened', 'clicked', 'replied', 'meeting_booked', 'declined', 'voicemail', 'conversation', null)),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activities_organization_id ON activities(organization_id);
CREATE INDEX idx_activities_campaign_id ON activities(campaign_id);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_scheduled_date ON activities(scheduled_date);
CREATE INDEX idx_activities_contact_id ON activities(contact_id);

CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ASSETS TABLE
-- Documents and deliverables for targets
-- =====================================================
CREATE TABLE assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    campaign_id uuid REFERENCES campaigns(id),
    company_id uuid REFERENCES companies(id),
    asset_type text NOT NULL CHECK (asset_type IN ('blueprint', 'website_audit', 'market_report', 'landing_page', 'breakup_note', 'proposal', 'presentation', 'other')),
    title text NOT NULL,
    description text,
    file_url text,
    landing_page_url text,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'delivered', 'viewed')),
    delivered_date date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX idx_assets_organization_id ON assets(organization_id);
CREATE INDEX idx_assets_campaign_id ON assets(campaign_id);
CREATE INDEX idx_assets_company_id ON assets(company_id);
CREATE INDEX idx_assets_asset_type ON assets(asset_type);
CREATE INDEX idx_assets_status ON assets(status);

CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RESULTS TABLE
-- Campaign-level outcomes
-- =====================================================
CREATE TABLE results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    campaign_id uuid NOT NULL REFERENCES campaigns(id),
    result_type text NOT NULL CHECK (result_type IN ('meeting_scheduled', 'proposal_sent', 'proposal_accepted', 'contract_signed', 'contract_lost', 'no_response', 'declined', 'breakup_sent', 'referral_received', 'other')),
    result_date date NOT NULL,
    contract_value_monthly numeric(10,2),
    contract_term_months integer,
    total_contract_value numeric(12,2),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_results_organization_id ON results(organization_id);
CREATE INDEX idx_results_campaign_id ON results(campaign_id);
CREATE INDEX idx_results_result_type ON results(result_type);
CREATE INDEX idx_results_result_date ON results(result_date);

CREATE TRIGGER update_results_updated_at
    BEFORE UPDATE ON results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS
-- =====================================================

-- Active campaigns summary view
CREATE VIEW active_campaigns_summary AS
SELECT 
    c.id,
    c.name as campaign_name,
    c.status,
    c.start_date,
    c.current_step,
    c.assigned_to,
    co.name as company_name,
    co.website as company_website,
    co.estimated_revenue,
    m.name as market_name,
    m.state as market_state,
    v.name as vertical_name,
    pt.name as playbook_name,
    pt.total_duration_days,
    p.full_name as assigned_to_name,
    c.created_at,
    c.updated_at
FROM campaigns c
JOIN companies co ON c.company_id = co.id
JOIN markets m ON c.market_id = m.id
JOIN verticals v ON c.vertical_id = v.id
LEFT JOIN playbook_templates pt ON c.playbook_template_id = pt.id
LEFT JOIN profiles p ON c.assigned_to = p.id
WHERE c.deleted_at IS NULL
    AND co.deleted_at IS NULL
    AND m.deleted_at IS NULL
    AND v.deleted_at IS NULL
    AND (pt.deleted_at IS NULL OR pt.deleted_at IS NOT NULL);

-- Company latest snapshot view
CREATE VIEW company_latest_snapshot AS
SELECT DISTINCT ON (company_id)
    ds.*,
    c.name as company_name
FROM digital_snapshots ds
JOIN companies c ON ds.company_id = c.id
WHERE c.deleted_at IS NULL
ORDER BY company_id, snapshot_date DESC;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert initial organizations
INSERT INTO organizations (name, slug, type, website, notes) VALUES
('Asymmetric Marketing', 'asymmetric', 'agency', 'https://asymmetricmarketing.com', 'Primary agency organization'),
('Paper Tube Co', 'paper-tube-co', 'client', null, 'Client organization'),
('AviaryAI', 'aviaryai', 'client', null, 'Client organization'),
('Citrus America', 'citrus-america', 'client', null, 'Client organization');

-- Add comments for documentation
COMMENT ON TABLE organizations IS 'Top-level tenant organizations (agency and clients)';
COMMENT ON TABLE profiles IS 'User profiles linked to organizations with roles';
COMMENT ON TABLE markets IS 'Geographic markets (cities/metro areas)';
COMMENT ON TABLE verticals IS 'Industry verticals (HVAC, Plumbing, etc.)';
COMMENT ON TABLE pe_platforms IS 'Private equity consolidation platforms';
COMMENT ON TABLE companies IS 'Both prospects/targets and competitors';
COMMENT ON TABLE contacts IS 'People at target companies';
COMMENT ON TABLE pe_acquisitions IS 'Links PE platforms to acquired companies';
COMMENT ON TABLE digital_snapshots IS 'Point-in-time digital presence capture';
COMMENT ON TABLE playbook_templates IS 'Reusable multi-touch campaign sequences';
COMMENT ON TABLE playbook_steps IS 'Individual steps within playbook templates';
COMMENT ON TABLE campaigns IS 'Playbook instances applied to target companies';
COMMENT ON TABLE campaign_competitors IS 'Junction table for competitors in campaigns';
COMMENT ON TABLE activities IS 'Individual touchpoints executed in campaigns';
COMMENT ON TABLE assets IS 'Documents and deliverables created for targets';
COMMENT ON TABLE results IS 'Campaign-level outcomes and contract values';

-- Migration complete
SELECT 'OrbitABM initial schema migration completed successfully' as status;