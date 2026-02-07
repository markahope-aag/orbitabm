-- Recreate Functions with Proper Search Path
-- Drop and recreate all functions to ensure search_path is properly set
-- Created: 2026-02-07

-- =====================================================
-- TEMPORARILY DROP ALL POLICIES THAT DEPEND ON FUNCTIONS
-- =====================================================

-- Drop RLS policies that depend on our functions
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Managers can update their organization" ON organizations;
DROP POLICY IF EXISTS "Admins can delete organizations" ON organizations;

DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON profiles;

DROP POLICY IF EXISTS "Users can view verticals in their organization" ON verticals;
DROP POLICY IF EXISTS "Managers can manage verticals in their organization" ON verticals;

DROP POLICY IF EXISTS "Users can view companies in their organization" ON companies;
DROP POLICY IF EXISTS "Users can manage companies in their organization" ON companies;

DROP POLICY IF EXISTS "Users can view contacts in their organization" ON contacts;
DROP POLICY IF EXISTS "Users can manage contacts in their organization" ON contacts;

DROP POLICY IF EXISTS "Users can view pe_acquisitions in their organization" ON pe_acquisitions;
DROP POLICY IF EXISTS "Users can manage pe_acquisitions in their organization" ON pe_acquisitions;

DROP POLICY IF EXISTS "Users can view digital_snapshots in their organization" ON digital_snapshots;
DROP POLICY IF EXISTS "Users can manage digital_snapshots in their organization" ON digital_snapshots;

DROP POLICY IF EXISTS "Users can view playbook_templates in their organization" ON playbook_templates;
DROP POLICY IF EXISTS "Managers can manage playbook_templates in their organization" ON playbook_templates;

DROP POLICY IF EXISTS "Users can view playbook_steps in their organization" ON playbook_steps;
DROP POLICY IF EXISTS "Managers can manage playbook_steps in their organization" ON playbook_steps;

DROP POLICY IF EXISTS "Users can view campaigns in their organization" ON campaigns;
DROP POLICY IF EXISTS "Users can manage campaigns in their organization" ON campaigns;

DROP POLICY IF EXISTS "Users can view campaign_competitors in their organization" ON campaign_competitors;
DROP POLICY IF EXISTS "Users can manage campaign_competitors in their organization" ON campaign_competitors;

DROP POLICY IF EXISTS "Users can view activities in their organization" ON activities;
DROP POLICY IF EXISTS "Users can manage activities in their organization" ON activities;

DROP POLICY IF EXISTS "Users can view assets in their organization" ON assets;
DROP POLICY IF EXISTS "Users can manage assets in their organization" ON assets;

DROP POLICY IF EXISTS "Users can view results in their organization" ON results;
DROP POLICY IF EXISTS "Users can manage results in their organization" ON results;

DROP POLICY IF EXISTS "Users can view document_templates in their organization" ON document_templates;
DROP POLICY IF EXISTS "Managers can manage document_templates in their organization" ON document_templates;

DROP POLICY IF EXISTS "Users can view generated_documents in their organization" ON generated_documents;
DROP POLICY IF EXISTS "Users can manage generated_documents in their organization" ON generated_documents;

DROP POLICY IF EXISTS "Users can view email_templates in their organization" ON email_templates;
DROP POLICY IF EXISTS "Managers can manage email_templates in their organization" ON email_templates;

-- =====================================================
-- DROP AND RECREATE FUNCTIONS WITH PROPER SEARCH PATH
-- =====================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS public.get_user_organization_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_user_admin() CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_organization(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Recreate trigger function with explicit search_path
CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Recreate RLS helper functions with explicit search_path
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

CREATE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role = 'admin'
  FROM public.profiles 
  WHERE id = auth.uid()
$$;

CREATE FUNCTION public.can_manage_organization(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND organization_id = org_id 
    AND role IN ('admin', 'manager')
  )
$$;

-- =====================================================
-- RECREATE ALL TRIGGERS
-- =====================================================

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verticals_updated_at
    BEFORE UPDATE ON verticals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pe_acquisitions_updated_at
    BEFORE UPDATE ON pe_acquisitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playbook_templates_updated_at
    BEFORE UPDATE ON playbook_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playbook_steps_updated_at
    BEFORE UPDATE ON playbook_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_results_updated_at
    BEFORE UPDATE ON results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_documents_updated_at
    BEFORE UPDATE ON generated_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RECREATE ALL RLS POLICIES
-- =====================================================

-- Organizations policies
CREATE POLICY "Users can view their organization"
ON organizations FOR SELECT
USING (id = get_user_organization_id());

CREATE POLICY "Admins can create organizations"
ON organizations FOR INSERT
WITH CHECK (is_user_admin());

CREATE POLICY "Managers can update their organization"
ON organizations FOR UPDATE
USING (can_manage_organization(id))
WITH CHECK (can_manage_organization(id));

CREATE POLICY "Admins can delete organizations"
ON organizations FOR DELETE
USING (is_user_admin());

-- Profiles policies
CREATE POLICY "Users can view profiles in their organization"
ON profiles FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

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

-- Verticals policies
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

-- Companies policies
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

-- Contacts policies
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

-- PE Acquisitions policies
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

-- Digital Snapshots policies
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

-- Playbook Templates policies
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

-- Playbook Steps policies
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

-- Campaigns policies
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

-- Campaign Competitors policies
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

-- Activities policies
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

-- Assets policies
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

-- Results policies
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

-- Document Templates policies
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

-- Generated Documents policies
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

-- Email Templates policies
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
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users for RLS helper functions
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_organization(uuid) TO authenticated;

-- The trigger function should only be executable by the system
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO postgres;

-- =====================================================
-- ADD COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamp. Search path explicitly set to public to prevent injection attacks.';
COMMENT ON FUNCTION public.get_user_organization_id() IS 'Returns the organization ID for the current authenticated user. Used in RLS policies. Search path explicitly set to public.';
COMMENT ON FUNCTION public.is_user_admin() IS 'Checks if the current user has admin role. Used in RLS policies. Search path explicitly set to public.';
COMMENT ON FUNCTION public.can_manage_organization(uuid) IS 'Checks if the current user can manage the specified organization. Used in RLS policies. Search path explicitly set to public.';

-- Migration complete
SELECT 'Functions recreated with proper search_path settings' as status;