import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { importCompaniesSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

const OWNERSHIP_TYPE_MAP: Record<string, string> = {
  independent: 'independent',
  pe_backed: 'pe_backed',
  franchise: 'franchise',
  corporate: 'corporate',
  // Common synonyms
  private: 'independent',
  'privately held': 'independent',
  'pe backed': 'pe_backed',
  'pe-backed': 'pe_backed',
  'private equity': 'pe_backed',
}

function trimString(val: string | null | undefined): string | null {
  if (val == null) return null
  const trimmed = val.trim()
  return trimmed || null
}

function normalizeWebsite(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function extractStateFromMarketName(name: string): string {
  // Market names follow "City, ST" convention (e.g. "Madison, WI")
  const match = name.match(/,\s*([A-Za-z]{2})$/)
  return match ? match[1].toUpperCase() : ''
}

function normalizeOwnershipType(val: string | null | undefined): string {
  if (!val) return 'independent'
  const key = val.trim().toLowerCase()
  return OWNERSHIP_TYPE_MAP[key] || 'independent'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = validateRequest(importCompaniesSchema, body)
    if (!validation.success) return validation.response
    const { data: importData } = validation.data

    const organization_id = await resolveUserOrgId(supabase)
    if (!organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch existing markets and verticals for lookup
    const [marketsResult, verticalsResult] = await Promise.all([
      supabase
        .from('markets')
        .select('id, name, state')
        .eq('organization_id', organization_id)
        .is('deleted_at', null),
      supabase
        .from('verticals')
        .select('id, name')
        .eq('organization_id', organization_id)
        .is('deleted_at', null)
    ])

    // Mutable caches: seeded with existing data, extended by auto-creates
    const marketCache = new Map<string, string>()
    for (const m of marketsResult.data || []) {
      marketCache.set(`${m.name.toLowerCase()}|${(m.state ?? '').toLowerCase()}`, m.id)
    }

    const verticalCache = new Map<string, string>()
    for (const v of verticalsResult.data || []) {
      verticalCache.set(v.name.toLowerCase(), v.id)
    }

    const marketsCreated: string[] = []
    const verticalsCreated: string[] = []

    // Process each record
    const processedData = []
    const errors = []

    for (let i = 0; i < importData.length; i++) {
      const record = importData[i]

      try {
        const processedRecord = {
          organization_id,
          name: record.name.trim(),
          website: normalizeWebsite(record.website),
          phone: trimString(record.phone),
          address_line1: trimString(record.address_line1),
          address_line2: trimString(record.address_line2),
          city: trimString(record.city),
          state: trimString(record.state),
          zip: trimString(record.zip),
          estimated_revenue: record.estimated_revenue ? parseInt(String(record.estimated_revenue)) : null,
          employee_count: record.employee_count ? parseInt(String(record.employee_count)) : null,
          year_founded: record.year_founded ? parseInt(String(record.year_founded)) : null,
          ownership_type: normalizeOwnershipType(record.ownership_type),
          qualifying_tier: trimString(record.qualifying_tier),
          status: record.status?.trim() || 'prospect',
          manufacturer_affiliations: trimString(record.manufacturer_affiliations),
          certifications: trimString(record.certifications),
          awards: trimString(record.awards),
          notes: trimString(record.notes),
          market_id: null as string | null,
          vertical_id: null as string | null
        }

        // Lookup or auto-create market
        if (record.market) {
          const marketName = record.market.trim()
          // Extract state from market name ("Madison, WI" → "WI"), fall back to record state
          const marketState = extractStateFromMarketName(marketName) || (record.state ?? '').trim()
          const cacheKey = `${marketName.toLowerCase()}|${marketState.toLowerCase()}`

          if (marketCache.has(cacheKey)) {
            processedRecord.market_id = marketCache.get(cacheKey)!
          } else {
            // Auto-create market
            const { data: newMarket, error: marketError } = await supabase
              .from('markets')
              .insert({ organization_id, name: marketName, state: marketState || '' })
              .select('id')
              .single()

            if (marketError) {
              errors.push(`Row ${i + 1}: Failed to create market "${marketName}" — ${marketError.message}`)
            } else {
              marketCache.set(cacheKey, newMarket.id)
              processedRecord.market_id = newMarket.id
              marketsCreated.push(marketName)
              logCreate({ supabase, request }, 'market', { id: newMarket.id, organization_id, name: marketName, state: marketState || '' }, { source: 'csv_import_auto' })
            }
          }
        }

        // Lookup or auto-create vertical
        if (record.vertical) {
          const verticalName = record.vertical.trim()
          const cacheKey = verticalName.toLowerCase()

          if (verticalCache.has(cacheKey)) {
            processedRecord.vertical_id = verticalCache.get(cacheKey)!
          } else {
            // Auto-create vertical
            const { data: newVertical, error: verticalError } = await supabase
              .from('verticals')
              .insert({ organization_id, name: verticalName })
              .select('id')
              .single()

            if (verticalError) {
              errors.push(`Row ${i + 1}: Failed to create vertical "${verticalName}" — ${verticalError.message}`)
            } else {
              verticalCache.set(cacheKey, newVertical.id)
              processedRecord.vertical_id = newVertical.id
              verticalsCreated.push(verticalName)
              logCreate({ supabase, request }, 'vertical', { id: newVertical.id, organization_id, name: verticalName }, { source: 'csv_import_auto' })
            }
          }
        }

        processedData.push(processedRecord)

      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Processing error'}`)
      }
    }

    // Insert all valid records
    if (processedData.length > 0) {
      const { data, error } = await supabase
        .from('companies')
        .upsert(processedData, {
          onConflict: 'organization_id,name',
          ignoreDuplicates: false
        })
        .select()

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      if (data) {
        for (const record of data) {
          logCreate({ supabase, request }, 'company', record, { source: 'csv_import' })
        }
      }

      return NextResponse.json({
        created: data?.length || 0,
        errors,
        data,
        marketsCreated,
        verticalsCreated
      })
    } else {
      return NextResponse.json({
        created: 0,
        errors,
        data: [],
        marketsCreated,
        verticalsCreated
      })
    }

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
