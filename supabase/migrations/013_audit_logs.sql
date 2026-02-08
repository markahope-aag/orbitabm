-- OrbitABM Audit Logging Migration
-- Immutable append-only audit trail for all entity mutations
-- Created: 2026-02-07

-- =====================================================
-- CREATE AUDIT_LOGS TABLE
-- =====================================================

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

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_audit_logs_organization_id ON audit_logs (organization_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_org_created ON audit_logs (organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view audit logs for their organization
CREATE POLICY "Users can view audit logs for their organization"
  ON audit_logs FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No UPDATE or DELETE policies — audit logs are immutable
