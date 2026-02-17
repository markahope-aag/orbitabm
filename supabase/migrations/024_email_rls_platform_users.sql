-- =====================================================
-- Fix email table RLS policies to allow platform users
-- (Aligns with migration 018 pattern used on all other tables)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view email_settings in their organization" ON email_settings;
DROP POLICY IF EXISTS "Managers can manage email_settings in their organization" ON email_settings;
DROP POLICY IF EXISTS "Users can view email_sends in their organization" ON email_sends;
DROP POLICY IF EXISTS "Users can manage email_sends in their organization" ON email_sends;
DROP POLICY IF EXISTS "Users can view email_unsubscribes in their organization" ON email_unsubscribes;
DROP POLICY IF EXISTS "Users can manage email_unsubscribes in their organization" ON email_unsubscribes;

-- email_settings: SELECT
CREATE POLICY "email_settings_select"
ON email_settings FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

-- email_settings: ALL (insert/update/delete)
CREATE POLICY "email_settings_write"
ON email_settings FOR ALL
USING (
    (can_manage_organization(organization_id) OR is_platform_user())
)
WITH CHECK (
    (can_manage_organization(organization_id) OR is_platform_user())
);

-- email_sends: SELECT
CREATE POLICY "email_sends_select"
ON email_sends FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

-- email_sends: ALL
CREATE POLICY "email_sends_write"
ON email_sends FOR ALL
USING (
    (organization_id = get_user_organization_id() OR is_platform_user())
)
WITH CHECK (
    (organization_id = get_user_organization_id() OR is_platform_user())
);

-- email_unsubscribes: SELECT
CREATE POLICY "email_unsubscribes_select"
ON email_unsubscribes FOR SELECT
USING (organization_id = get_user_organization_id() OR is_platform_user());

-- email_unsubscribes: ALL
CREATE POLICY "email_unsubscribes_write"
ON email_unsubscribes FOR ALL
USING (
    (organization_id = get_user_organization_id() OR is_platform_user())
)
WITH CHECK (
    (organization_id = get_user_organization_id() OR is_platform_user())
);
