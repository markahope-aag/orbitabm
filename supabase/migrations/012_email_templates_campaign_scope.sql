-- =====================================================
-- SCOPE EMAIL TEMPLATES TO CAMPAIGNS
-- Adds campaign_id so templates can be per-campaign
-- rather than shared across all campaigns using the
-- same playbook step. Org-level defaults have NULL
-- campaign_id; campaign-specific copies have it set.
-- =====================================================

ALTER TABLE email_templates
  ADD COLUMN campaign_id uuid REFERENCES campaigns(id);

CREATE INDEX idx_email_templates_campaign_id
  ON email_templates(campaign_id);

-- Migration complete
SELECT 'Email templates campaign scope migration completed successfully' as status;
