-- Fix Security Definer Views
-- Drop and recreate views without SECURITY DEFINER property
-- Created: 2026-02-07

-- =====================================================
-- DROP EXISTING VIEWS WITH SECURITY DEFINER
-- =====================================================

DROP VIEW IF EXISTS public.company_latest_snapshot CASCADE;
DROP VIEW IF EXISTS public.active_campaigns_summary CASCADE;

-- =====================================================
-- RECREATE VIEWS WITHOUT SECURITY DEFINER
-- =====================================================

-- Company Latest Snapshot View
-- Shows the most recent digital snapshot for each company
CREATE VIEW public.company_latest_snapshot AS
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

-- Active Campaigns Summary View  
-- Provides summary statistics for active and planned campaigns
CREATE VIEW public.active_campaigns_summary AS
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
-- GRANT PERMISSIONS
-- =====================================================

-- Grant select permissions to authenticated users
-- RLS policies will handle organization-level filtering
GRANT SELECT ON public.company_latest_snapshot TO authenticated;
GRANT SELECT ON public.active_campaigns_summary TO authenticated;

-- =====================================================
-- ADD COMMENTS
-- =====================================================

COMMENT ON VIEW public.company_latest_snapshot IS 'Latest digital snapshot data for each company, filtered by RLS policies';
COMMENT ON VIEW public.active_campaigns_summary IS 'Summary statistics for active and planned campaigns, filtered by RLS policies';

-- Migration complete
SELECT 'Security definer views fixed successfully' as status;