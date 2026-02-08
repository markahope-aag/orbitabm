-- Create profile automatically when a new user signs up via Supabase Auth
-- Uses organization_name from signup metadata to create a new org,
-- or falls back to the first existing organization.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  org_id uuid;
  org_name text;
  org_slug text;
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
    END IF;
  END IF;

  -- Fall back to first existing organization if none resolved
  IF org_id IS NULL THEN
    SELECT id INTO org_id FROM organizations WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1;
  END IF;

  -- Only create profile if we have an organization
  IF org_id IS NOT NULL THEN
    INSERT INTO profiles (id, organization_id, role, full_name)
    VALUES (
      NEW.id,
      org_id,
      'viewer',
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
