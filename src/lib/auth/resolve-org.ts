import { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { PlatformRole } from '@/lib/types/database'

/**
 * Resolves the organization_id for the currently authenticated user.
 * For platform users, reads the selected org from the `orbit_current_org` cookie.
 * For standard users, reads from their profile record.
 * Returns null if the user is not authenticated or has no profile.
 */
export async function resolveUserOrgId(
  supabase: SupabaseClient
): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user?.id) return null

    // Check if user is a platform user
    const { data: platformRole } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (platformRole) {
      // Platform user: use cookie-based org selection
      const cookieStore = await cookies()
      const orgCookie = cookieStore.get('orbit_current_org')
      if (orgCookie?.value) return orgCookie.value
      // Fallback to profile's home org
    }

    // Standard user (or platform user without cookie): org from profile
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

/**
 * Resolves the platform role for the currently authenticated user.
 * Returns null if the user is not a platform user.
 */
export async function resolveUserPlatformRole(
  supabase: SupabaseClient
): Promise<PlatformRole | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user?.id) return null

    const { data } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    return (data?.role as PlatformRole) ?? null
  } catch {
    return null
  }
}
