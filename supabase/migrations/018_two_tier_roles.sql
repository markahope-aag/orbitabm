-- =====================================================
-- Migration 018: Two-Tier Role System
-- Adds platform_roles table, renames org roles (admin→owner, manager→admin, new 'user'),
-- rebuilds all RLS policies to enforce viewer read-only and platform user cross-org access.
-- Created: 2026-02-08
-- =====================================================

-- =====================================================
-- 1A. CREATE platform_roles TABLE
-- =====================================================

CREATE TABLE public.platform_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('platform_owner', 'platform_admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 1B. UPDATE profiles.role CHECK CONSTRAINT
-- =====================================================

ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'admin', 'user', 'viewer'));

-- =====================================================
-- 1C. DATA MIGRATION
-- =====================================================

-- Rename existing roles (order matters: admin→owner first, then manager→admin)
UPDATE profiles SET role = 'owner' WHERE role = 'admin';
UPDATE profiles SET role = 'admin' WHERE role = 'manager';

-- Make the first owner a platform_owner
INSERT INTO platform_roles (user_id, role)
SELECT id, 'platform_owner' FROM profiles WHERE role = 'owner' LIMIT 1;

-- =====================================================
-- 1D. DROP ALL EXISTING RLS POLICIES
-- =====================================================

-- Organizations
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Managers can update their organization" ON organizations;
DROP POLICY IF EXISTS "Admins can delete organizations" ON organizations;

-- Profiles
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON profiles;

-- Markets & PE Platforms (reference data)
DROP POLICY IF EXISTS "Authenticated users can view markets" ON markets;
DROP POLICY IF EXISTS "Authenticated users can view pe_platforms" ON pe_platforms;

-- Verticals
DROP POLICY IF EXISTS "Users can view verticals in their organization" ON verticals;
DROP POLICY IF EXISTS "Managers can manage verticals in their organization" ON verticals;

-- Companies
DROP POLICY IF EXISTS "Users can view companies in their organization" ON companies;
DROP POLICY IF EXISTS "Users can manage companies in their organization" ON companies;

-- Contacts
DROP POLICY IF EXISTS "Users can view contacts in their organization" ON contacts;
DROP POLICY IF EXISTS "Users can manage contacts in their organization" ON contacts;

-- PE Acquisitions
DROP POLICY IF EXISTS "Users can view pe_acquisitions in their organization" ON pe_acquisitions;
DROP POLICY IF EXISTS "Users can manage pe_acquisitions in their organization" ON pe_acquisitions;

-- Digital Snapshots
DROP POLICY IF EXISTS "Users can view digital_snapshots in their organization" ON digital_snapshots;
DROP POLICY IF EXISTS "Users can manage digital_snapshots in their organization" ON digital_snapshots;

-- Playbook Templates
DROP POLICY IF EXISTS "Users can view playbook_templates in their organization" ON playbook_templates;
DROP POLICY IF EXISTS "Managers can manage playbook_templates in their organization" ON playbook_templates;

-- Playbook Steps
DROP POLICY IF EXISTS "Users can view playbook_steps in their organization" ON playbook_steps;
DROP POLICY IF EXISTS "Managers can manage playbook_steps in their organization" ON playbook_steps;

-- Campaigns
DROP POLICY IF EXISTS "Users can view campaigns in their organization" ON campaigns;
DROP POLICY IF EXISTS "Users can manage campaigns in their organization" ON campaigns;

-- Campaign Competitors
DROP POLICY IF EXISTS "Users can view campaign_competitors in their organization" ON campaign_competitors;
DROP POLICY IF EXISTS "Users can manage campaign_competitors in their organization" ON campaign_competitors;

-- Activities
DROP POLICY IF EXISTS "Users can view activities in their organization" ON activities;
DROP POLICY IF EXISTS "Users can manage activities in their organization" ON activities;

-- Assets
DROP POLICY IF EXISTS "Users can view assets in their organization" ON assets;
DROP POLICY IF EXISTS "Users can manage assets in their organization" ON assets;

-- Results
DROP POLICY IF EXISTS "Users can view results in their organization" ON results;
DROP POLICY IF EXISTS "Users can manage results in their organization" ON results;

-- Document Templates
DROP POLICY IF EXISTS "Users can view document_templates in their organization" ON document_templates;
DROP POLICY IF EXISTS "Managers can manage document_templates in their organization" ON document_templates;

-- Generated Documents
DROP POLICY IF EXISTS "Users can view generated_documents in their organization" ON generated_documents;
DROP POLICY IF EXISTS "Users can manage generated_documents in their organization" ON generated_documents;

-- Email Templates
DROP POLICY IF EXISTS "Users can view email_templates in their organization" ON email_templates;
DROP POLICY IF EXISTS "Managers can manage email_templates in their organization" ON email_templates;

-- Audit Logs
DROP POLICY IF EXISTS "Users can view audit logs for their organization" ON audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs for their organization" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;

-- =====================================================
-- 1E. DROP AND RECREATE FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS public.get_user_organization_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_user_admin() CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_organization(uuid) CASCADE;

-- Keep existing function (unchanged)
CREATE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = auth.uid()
$$;

-- Updated: owner and admin are both "admins" in org context
CREATE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role IN ('owner', 'admin')
  FROM public.profiles
  WHERE id = auth.uid()
$$;

-- Updated: owner and admin can manage org + platform users can too
CREATE FUNCTION public.can_manage_organization(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND organization_id = org_id
    AND role IN ('owner', 'admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = auth.uid()
  )
$$;

-- New: check if user is a platform user (any platform role)
CREATE FUNCTION public.is_platform_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = auth.uid()
  )
$$;

-- New: check if user is specifically a platform owner
CREATE FUNCTION public.is_platform_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = auth.uid()
    AND role = 'platform_owner'
  )
$$;

-- New: get platform role text or NULL
CREATE FUNCTION public.get_platform_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role
  FROM public.platform_roles
  WHERE user_id = auth.uid()
$$;

-- New: get org role text
CREATE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
$$;

-- New: can user write operational data in an org?
-- owner/admin/user can write; viewer cannot; platform users always can
CREATE FUNCTION public.can_write_data(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND organization_id = org_id
    AND role IN ('owner', 'admin', 'user')
  )
  OR EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = auth.uid()
  )
$$;

-- =====================================================
-- 1F. RECREATE ALL RLS POLICIES
-- =====================================================

-- ----- ORGANIZATIONS -----

CREATE POLICY "org_select"
ON organizations FOR SELECT
USING (id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "org_insert"
ON organizations FOR INSERT
WITH CHECK (is_platform_user());

CREATE POLICY "org_update"
ON organizations FOR UPDATE
USING (can_manage_organization(id))
WITH CHECK (can_manage_organization(id));

CREATE POLICY "org_delete"
ON organizations FOR DELETE
USING (is_platform_owner());

-- ----- PROFILES -----

CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "profiles_select_org"
ON profiles FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_manage"
ON profiles FOR ALL
USING (
  (is_user_admin() AND organization_id = get_user_organization_id())
  OR is_platform_user()
)
WITH CHECK (
  (is_user_admin() AND organization_id = get_user_organization_id())
  OR is_platform_user()
);

-- ----- PLATFORM_ROLES -----

CREATE POLICY "platform_roles_select_own"
ON platform_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "platform_roles_select_all"
ON platform_roles FOR SELECT
USING (is_platform_user());

CREATE POLICY "platform_roles_manage"
ON platform_roles FOR ALL
USING (is_platform_owner())
WITH CHECK (is_platform_owner());

-- ----- MARKETS (reference data, org-scoped reads) -----

CREATE POLICY "markets_select"
ON markets FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "markets_write"
ON markets FOR ALL
USING (can_write_data(organization_id))
WITH CHECK (can_write_data(organization_id));

-- ----- PE PLATFORMS (reference data, org-scoped reads) -----

CREATE POLICY "pe_platforms_select"
ON pe_platforms FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "pe_platforms_write"
ON pe_platforms FOR ALL
USING (can_write_data(organization_id))
WITH CHECK (can_write_data(organization_id));

-- ----- OPERATIONAL TABLES -----
-- SELECT: org match or platform user
-- INSERT/UPDATE/DELETE: can_write_data (owner/admin/user + platform)

-- Companies
CREATE POLICY "companies_select"
ON companies FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "companies_write"
ON companies FOR INSERT
WITH CHECK (can_write_data(organization_id));

CREATE POLICY "companies_update"
ON companies FOR UPDATE
USING (can_write_data(organization_id))
WITH CHECK (can_write_data(organization_id));

CREATE POLICY "companies_delete"
ON companies FOR DELETE
USING (can_write_data(organization_id));

-- Contacts
CREATE POLICY "contacts_select"
ON contacts FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "contacts_write"
ON contacts FOR INSERT
WITH CHECK (can_write_data(organization_id));

CREATE POLICY "contacts_update"
ON contacts FOR UPDATE
USING (can_write_data(organization_id))
WITH CHECK (can_write_data(organization_id));

CREATE POLICY "contacts_delete"
ON contacts FOR DELETE
USING (can_write_data(organization_id));

-- Campaigns
CREATE POLICY "campaigns_select"
ON campaigns FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "campaigns_write"
ON campaigns FOR INSERT
WITH CHECK (can_write_data(organization_id));

CREATE POLICY "campaigns_update"
ON campaigns FOR UPDATE
USING (can_write_data(organization_id))
WITH CHECK (can_write_data(organization_id));

CREATE POLICY "campaigns_delete"
ON campaigns FOR DELETE
USING (can_write_data(organization_id));

-- PE Acquisitions
CREATE POLICY "pe_acquisitions_select"
ON pe_acquisitions FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "pe_acquisitions_write"
ON pe_acquisitions FOR INSERT
WITH CHECK (can_write_data(organization_id));

CREATE POLICY "pe_acquisitions_update"
ON pe_acquisitions FOR UPDATE
USING (can_write_data(organization_id))
WITH CHECK (can_write_data(organization_id));

CREATE POLICY "pe_acquisitions_delete"
ON pe_acquisitions FOR DELETE
USING (can_write_data(organization_id));

-- Digital Snapshots
CREATE POLICY "digital_snapshots_select"
ON digital_snapshots FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "digital_snapshots_write"
ON digital_snapshots FOR INSERT
WITH CHECK (can_write_data(organization_id));

CREATE POLICY "digital_snapshots_update"
ON digital_snapshots FOR UPDATE
USING (can_write_data(organization_id))
WITH CHECK (can_write_data(organization_id));

CREATE POLICY "digital_snapshots_delete"
ON digital_snapshots FOR DELETE
USING (can_write_data(organization_id));

-- Generated Documents
CREATE POLICY "generated_documents_select"
ON generated_documents FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "generated_documents_write"
ON generated_documents FOR INSERT
WITH CHECK (can_write_data(organization_id));

CREATE POLICY "generated_documents_update"
ON generated_documents FOR UPDATE
USING (can_write_data(organization_id))
WITH CHECK (can_write_data(organization_id));

CREATE POLICY "generated_documents_delete"
ON generated_documents FOR DELETE
USING (can_write_data(organization_id));

-- ----- CAMPAIGN CHILD TABLES (join to parent campaign) -----

-- Campaign Competitors
CREATE POLICY "campaign_competitors_select"
ON campaign_competitors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND (c.organization_id = get_user_organization_id() OR is_platform_user())
  )
);

CREATE POLICY "campaign_competitors_write"
ON campaign_competitors FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND (can_write_data(c.organization_id))
  )
);

CREATE POLICY "campaign_competitors_update"
ON campaign_competitors FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND (can_write_data(c.organization_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND (can_write_data(c.organization_id))
  )
);

CREATE POLICY "campaign_competitors_delete"
ON campaign_competitors FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND (can_write_data(c.organization_id))
  )
);

-- Activities
CREATE POLICY "activities_select"
ON activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND (c.organization_id = get_user_organization_id() OR is_platform_user())
  )
);

CREATE POLICY "activities_write"
ON activities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND (can_write_data(c.organization_id))
  )
);

CREATE POLICY "activities_update"
ON activities FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND (can_write_data(c.organization_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND (can_write_data(c.organization_id))
  )
);

CREATE POLICY "activities_delete"
ON activities FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND (can_write_data(c.organization_id))
  )
);

-- Assets
CREATE POLICY "assets_select"
ON assets FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "assets_write"
ON assets FOR INSERT
WITH CHECK (can_write_data(organization_id));

CREATE POLICY "assets_update"
ON assets FOR UPDATE
USING (can_write_data(organization_id))
WITH CHECK (can_write_data(organization_id));

CREATE POLICY "assets_delete"
ON assets FOR DELETE
USING (can_write_data(organization_id));

-- Results
CREATE POLICY "results_select"
ON results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND (c.organization_id = get_user_organization_id() OR is_platform_user())
  )
);

CREATE POLICY "results_write"
ON results FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND (can_write_data(c.organization_id))
  )
);

CREATE POLICY "results_update"
ON results FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND (can_write_data(c.organization_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND (can_write_data(c.organization_id))
  )
);

CREATE POLICY "results_delete"
ON results FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND (can_write_data(c.organization_id))
  )
);

-- ----- ADMIN TABLES -----
-- SELECT: org match or platform user
-- INSERT/UPDATE/DELETE: can_manage_organization (owner/admin + platform)

-- Verticals
CREATE POLICY "verticals_select"
ON verticals FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "verticals_write"
ON verticals FOR INSERT
WITH CHECK (can_manage_organization(organization_id));

CREATE POLICY "verticals_update"
ON verticals FOR UPDATE
USING (can_manage_organization(organization_id))
WITH CHECK (can_manage_organization(organization_id));

CREATE POLICY "verticals_delete"
ON verticals FOR DELETE
USING (can_manage_organization(organization_id));

-- Playbook Templates
CREATE POLICY "playbook_templates_select"
ON playbook_templates FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "playbook_templates_write"
ON playbook_templates FOR INSERT
WITH CHECK (can_manage_organization(organization_id));

CREATE POLICY "playbook_templates_update"
ON playbook_templates FOR UPDATE
USING (can_manage_organization(organization_id))
WITH CHECK (can_manage_organization(organization_id));

CREATE POLICY "playbook_templates_delete"
ON playbook_templates FOR DELETE
USING (can_manage_organization(organization_id));

-- Playbook Steps (join through playbook_templates)
CREATE POLICY "playbook_steps_select"
ON playbook_steps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM playbook_templates pt
    WHERE pt.id = playbook_template_id
    AND (pt.organization_id = get_user_organization_id() OR is_platform_user())
  )
);

CREATE POLICY "playbook_steps_write"
ON playbook_steps FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM playbook_templates pt
    WHERE pt.id = playbook_template_id
    AND can_manage_organization(pt.organization_id)
  )
);

CREATE POLICY "playbook_steps_update"
ON playbook_steps FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM playbook_templates pt
    WHERE pt.id = playbook_template_id
    AND can_manage_organization(pt.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM playbook_templates pt
    WHERE pt.id = playbook_template_id
    AND can_manage_organization(pt.organization_id)
  )
);

CREATE POLICY "playbook_steps_delete"
ON playbook_steps FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM playbook_templates pt
    WHERE pt.id = playbook_template_id
    AND can_manage_organization(pt.organization_id)
  )
);

-- Document Templates
CREATE POLICY "document_templates_select"
ON document_templates FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "document_templates_write"
ON document_templates FOR INSERT
WITH CHECK (can_manage_organization(organization_id));

CREATE POLICY "document_templates_update"
ON document_templates FOR UPDATE
USING (can_manage_organization(organization_id))
WITH CHECK (can_manage_organization(organization_id));

CREATE POLICY "document_templates_delete"
ON document_templates FOR DELETE
USING (can_manage_organization(organization_id));

-- Email Templates
CREATE POLICY "email_templates_select"
ON email_templates FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "email_templates_write"
ON email_templates FOR INSERT
WITH CHECK (can_manage_organization(organization_id));

CREATE POLICY "email_templates_update"
ON email_templates FOR UPDATE
USING (can_manage_organization(organization_id))
WITH CHECK (can_manage_organization(organization_id));

CREATE POLICY "email_templates_delete"
ON email_templates FOR DELETE
USING (can_manage_organization(organization_id));

-- ----- AUDIT LOGS -----

CREATE POLICY "audit_logs_select"
ON audit_logs FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

CREATE POLICY "audit_logs_insert"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_user_organization_id()
  OR (organization_id IS NULL AND auth.role() = 'authenticated')
  OR is_platform_user()
);

-- =====================================================
-- 1G. GRANTS & TRIGGER
-- =====================================================

GRANT EXECUTE ON FUNCTION public.is_platform_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_organization(uuid) TO authenticated;

CREATE TRIGGER update_platform_roles_updated_at
  BEFORE UPDATE ON platform_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DONE
-- =====================================================

SELECT 'Migration 018: Two-tier role system applied successfully' as status;
