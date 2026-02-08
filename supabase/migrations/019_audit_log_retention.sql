-- Enable pg_cron extension (Supabase Pro plans have this available)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage so the cron job can execute
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule nightly cleanup at 03:00 UTC — delete audit logs older than 90 days
SELECT cron.schedule(
  'audit-log-cleanup',
  '0 3 * * *',
  $$DELETE FROM public.audit_logs WHERE created_at < now() - interval '90 days'$$
);

-- Add a comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL — used for audit log retention (90-day purge)';
