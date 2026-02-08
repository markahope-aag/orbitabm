import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { importCompaniesSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'
import { extractDomain, normalizeWebsite } from '@/lib/utils/normalize'

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
    const { data: importData, mode } = validation.data

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
    const processedData: Array<Record<string, unknown>> = []
    const errors: string[] = []
    const seenDomains = new Map<string, number>() // domain → first row index

    for (let i = 0; i < importData.length; i++) {
      const record = importData[i]

      try {
        const website = normalizeWebsite(record.website)
        const domain = extractDomain(website)

        // Intra-batch domain dedup
        if (domain) {
          const existingRow = seenDomains.get(domain)
          if (existingRow !== undefined) {
            errors.push(`Row ${i + 1}: Duplicate domain '${domain}' — already in row ${existingRow + 1}, skipping`)
            continue
          }
          seenDomains.set(domain, i)
        }

        const processedRecord = {
          organization_id,
          name: record.name.trim(),
          website,
          domain,
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
              await logCreate({ supabase, request }, 'market', { id: newMarket.id, organization_id, name: marketName, state: marketState || '' }, { source: 'csv_import_auto' })
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
              await logCreate({ supabase, request }, 'vertical', { id: newVertical.id, organization_id, name: verticalName }, { source: 'csv_import_auto' })
            }
          }
        }

        processedData.push(processedRecord)

      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Processing error'}`)
      }
    }

    // Insert/update all valid records
    if (processedData.length > 0) {
      let upsertData = processedData
      let updatedCount = 0
      let protectedSkipped = 0

      // Fetch existing companies by name for both modes
      const names = processedData.map(r => r.name as string)
      const { data: existing } = await supabase
        .from('companies')
        .select('*')
        .eq('organization_id', organization_id)
        .in('name', names)
        .is('deleted_at', null)

      const existingByName = new Map<string, Record<string, unknown>>()
      for (const row of existing || []) {
        existingByName.set((row.name as string).toLowerCase(), row)
      }

      // Fetch existing companies by domain for domain-based dedup
      const domains = processedData.map(r => r.domain as string).filter(Boolean)
      const existingByDomain = new Map<string, Record<string, unknown>>()
      if (domains.length > 0) {
        const { data: domainMatches } = await supabase
          .from('companies')
          .select('*')
          .eq('organization_id', organization_id)
          .in('domain', domains)
          .is('deleted_at', null)

        for (const row of domainMatches || []) {
          if (row.domain) existingByDomain.set(row.domain as string, row)
        }
      }

      if (mode === 'append') {
        upsertData = []
        for (const csvRow of processedData) {
          // Skip if domain already exists in DB (and not matched by name for upsert)
          const csvDomain = csvRow.domain as string | null
          if (csvDomain && existingByDomain.has(csvDomain)) {
            const match = existingByDomain.get(csvDomain)!
            // If it's the same company by name, allow upsert merge
            if ((match.name as string).toLowerCase() !== (csvRow.name as string).toLowerCase()) {
              errors.push(`Row: Company "${csvRow.name}" has domain '${csvDomain}' which belongs to existing company "${match.name}" — skipping`)
              continue
            }
          }

          const existingRow = existingByName.get((csvRow.name as string).toLowerCase())
          if (!existingRow) {
            upsertData.push(csvRow)
            continue
          }

          // Merge: start with existing DB values, overlay only non-null CSV values
          const merged = { ...csvRow }
          const mergeFields = [
            'website', 'domain', 'phone', 'address_line1', 'address_line2',
            'city', 'state', 'zip', 'estimated_revenue', 'employee_count',
            'year_founded', 'ownership_type', 'qualifying_tier', 'status',
            'manufacturer_affiliations', 'certifications', 'awards', 'notes',
            'market_id', 'vertical_id',
          ]

          for (const field of mergeFields) {
            if (merged[field] === null || merged[field] === undefined) {
              merged[field] = existingRow[field] ?? null
            }
          }

          updatedCount++
          upsertData.push(merged)
        }
      } else {
        // Overwrite mode — protect records that are in use
        const existingIds = (existing || []).map(r => r.id as string)
        const inUseIds = new Set<string>()

        if (existingIds.length > 0) {
          const [{ data: usedByContacts }, { data: usedByCampaigns }, { data: usedBySnapshots }, { data: usedByAssets }, { data: usedByDocs }] = await Promise.all([
            supabase.from('contacts').select('company_id').in('company_id', existingIds).is('deleted_at', null),
            supabase.from('campaigns').select('company_id').in('company_id', existingIds).is('deleted_at', null),
            supabase.from('digital_snapshots').select('company_id').in('company_id', existingIds).is('deleted_at', null),
            supabase.from('assets').select('company_id').in('company_id', existingIds).is('deleted_at', null),
            supabase.from('generated_documents').select('company_id').in('company_id', existingIds).is('deleted_at', null),
          ])
          for (const row of usedByContacts || []) inUseIds.add(row.company_id)
          for (const row of usedByCampaigns || []) inUseIds.add(row.company_id)
          for (const row of usedBySnapshots || []) inUseIds.add(row.company_id)
          for (const row of usedByAssets || []) inUseIds.add(row.company_id)
          for (const row of usedByDocs || []) inUseIds.add(row.company_id)
        }

        upsertData = []
        for (let i = 0; i < processedData.length; i++) {
          const csvRow = processedData[i]

          // Skip if domain already exists in DB under a different name
          const csvDomain = csvRow.domain as string | null
          if (csvDomain && existingByDomain.has(csvDomain)) {
            const match = existingByDomain.get(csvDomain)!
            if ((match.name as string).toLowerCase() !== (csvRow.name as string).toLowerCase()) {
              errors.push(`Row ${i + 1}: Company "${csvRow.name}" has domain '${csvDomain}' which belongs to existing company "${match.name}" — skipping`)
              continue
            }
          }

          const existingRow = existingByName.get((csvRow.name as string).toLowerCase())
          if (existingRow && inUseIds.has(existingRow.id as string)) {
            errors.push(`Row ${i + 1}: Company "${csvRow.name}" is in use (has campaigns/contacts) — skipped in overwrite mode`)
            protectedSkipped++
          } else {
            upsertData.push(csvRow)
          }
        }
      }

      if (upsertData.length > 0) {
        const { data, error } = await supabase
          .from('companies')
          .upsert(upsertData, {
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
            await logCreate({ supabase, request }, 'company', record, { source: 'csv_import' })
          }
        }

        const totalCount = data?.length || 0
        const createdCount = totalCount - updatedCount

        return NextResponse.json({
          created: createdCount,
          updated: updatedCount,
          total: totalCount,
          protectedSkipped,
          errors,
          data,
          marketsCreated,
          verticalsCreated,
          mode,
        })
      }

      return NextResponse.json({
        created: 0,
        updated: 0,
        total: 0,
        protectedSkipped,
        errors,
        data: [],
        marketsCreated,
        verticalsCreated,
        mode,
      })
    } else {
      return NextResponse.json({
        created: 0,
        updated: 0,
        total: 0,
        protectedSkipped: 0,
        errors,
        data: [],
        marketsCreated,
        verticalsCreated,
        mode,
      })
    }

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
