-- Add unique constraint on (organization_id, name) for companies table
-- Required for upsert ON CONFLICT in the import API, and prevents duplicate company names within an org
ALTER TABLE companies
ADD CONSTRAINT companies_organization_id_name_key
UNIQUE (organization_id, name);
