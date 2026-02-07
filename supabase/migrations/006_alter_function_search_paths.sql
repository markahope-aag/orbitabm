-- Alter Function Search Paths - Direct Approach
-- Use ALTER FUNCTION to set search_path on existing functions
-- Created: 2026-02-07

-- =====================================================
-- ALTER EXISTING FUNCTIONS TO SET SEARCH PATH
-- =====================================================

-- Set search path for trigger function
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Set search path for RLS helper functions
ALTER FUNCTION public.get_user_organization_id() SET search_path = public;
ALTER FUNCTION public.is_user_admin() SET search_path = public;
ALTER FUNCTION public.can_manage_organization(uuid) SET search_path = public;

-- =====================================================
-- VERIFY FUNCTION SECURITY SETTINGS
-- =====================================================

-- Add comments to document the security settings
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamp. Search path secured to prevent injection attacks.';
COMMENT ON FUNCTION public.get_user_organization_id() IS 'Returns the organization ID for the current authenticated user. Used in RLS policies. Search path secured.';
COMMENT ON FUNCTION public.is_user_admin() IS 'Checks if the current user has admin role. Used in RLS policies. Search path secured.';
COMMENT ON FUNCTION public.can_manage_organization(uuid) IS 'Checks if the current user can manage the specified organization. Used in RLS policies. Search path secured.';

-- =====================================================
-- ENSURE PROPER PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users for RLS helper functions
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_organization(uuid) TO authenticated;

-- The trigger function should only be executable by the system
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO postgres;

-- Migration complete
SELECT 'Function search paths altered successfully' as status;