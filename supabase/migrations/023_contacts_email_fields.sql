-- =====================================================
-- ADD EMAIL FIELDS TO EXISTING TABLES
-- =====================================================

-- contacts: track unsubscribe status
ALTER TABLE contacts
    ADD COLUMN IF NOT EXISTS email_unsubscribed boolean DEFAULT false;

-- email_templates: allow opting out of unsubscribe footer
ALTER TABLE email_templates
    ADD COLUMN IF NOT EXISTS include_unsubscribe_footer boolean DEFAULT true;

-- Migration complete
SELECT 'Contacts email fields migration completed successfully' as status;
