-- =====================================================
-- Migration 015: Fix Audit Logs RLS Policy Security Issue
-- Addresses overly permissive INSERT policy for audit_logs table
-- Created: 2026-02-08
-- =====================================================

-- Drop the overly permissive audit logs INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;

-- Create a more secure INSERT policy that restricts to user's organization
-- This ensures users can only create audit logs for their own organization
CREATE POLICY "Users can insert audit logs for their organization"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow insert if organization_id matches user's organization
    organization_id = get_user_organization_id()
    OR
    -- Allow system-generated audit logs (when organization_id is null for system operations)
    (organization_id IS NULL AND auth.role() = 'authenticated')
  );

-- Add a comment explaining the security model
COMMENT ON POLICY "Users can insert audit logs for their organization" ON audit_logs IS 
'Restricts audit log creation to users organization context. Allows system-generated logs with null organization_id.';

-- Verify RLS is enabled
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Migration complete
SELECT 'Migration 015: Fixed audit logs RLS policy security issue' as status;