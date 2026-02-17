-- =====================================================
-- CAMPAIGNS: NULLABLE COMPANY & VERTICAL
-- Allows org-wide ABM campaigns that target multiple
-- companies (e.g., BluePoint Reverse ATM), alongside
-- single-company campaigns (e.g., HVAC per-contractor).
-- =====================================================

ALTER TABLE campaigns ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE campaigns ALTER COLUMN vertical_id DROP NOT NULL;
ALTER TABLE campaigns ALTER COLUMN market_id DROP NOT NULL;

COMMENT ON COLUMN campaigns.company_id IS 'Target company (NULL for multi-company ABM campaigns)';
COMMENT ON COLUMN campaigns.vertical_id IS 'Target vertical (NULL for cross-vertical ABM campaigns)';
COMMENT ON COLUMN campaigns.market_id IS 'Target market (NULL for multi-market ABM campaigns)';

SELECT 'Campaigns nullable company/vertical migration completed' as status;
