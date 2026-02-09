# OrbitABM Database Schema Documentation

Complete reference for the OrbitABM PostgreSQL database schema, relationships, and data model.

## 🏗️ Architecture Overview

### Design Principles
1. **Multi-tenant from day one** - Every table has `organization_id`
2. **Soft deletes** - Major entities have `deleted_at` timestamp
3. **Audit trails** - All tables have `created_at` and `updated_at`
4. **Referential integrity** - Proper foreign key constraints
5. **Flexible enums** - Text-based enums for easy extension

### Entity Relationship Diagram
```
Organizations ──< Users (profiles)
     │
     ├──< Markets
     ├──< Verticals
     ├──< PE Platforms ──< PE Acquisitions >── Companies
     ├──< Companies ──< Contacts
     │        │         ├──< Digital Snapshots
     │        │         └──< Assets
     │        │
     ├──< Playbook Templates ──< Playbook Steps ──< Email Templates
     │        │
     ├──< Campaigns ──< Activities
     │        │       ├──< Campaign Competitors (junction)
     │        │       ├──< Assets
     │        │       └──< Results
     │
     ├──< Document Templates ──< Generated Documents
     │
     └──< Audit Logs (tracks all entity changes)
     
     (all tables carry organization_id for multi-tenancy)
```

## 📋 Core Tables (20+ Tables)

### organizations
The top-level tenant entity. Each organization (agency or client) has isolated data.

```sql
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
```

**Key Fields:**
- `slug` - URL-friendly identifier for the organization
- `type` - Distinguishes between agencies and their clients

**Indexes:**
- Primary key on `id`
- Unique index on `slug`
- Index on `type` for filtering

### profiles
Extends Supabase auth.users with organization membership and roles.

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Key Fields:**
- `id` - References Supabase auth.users.id
- `role` - Determines access permissions within organization

## 🗺️ Geographic & Market Data

### markets
Geographic markets where companies operate and campaigns are executed.

```sql
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
```

**Key Fields:**
- `metro_population` - Total population of metropolitan area
- `market_size_estimate` - Estimated annual market size in dollars
- `pe_activity_level` - Level of private equity consolidation activity

### verticals
Industry classifications for companies and campaigns.

```sql
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
```

**Key Fields:**
- `revenue_floor` - Minimum revenue for qualifying prospects
- `tier` - Priority classification (tier_1 = highest priority)
- `naics_code` - North American Industry Classification System code

## 🏢 Company & Contact Data

### companies
Central entity representing both prospects and competitors.

```sql
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
  ownership_type text NOT NULL DEFAULT 'independent' 
    CHECK (ownership_type IN ('independent', 'pe_backed', 'franchise', 'corporate')),
  pe_platform_id uuid REFERENCES pe_platforms(id),
  qualifying_tier text CHECK (qualifying_tier IN ('top', 'qualified', 'borderline', 'excluded')),
  status text NOT NULL DEFAULT 'prospect' 
    CHECK (status IN ('prospect', 'target', 'active_campaign', 'client', 'lost', 'churned', 'excluded')),
  manufacturer_affiliations text,
  certifications text,
  awards text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

**Key Fields:**
- `status` - Current relationship status with the company
- `qualifying_tier` - Prospect quality assessment
- `ownership_type` - Business structure classification
- `pe_platform_id` - Links to PE platform if pe_backed

**Indexes:**
- `organization_id`, `market_id`, `vertical_id`
- `status`, `qualifying_tier`, `ownership_type`

### contacts
People at target companies who are decision makers or influencers.

```sql
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
  relationship_status text CHECK (relationship_status IN 
    ('unknown', 'identified', 'connected', 'engaged', 'responsive', 'meeting_held', 'client')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

**Key Fields:**
- `is_primary` - Designates main contact at the company
- `relationship_status` - Tracks engagement progression

## 💼 Private Equity Tracking

### pe_platforms
Private equity consolidation platforms that acquire companies.

```sql
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
```

### pe_acquisitions
Junction table linking PE platforms to acquired companies.

```sql
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
```

## 📸 Digital Presence Tracking

### digital_snapshots
Point-in-time captures of company digital presence metrics.

```sql
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
  page_speed_mobile integer,
  page_speed_desktop integer,
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
```

**Key Fields:**
- `snapshot_date` - When the data was captured
- Rating fields use numeric(2,1) for precision (e.g., 4.5)
- Boolean fields track website features

## 🎯 Campaign Management

### playbook_templates
Reusable multi-touch campaign sequences.

```sql
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
```

### playbook_steps
Individual steps within playbook templates.

```sql
CREATE TABLE playbook_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  playbook_template_id uuid NOT NULL REFERENCES playbook_templates(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  day_offset integer NOT NULL,
  channel text NOT NULL CHECK (channel IN ('mail', 'email', 'linkedin', 'phone', 'in_person', 'other')),
  title text NOT NULL,
  description text,
  asset_type_required text CHECK (asset_type_required IN 
    ('blueprint', 'website_audit', 'market_report', 'landing_page', 'breakup_note', 'proposal', 'none', null)),
  is_pivot_trigger boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(playbook_template_id, step_number)
);
```

### campaigns
Instances of playbooks applied to specific target companies.

```sql
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  company_id uuid NOT NULL REFERENCES companies(id),
  playbook_template_id uuid REFERENCES playbook_templates(id),
  market_id uuid NOT NULL REFERENCES markets(id),
  vertical_id uuid NOT NULL REFERENCES verticals(id),
  status text NOT NULL DEFAULT 'planned' 
    CHECK (status IN ('planned', 'active', 'paused', 'completed', 'won', 'lost', 'pivoted')),
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
```

### activities
Individual touchpoints executed as part of campaigns.

```sql
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  playbook_step_id uuid REFERENCES playbook_steps(id),
  contact_id uuid REFERENCES contacts(id),
  activity_type text NOT NULL CHECK (activity_type IN 
    ('letter_sent', 'email_sent', 'linkedin_connect', 'linkedin_message', 'linkedin_engagement', 
     'phone_call', 'meeting', 'audit_delivered', 'report_delivered', 'landing_page_shared', 
     'breakup_note', 'proposal_sent', 'other')),
  channel text CHECK (channel IN ('mail', 'email', 'linkedin', 'phone', 'in_person', 'other')),
  scheduled_date date,
  completed_date date,
  status text NOT NULL DEFAULT 'scheduled' 
    CHECK (status IN ('scheduled', 'completed', 'skipped', 'overdue')),
  outcome text CHECK (outcome IN 
    ('no_response', 'opened', 'clicked', 'replied', 'meeting_booked', 'declined', 'voicemail', 'conversation', null)),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Indexes:**
- `campaign_id`, `status`, `scheduled_date`

## 📁 Assets & Results

### assets
Documents and deliverables created for campaigns.

```sql
CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  campaign_id uuid REFERENCES campaigns(id),
  company_id uuid REFERENCES companies(id),
  asset_type text NOT NULL CHECK (asset_type IN 
    ('blueprint', 'website_audit', 'market_report', 'landing_page', 'breakup_note', 'proposal', 'presentation', 'other')),
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
```

### results
Campaign-level outcomes and conversions.

```sql
CREATE TABLE results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  result_type text NOT NULL CHECK (result_type IN 
    ('meeting_scheduled', 'proposal_sent', 'proposal_accepted', 'contract_signed', 'contract_lost', 
     'no_response', 'declined', 'breakup_sent', 'referral_received', 'other')),
  result_date date NOT NULL,
  contract_value_monthly numeric(10,2),
  contract_term_months integer,
  total_contract_value numeric(12,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## 🔗 Junction Tables

### campaign_competitors
Links campaigns to competitor companies for positioning.

```sql
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
```

## 📋 Document Intelligence Tables

### document_templates
Templates for generating various types of documents (research, proposals, etc.).

```sql
CREATE TABLE document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN 
    ('prospect_research', 'campaign_sequence', 'competitive_analysis', 'audit_report', 'proposal')),
  vertical_id uuid REFERENCES verticals(id),
  template_structure jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

### generated_documents
AI-generated documents based on templates and company data.

```sql
CREATE TABLE generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_template_id uuid REFERENCES document_templates(id),
  company_id uuid REFERENCES companies(id),
  campaign_id uuid REFERENCES campaigns(id),
  title text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN 
    ('prospect_research', 'campaign_sequence', 'competitive_analysis', 'audit_report', 'proposal')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN 
    ('draft', 'in_review', 'approved', 'delivered', 'archived')),
  content jsonb,
  readiness_score integer CHECK (readiness_score BETWEEN 0 AND 10),
  version integer NOT NULL DEFAULT 1,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  last_generated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

### email_templates
Campaign-scoped email templates with merge fields.

```sql
CREATE TABLE email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  playbook_step_id uuid REFERENCES playbook_steps(id),
  name text NOT NULL,
  subject_line text NOT NULL,
  subject_line_alt text,
  body text NOT NULL,
  target_contact_role text CHECK (target_contact_role IN 
    ('economic_buyer', 'technical_buyer', 'brand_buyer', 'champion', 'any')),
  merge_fields_required text[],
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## 📊 Audit & Monitoring Tables

### audit_logs
Comprehensive audit trail for all user actions and data changes.

```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  old_values jsonb,
  new_values jsonb,
  changed_fields text[],
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

**Key Fields:**
- `entity_type` - Type of entity being audited (company, campaign, etc.)
- `action` - Type of action performed (create, update, delete)
- `old_values`/`new_values` - Before and after values for changes
- `changed_fields` - Array of field names that were modified
- `metadata` - Additional context about the action

## 🔄 Database Functions & Triggers

### Updated At Trigger
Automatically updates `updated_at` timestamp on row changes.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Applied to all tables with updated_at column
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 📊 Views

### active_campaigns_summary
Comprehensive view of active campaigns with joined data.

```sql
CREATE VIEW active_campaigns_summary AS
SELECT 
  c.id,
  c.name,
  c.status,
  c.start_date,
  c.current_step,
  comp.name as company_name,
  m.name as market_name,
  v.name as vertical_name,
  pt.name as playbook_name,
  p.full_name as assigned_to_name
FROM campaigns c
JOIN companies comp ON c.company_id = comp.id
JOIN markets m ON c.market_id = m.id
JOIN verticals v ON c.vertical_id = v.id
LEFT JOIN playbook_templates pt ON c.playbook_template_id = pt.id
LEFT JOIN profiles p ON c.assigned_to = p.id
WHERE c.deleted_at IS NULL
  AND c.status IN ('planned', 'active', 'paused');
```

### company_latest_snapshot
Returns most recent digital snapshot per company.

```sql
CREATE VIEW company_latest_snapshot AS
SELECT DISTINCT ON (company_id)
  company_id,
  snapshot_date,
  google_rating,
  google_review_count,
  yelp_rating,
  yelp_review_count,
  domain_authority,
  has_online_booking,
  has_live_chat
FROM digital_snapshots
ORDER BY company_id, snapshot_date DESC;
```

## 🔐 Security Considerations

### Row Level Security (RLS)
Future implementation will include RLS policies:

```sql
-- Example policy for companies table
CREATE POLICY "Users can only see their organization's companies" 
ON companies FOR ALL 
USING (organization_id = current_setting('app.current_organization_id')::uuid);
```

### Data Isolation
- All major tables include `organization_id`
- Application enforces organization context
- Queries automatically filter by organization

## 📈 Performance Optimization

### Indexes
Key indexes for query performance:

```sql
-- Company lookups
CREATE INDEX idx_companies_org_status ON companies(organization_id, status);
CREATE INDEX idx_companies_market_vertical ON companies(market_id, vertical_id);

-- Activity queries
CREATE INDEX idx_activities_campaign_status ON activities(campaign_id, status);
CREATE INDEX idx_activities_scheduled_date ON activities(scheduled_date) WHERE status = 'scheduled';

-- Campaign filtering
CREATE INDEX idx_campaigns_org_status ON campaigns(organization_id, status);
CREATE INDEX idx_campaigns_assigned_to ON campaigns(assigned_to) WHERE assigned_to IS NOT NULL;
```

### Query Patterns
Common query optimizations:
- Use organization_id in all WHERE clauses
- Filter deleted records with `deleted_at IS NULL`
- Use appropriate indexes for date range queries
- Limit result sets with LIMIT/OFFSET for pagination

## 🔄 Migration Strategy

### Version Control
- All schema changes tracked in 20 migration files
- Sequential numbering: `001_initial_schema.sql` through `015_fix_audit_logs_rls_policy.sql`
- Latest migration (015) fixes audit logs RLS policy security issue
- Rollback scripts available for critical migrations

### Data Migration
- Use `INSERT ... ON CONFLICT DO NOTHING` for safe re-runs
- Validate data integrity after migrations
- Backup before major schema changes

---

This database schema supports the complete OrbitABM application with proper relationships, constraints, and performance considerations. For implementation details, see the [API Documentation](API.md) and [Getting Started Guide](GETTING_STARTED.md).