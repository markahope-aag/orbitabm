-- Schema Fixes Migration
-- Adds missing deleted_at columns and fixes constraints
-- Created: 2026-02-07

-- =====================================================
-- ADD MISSING deleted_at COLUMNS
-- These tables are filtered with deleted_at in the app
-- but were missing the column in the schema
-- =====================================================

ALTER TABLE activities ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE results ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE campaign_competitors ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE digital_snapshots ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE playbook_steps ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE pe_acquisitions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- =====================================================
-- FIX readiness_score CONSTRAINT
-- Allow 0 as a valid score (initial/unscored state)
-- =====================================================

-- Drop the existing constraint and recreate with 0 allowed
ALTER TABLE generated_documents DROP CONSTRAINT IF EXISTS generated_documents_readiness_score_check;
ALTER TABLE generated_documents ADD CONSTRAINT generated_documents_readiness_score_check
  CHECK (readiness_score BETWEEN 0 AND 10);

-- Also fix on companies table if it exists
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_readiness_score_check;
ALTER TABLE companies ADD CONSTRAINT companies_readiness_score_check
  CHECK (readiness_score BETWEEN 0 AND 10);

-- =====================================================
-- ADD INDEXES FOR NEW deleted_at COLUMNS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_activities_deleted_at ON activities(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_results_deleted_at ON results(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_competitors_deleted_at ON campaign_competitors(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_digital_snapshots_deleted_at ON digital_snapshots(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_playbook_steps_deleted_at ON playbook_steps(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pe_acquisitions_deleted_at ON pe_acquisitions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_templates_deleted_at ON email_templates(deleted_at) WHERE deleted_at IS NULL;

-- Migration complete
SELECT 'Schema fixes applied successfully' as status;
