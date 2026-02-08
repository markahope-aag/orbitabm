-- Fix: When a user creates a new organization during signup, they should be
-- the owner of that org, not a viewer. Only users joining an existing org
-- default to viewer.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  org_id uuid;
  org_name text;
  org_slug text;
  created_new_org boolean := false;
  assigned_role text := 'viewer';
BEGIN
  -- Check if signup included an organization name
  org_name := NEW.raw_user_meta_data->>'organization_name';

  IF org_name IS NOT NULL AND org_name != '' THEN
    -- Generate a slug from the org name
    org_slug := lower(regexp_replace(trim(org_name), '[^a-zA-Z0-9]+', '-', 'g'));
    org_slug := trim(BOTH '-' FROM org_slug);

    -- Check for existing org with same slug
    SELECT id INTO org_id FROM organizations WHERE slug = org_slug AND deleted_at IS NULL;

    -- Create new org if slug doesn't exist
    IF org_id IS NULL THEN
      INSERT INTO organizations (name, slug, type)
      VALUES (org_name, org_slug, 'client')
      RETURNING id INTO org_id;
      created_new_org := true;
    END IF;
  END IF;

  -- Fall back to first existing organization if none resolved
  IF org_id IS NULL THEN
    SELECT id INTO org_id FROM organizations WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1;
  END IF;

  -- User who created a new org becomes owner; otherwise viewer
  IF created_new_org THEN
    assigned_role := 'owner';
  END IF;

  -- Only create profile if we have an organization
  IF org_id IS NOT NULL THEN
    INSERT INTO profiles (id, organization_id, role, full_name)
    VALUES (
      NEW.id,
      org_id,
      assigned_role,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
