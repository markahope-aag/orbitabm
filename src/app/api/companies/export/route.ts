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

    const { data, error } = await supabase
      .from('companies')
      .select('*, market:markets(name), vertical:verticals(name)')
      .eq('organization_id', organization_id)
      .is('deleted_at', null)
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Flatten market/vertical names for CSV-friendly output
    const rows = (data || []).map(company => ({
      name: company.name,
      market: company.market?.name ?? '',
      vertical: company.vertical?.name ?? '',
      website: company.website ?? '',
      phone: company.phone ?? '',
      address_line1: company.address_line1 ?? '',
      address_line2: company.address_line2 ?? '',
      city: company.city ?? '',
      state: company.state ?? '',
      zip: company.zip ?? '',
      estimated_revenue: company.estimated_revenue ?? '',
      employee_count: company.employee_count ?? '',
      year_founded: company.year_founded ?? '',
      ownership_type: company.ownership_type ?? '',
      qualifying_tier: company.qualifying_tier ?? '',
      status: company.status ?? '',
      manufacturer_affiliations: company.manufacturer_affiliations ?? '',
      certifications: company.certifications ?? '',
      awards: company.awards ?? '',
      notes: company.notes ?? '',
    }))

    return NextResponse.json({ data: rows })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
