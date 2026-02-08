-- =====================================================
-- Migration 017: Duplicate Detection
-- Adds domain-based company dedup, email-based contact dedup,
-- and normalized name matching for markets/verticals.
-- =====================================================

-- =====================================================
-- SQL FUNCTIONS
-- =====================================================

-- extract_domain: strips protocol, www., path/query/port, returns lowercase domain
CREATE OR REPLACE FUNCTION extract_domain(url text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  IF url IS NULL OR url = '' THEN
    RETURN NULL;
  END IF;

  result := url;

  -- Strip protocol
  result := regexp_replace(result, '^https?://', '', 'i');

  -- Strip www.
  result := regexp_replace(result, '^www\.', '', 'i');

  -- Strip path, query, fragment
  result := regexp_replace(result, '[/?#].*$', '');

  -- Strip port
  result := regexp_replace(result, ':\d+$', '');

  -- Lowercase and trim
  result := lower(trim(result));

  IF result = '' THEN
    RETURN NULL;
  END IF;

  RETURN result;
END;
$$;

-- normalize_entity_name: lowercase, strip non-alphanumeric (keep spaces), collapse whitespace
CREATE OR REPLACE FUNCTION normalize_entity_name(name text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  IF name IS NULL OR name = '' THEN
    RETURN NULL;
  END IF;

  result := lower(trim(name));

  -- Strip non-alphanumeric except spaces
  result := regexp_replace(result, '[^a-z0-9 ]', '', 'g');

  -- Collapse multiple spaces
  result := regexp_replace(result, '\s+', ' ', 'g');

  result := trim(result);

  IF result = '' THEN
    RETURN NULL;
  END IF;

  RETURN result;
END;
$$;


-- =====================================================
-- SCHEMA CHANGES
-- =====================================================

-- Companies: add domain column
ALTER TABLE companies ADD COLUMN IF NOT EXISTS domain text;

-- Markets: add name_normalized column
ALTER TABLE markets ADD COLUMN IF NOT EXISTS name_normalized text;

-- Verticals: add name_normalized column
ALTER TABLE verticals ADD COLUMN IF NOT EXISTS name_normalized text;


-- =====================================================
-- BACKFILL EXISTING DATA
-- =====================================================

UPDATE companies SET domain = extract_domain(website) WHERE website IS NOT NULL AND domain IS NULL;
UPDATE markets SET name_normalized = normalize_entity_name(name) WHERE name_normalized IS NULL;
UPDATE verticals SET name_normalized = normalize_entity_name(name) WHERE name_normalized IS NULL;


-- =====================================================
-- HANDLE COLLISIONS BEFORE ADDING UNIQUE INDEXES
-- =====================================================

-- Deduplicate markets by normalized name: keep oldest, soft-delete newer
UPDATE markets SET deleted_at = now()
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY organization_id, name_normalized
             ORDER BY created_at ASC
           ) AS rn
    FROM markets
    WHERE deleted_at IS NULL AND name_normalized IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Deduplicate verticals by normalized name: keep oldest, soft-delete newer
UPDATE verticals SET deleted_at = now()
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY organization_id, name_normalized
             ORDER BY created_at ASC
           ) AS rn
    FROM verticals
    WHERE deleted_at IS NULL AND name_normalized IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Deduplicate companies by domain: keep oldest, soft-delete newer
UPDATE companies SET deleted_at = now()
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY organization_id, domain
             ORDER BY created_at ASC
           ) AS rn
    FROM companies
    WHERE deleted_at IS NULL AND domain IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Deduplicate contacts by email within org: keep oldest, soft-delete newer
UPDATE contacts SET deleted_at = now()
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY organization_id, lower(email)
             ORDER BY created_at ASC
           ) AS rn
    FROM contacts
    WHERE deleted_at IS NULL AND email IS NOT NULL
  ) ranked
  WHERE rn > 1
);


-- =====================================================
-- UNIQUE INDEXES
-- =====================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_org_domain_unique
  ON companies (organization_id, domain)
  WHERE domain IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_org_name_normalized_unique
  ON markets (organization_id, name_normalized)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_verticals_org_name_normalized_unique
  ON verticals (organization_id, name_normalized)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_org_email_unique
  ON contacts (organization_id, lower(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL;


-- =====================================================
-- TRIGGERS (auto-populate computed columns)
-- =====================================================

-- Companies: auto-set domain from website
CREATE OR REPLACE FUNCTION set_company_domain()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.domain := extract_domain(NEW.website);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_set_domain ON companies;
CREATE TRIGGER trg_companies_set_domain
  BEFORE INSERT OR UPDATE OF website ON companies
  FOR EACH ROW
  EXECUTE FUNCTION set_company_domain();

-- Markets: auto-set name_normalized from name
CREATE OR REPLACE FUNCTION set_market_name_normalized()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.name_normalized := normalize_entity_name(NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_markets_set_name_normalized ON markets;
CREATE TRIGGER trg_markets_set_name_normalized
  BEFORE INSERT OR UPDATE OF name ON markets
  FOR EACH ROW
  EXECUTE FUNCTION set_market_name_normalized();

-- Verticals: auto-set name_normalized from name
CREATE OR REPLACE FUNCTION set_vertical_name_normalized()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.name_normalized := normalize_entity_name(NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verticals_set_name_normalized ON verticals;
CREATE TRIGGER trg_verticals_set_name_normalized
  BEFORE INSERT OR UPDATE OF name ON verticals
  FOR EACH ROW
  EXECUTE FUNCTION set_vertical_name_normalized();


-- Migration complete
SELECT 'Migration 017: Duplicate detection added successfully' as status;
