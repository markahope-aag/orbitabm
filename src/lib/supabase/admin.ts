import { createClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/config'

export function createAdminClient() {
  const key = supabaseConfig.serviceRoleKey
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createClient(supabaseConfig.url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
