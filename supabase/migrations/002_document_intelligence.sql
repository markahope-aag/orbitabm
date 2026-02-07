-- OrbitABM Document Intelligence Migration
-- Adds document templates, generated documents, and email templates
-- Extends campaigns, contacts, and companies with new fields
-- Created: 2026-02-07

-- =====================================================
-- DOCUMENT_TEMPLATES TABLE
-- Reusable document structures per client/vertical
-- =====================================================
CREATE TABLE document_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    name text NOT NULL,
    document_type text NOT NULL CHECK (document_type IN ('prospect_research', 'campaign_sequence', 'competitive_analysis', 'audit_report', 'proposal')),
    vertical_id uuid REFERENCES verticals(id),
    template_structure jsonb NOT NULL,
    version integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX idx_document_templates_organization_id ON document_templates(organization_id);
CREATE INDEX idx_document_templates_document_type ON document_templates(document_type);
CREATE INDEX idx_document_templates_vertical_id ON document_templates(vertical_id);
CREATE INDEX idx_document_templates_is_active ON document_templates(is_active);

CREATE TRIGGER update_document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GENERATED_DOCUMENTS TABLE
-- Assembled document output (research, sequences, analyses)
-- =====================================================
CREATE TABLE generated_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    document_template_id uuid REFERENCES document_templates(id),
    company_id uuid REFERENCES companies(id),
    campaign_id uuid REFERENCES campaigns(id),
    title text NOT NULL,
    document_type text NOT NULL CHECK (document_type IN ('prospect_research', 'campaign_sequence', 'competitive_analysis', 'audit_report', 'proposal')),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'delivered', 'archived')),
    content jsonb NOT NULL DEFAULT '{}',
    readiness_score integer CHECK (readiness_score BETWEEN 1 AND 10),
    version integer DEFAULT 1,
    approved_by uuid REFERENCES profiles(id),
    approved_at timestamptz,
    last_generated_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX idx_generated_documents_organization_id ON generated_documents(organization_id);
CREATE INDEX idx_generated_documents_company_id ON generated_documents(company_id);
CREATE INDEX idx_generated_documents_campaign_id ON generated_documents(campaign_id);
CREATE INDEX idx_generated_documents_document_type ON generated_documents(document_type);
CREATE INDEX idx_generated_documents_status ON generated_documents(status);

CREATE TRIGGER update_generated_documents_updated_at
    BEFORE UPDATE ON generated_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- EMAIL_TEMPLATES TABLE
-- Email templates linked to playbook steps with merge fields
-- =====================================================
CREATE TABLE email_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    playbook_step_id uuid REFERENCES playbook_steps(id),
    name text NOT NULL,
    subject_line text NOT NULL,
    subject_line_alt text,
    body text NOT NULL,
    target_contact_role text CHECK (target_contact_role IN ('economic_buyer', 'technical_buyer', 'brand_buyer', 'champion', 'any')),
    merge_fields_required text[],
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_email_templates_organization_id ON email_templates(organization_id);
CREATE INDEX idx_email_templates_playbook_step_id ON email_templates(playbook_step_id);
CREATE INDEX idx_email_templates_target_contact_role ON email_templates(target_contact_role);

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ALTER EXISTING TABLES
-- =====================================================

-- Campaigns: add strategy fields and document references
ALTER TABLE campaigns ADD COLUMN value_proposition text;
ALTER TABLE campaigns ADD COLUMN primary_wedge text;
ALTER TABLE campaigns ADD COLUMN backup_trigger text;
ALTER TABLE campaigns ADD COLUMN success_criteria text;
ALTER TABLE campaigns ADD COLUMN research_doc_id uuid REFERENCES generated_documents(id);
ALTER TABLE campaigns ADD COLUMN sequence_doc_id uuid REFERENCES generated_documents(id);

-- Contacts: add DMU role and email verification
ALTER TABLE contacts ADD COLUMN dmu_role text CHECK (dmu_role IN ('economic_buyer', 'technical_buyer', 'brand_buyer', 'champion', 'blocker', 'influencer', 'unknown'));
ALTER TABLE contacts ADD COLUMN email_verified boolean DEFAULT false;
ALTER TABLE contacts ADD COLUMN email_verification_date date;

-- Companies: add readiness score and research tracking
ALTER TABLE companies ADD COLUMN readiness_score integer CHECK (readiness_score BETWEEN 1 AND 10);
ALTER TABLE companies ADD COLUMN last_researched_at timestamptz;

-- =====================================================
-- TABLE COMMENTS
-- =====================================================
COMMENT ON TABLE document_templates IS 'Reusable document structures per client/vertical';
COMMENT ON TABLE generated_documents IS 'Assembled document output — research docs, sequences, analyses';
COMMENT ON TABLE email_templates IS 'Email templates linked to playbook steps with merge field placeholders';

-- Migration complete
SELECT 'Document intelligence migration completed successfully' as status;
