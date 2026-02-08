import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolves the organization_id for the currently authenticated user
 * by looking up their profile record. Returns null if the user is
 * not authenticated or has no profile.
 */
export async function resolveUserOrgId(
  supabase: SupabaseClient
): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user?.id) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single()

    return profile?.organization_id ?? null
  } catch {
    return null
  }
}
