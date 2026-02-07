-- Fix Function Search Path Security Issues
-- Set explicit search_path for all functions to prevent injection attacks
-- Created: 2026-02-07

-- =====================================================
-- FIX SEARCH PATH FOR TRIGGER FUNCTION
-- =====================================================

-- Drop and recreate the trigger function with explicit search_path
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
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

-- Recreate all triggers that use this function
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

-- Document intelligence table triggers
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
-- FIX SEARCH PATH FOR RLS HELPER FUNCTIONS
-- =====================================================

-- Replace RLS helper functions with explicit search_path (don't drop - they're used by policies)

-- Function to get user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
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
SET search_path = public
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
SET search_path = public
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
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users for RLS helper functions
GRANT EXECUTE ON FUNCTION get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_organization(uuid) TO authenticated;

-- The trigger function should only be executable by the system
REVOKE EXECUTE ON FUNCTION update_updated_at_column() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO postgres;

-- =====================================================
-- ADD FUNCTION COMMENTS
-- =====================================================

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamp. Search path secured to prevent injection attacks.';
COMMENT ON FUNCTION get_user_organization_id() IS 'Returns the organization ID for the current authenticated user. Used in RLS policies.';
COMMENT ON FUNCTION is_user_admin() IS 'Checks if the current user has admin role. Used in RLS policies.';
COMMENT ON FUNCTION can_manage_organization(uuid) IS 'Checks if the current user can manage the specified organization. Used in RLS policies.';

-- Migration complete
SELECT 'Function search path security issues fixed successfully' as status;