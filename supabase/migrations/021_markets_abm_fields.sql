-- 021: Add ABM intelligence fields to markets table
-- These fields drive campaign planning, market prioritization,
-- outreach timing, and ROI forecasting.

ALTER TABLE markets
  ADD COLUMN target_company_count integer CHECK (target_company_count >= 0),
  ADD COLUMN pe_consolidation_status text CHECK (pe_consolidation_status IN ('low', 'moderate', 'high')),
  ADD COLUMN competition_level text CHECK (competition_level IN ('low', 'moderate', 'high')),
  ADD COLUMN primary_trade_association varchar(255),
  ADD COLUMN peak_season_months varchar(100),
  ADD COLUMN market_maturity text CHECK (market_maturity IN ('emerging', 'growing', 'mature', 'declining')),
  ADD COLUMN avg_cpc_estimate numeric(8,2) CHECK (avg_cpc_estimate >= 0),
  ADD COLUMN last_updated timestamptz DEFAULT now();
