-- =====================================================
-- EMAIL AUTOMATION TABLES
-- Adds email sending queue, org-level email settings,
-- and unsubscribe tracking for CAN-SPAM compliance.
-- =====================================================

-- Enable pgcrypto for credential encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- EMAIL_SETTINGS TABLE (one per org)
-- Stores SES config, AWS creds (encrypted), sending prefs
-- =====================================================
CREATE TABLE email_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) UNIQUE,
    ses_region text NOT NULL DEFAULT 'us-east-2',
    ses_from_name text,
    ses_from_email text,
    ses_reply_to text,
    ses_config_set text,
    aws_access_key_id_encrypted text,
    aws_secret_key_encrypted text,
    daily_send_limit integer NOT NULL DEFAULT 50,
    sends_today integer NOT NULL DEFAULT 0,
    sends_today_reset_at date NOT NULL DEFAULT CURRENT_DATE,
    delay_between_sends_ms integer NOT NULL DEFAULT 1500,
    sending_enabled boolean NOT NULL DEFAULT false,
    signature_html text,
    signature_plain text,
    hubspot_token_encrypted text,
    hubspot_owner_id text,
    hubspot_enabled boolean NOT NULL DEFAULT false,
    unsubscribe_url text,
    sender_address text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_email_settings_organization_id ON email_settings(organization_id);

CREATE TRIGGER update_email_settings_updated_at
    BEFORE UPDATE ON email_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- EMAIL_SENDS TABLE (queue + log)
-- Each row = one email to one contact. Lifecycle:
-- queued → sending → delivered → opened/clicked/replied
-- or queued → cancelled / bounced / complained / failed
-- =====================================================
CREATE TABLE email_sends (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    campaign_id uuid REFERENCES campaigns(id),
    contact_id uuid REFERENCES contacts(id),
    activity_id uuid REFERENCES activities(id),
    email_template_id uuid REFERENCES email_templates(id),
    recipient_email text NOT NULL,
    from_email text NOT NULL,
    subject_line text NOT NULL,
    subject_line_variant text CHECK (subject_line_variant IN ('A', 'B')),
    body_plain text,
    body_html text,
    ses_message_id text UNIQUE,
    status text NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'sending', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'complained', 'failed', 'cancelled')),
    open_count integer NOT NULL DEFAULT 0,
    click_count integer NOT NULL DEFAULT 0,
    first_opened_at timestamptz,
    last_opened_at timestamptz,
    first_clicked_at timestamptz,
    clicked_links text[],
    bounced_at timestamptz,
    bounce_type text,
    complained_at timestamptz,
    scheduled_at timestamptz NOT NULL,
    sent_at timestamptz,
    error_message text,
    hubspot_engagement_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Key indexes for the sending engine
CREATE INDEX idx_email_sends_queue ON email_sends(status, scheduled_at) WHERE status = 'queued';
CREATE INDEX idx_email_sends_ses_message_id ON email_sends(ses_message_id) WHERE ses_message_id IS NOT NULL;
CREATE INDEX idx_email_sends_campaign_id ON email_sends(campaign_id);
CREATE INDEX idx_email_sends_contact_id ON email_sends(contact_id);
CREATE INDEX idx_email_sends_organization_id ON email_sends(organization_id);
CREATE INDEX idx_email_sends_status ON email_sends(status);

CREATE TRIGGER update_email_sends_updated_at
    BEFORE UPDATE ON email_sends
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- EMAIL_UNSUBSCRIBES TABLE
-- CAN-SPAM compliance: tracks opt-outs per org
-- =====================================================
CREATE TABLE email_unsubscribes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    contact_id uuid REFERENCES contacts(id),
    email_address text NOT NULL,
    reason text,
    source_email_send_id uuid REFERENCES email_sends(id),
    unsubscribed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    UNIQUE(organization_id, email_address)
);

CREATE INDEX idx_email_unsubscribes_organization_id ON email_unsubscribes(organization_id);
CREATE INDEX idx_email_unsubscribes_email_address ON email_unsubscribes(email_address);
CREATE INDEX idx_email_unsubscribes_contact_id ON email_unsubscribes(contact_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- email_settings: users can view their org's settings
CREATE POLICY "Users can view email_settings in their organization"
ON email_settings FOR SELECT
USING (organization_id = get_user_organization_id());

-- email_settings: managers can manage
CREATE POLICY "Managers can manage email_settings in their organization"
ON email_settings FOR ALL
USING (
    can_manage_organization(organization_id)
)
WITH CHECK (
    organization_id = get_user_organization_id() AND
    can_manage_organization(organization_id)
);

-- email_sends: users can view their org's sends
CREATE POLICY "Users can view email_sends in their organization"
ON email_sends FOR SELECT
USING (organization_id = get_user_organization_id());

-- email_sends: users can manage their org's sends
CREATE POLICY "Users can manage email_sends in their organization"
ON email_sends FOR ALL
USING (
    organization_id = get_user_organization_id()
)
WITH CHECK (
    organization_id = get_user_organization_id()
);

-- email_unsubscribes: users can view their org's unsubscribes
CREATE POLICY "Users can view email_unsubscribes in their organization"
ON email_unsubscribes FOR SELECT
USING (organization_id = get_user_organization_id());

-- email_unsubscribes: users can manage their org's unsubscribes
CREATE POLICY "Users can manage email_unsubscribes in their organization"
ON email_unsubscribes FOR ALL
USING (
    organization_id = get_user_organization_id()
)
WITH CHECK (
    organization_id = get_user_organization_id()
);

-- Migration complete
SELECT 'Email automation tables migration completed successfully' as status;
