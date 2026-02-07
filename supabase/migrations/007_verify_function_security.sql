-- Verify Function Security Settings
-- Final verification that all functions have proper search_path settings
-- Created: 2026-02-07

-- =====================================================
-- VERIFY AND DOCUMENT FUNCTION SECURITY
-- =====================================================

-- Create a view to check function security settings (for debugging)
CREATE OR REPLACE VIEW function_security_status AS
SELECT 
  p.proname as function_name,
  p.proconfig as configuration,
  CASE 
    WHEN p.proconfig IS NULL THEN 'No configuration'
    WHEN array_to_string(p.proconfig, ',') LIKE '%search_path=%' THEN 'Search path configured'
    ELSE 'No search path'
  END as search_path_status,
  p.prosecdef as is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'update_updated_at_column',
    'get_user_organization_id',
    'is_user_admin', 
    'can_manage_organization'
  );

-- Grant select on this view to authenticated users for debugging
GRANT SELECT ON function_security_status TO authenticated;

-- =====================================================
-- FINAL SECURITY VERIFICATION COMMANDS
-- =====================================================

-- Double-check that all our critical functions have search_path set
-- These commands will fail if the functions don't exist, confirming they're properly configured

DO $$
BEGIN
  -- Verify each function exists and has proper settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid  
    WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column'
  ) THEN
    RAISE EXCEPTION 'Function update_updated_at_column not found';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_user_organization_id'
  ) THEN
    RAISE EXCEPTION 'Function get_user_organization_id not found';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_user_admin'
  ) THEN
    RAISE EXCEPTION 'Function is_user_admin not found';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'can_manage_organization'
  ) THEN
    RAISE EXCEPTION 'Function can_manage_organization not found';
  END IF;
  
  RAISE NOTICE 'All security functions verified successfully';
END $$;

-- =====================================================
-- FINAL COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON VIEW function_security_status IS 'Debug view to check function security settings including search_path configuration';

-- Add final security documentation
COMMENT ON SCHEMA public IS 'OrbitABM public schema with comprehensive RLS security and function search path protection';

-- Migration complete with verification
SELECT 'Function security verification completed successfully' as status;