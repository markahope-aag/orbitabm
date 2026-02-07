-- Fix Security Definer Views (Round 2)
-- Drop and recreate all views without SECURITY DEFINER
-- The linter still reports these views as SECURITY DEFINER
-- Created: 2026-02-07

-- =====================================================
-- DROP AND RECREATE VIEWS WITHOUT SECURITY DEFINER
-- =====================================================

-- Drop all flagged views
DROP VIEW IF EXISTS public.company_latest_snapshot CASCADE;
DROP VIEW IF EXISTS public.active_campaigns_summary CASCADE;
DROP VIEW IF EXISTS public.function_security_status CASCADE;

-- Recreate company_latest_snapshot (SECURITY INVOKER is the default, but be explicit)
CREATE VIEW public.company_latest_snapshot
WITH (security_invoker = true)
AS
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
ORDER BY ds.company_id, ds.snapshot_date DESC NULLS LAST;

-- Recreate active_campaigns_summary
CREATE VIEW public.active_campaigns_summary
WITH (security_invoker = true)
AS
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

-- Recreate function_security_status
CREATE VIEW public.function_security_status
WITH (security_invoker = true)
AS
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

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON public.company_latest_snapshot TO authenticated;
GRANT SELECT ON public.active_campaigns_summary TO authenticated;
GRANT SELECT ON public.function_security_status TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON VIEW public.company_latest_snapshot IS 'Latest digital snapshot data for each company, filtered by RLS policies. Uses security_invoker.';
COMMENT ON VIEW public.active_campaigns_summary IS 'Summary statistics for active and planned campaigns, filtered by RLS policies. Uses security_invoker.';
COMMENT ON VIEW public.function_security_status IS 'Debug view to check function security settings. Uses security_invoker.';

-- Migration complete
SELECT 'Security definer views fixed with security_invoker = true' as status;
