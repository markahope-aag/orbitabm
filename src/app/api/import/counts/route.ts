import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

export async function GET() {
  try {
    const supabase = await createClient()
    const organization_id = await resolveUserOrgId(supabase)
    if (!organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tables = ['companies', 'contacts', 'markets', 'verticals', 'digital_snapshots'] as const

    const results = await Promise.all(
      tables.map(table =>
        supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization_id)
          .is('deleted_at', null)
      )
    )

    const counts: Record<string, number> = {}
    tables.forEach((table, i) => {
      counts[table] = results[i].count ?? 0
    })

    return NextResponse.json(counts)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
