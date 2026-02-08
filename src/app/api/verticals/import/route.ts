import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { importVerticalsSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'
import { normalizeName } from '@/lib/utils/normalize'

const VALID_TIERS = new Set(['tier_1', 'tier_2', 'tier_3', 'borderline', 'eliminated'])
const VALID_B2B = new Set(['B2B', 'B2C', 'Both'])

function trimString(val: string | null | undefined): string | null {
  if (val == null) return null
  const trimmed = val.trim()
  return trimmed || null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = validateRequest(importVerticalsSchema, body)
    if (!validation.success) return validation.response
    const { data: importData, mode } = validation.data

    const organization_id = await resolveUserOrgId(supabase)
    if (!organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const processedData: Array<Record<string, unknown>> = []
    const errors: string[] = []
    const seenNormalized = new Map<string, number>() // normalized name → first row index

    for (let i = 0; i < importData.length; i++) {
      const record = importData[i]
      try {
        const tier = trimString(record.tier)
        const b2b = trimString(record.b2b_b2c)
        const name = record.name.trim()
        const nameNormalized = normalizeName(name)

        // Intra-batch normalized name dedup
        if (nameNormalized) {
          const existingRow = seenNormalized.get(nameNormalized)
          if (existingRow !== undefined) {
            errors.push(`Row ${i + 1}: Duplicate vertical name '${name}' — similar to row ${existingRow + 1}, skipping`)
            continue
          }
          seenNormalized.set(nameNormalized, i)
        }

        processedData.push({
          organization_id,
          name,
          name_normalized: nameNormalized,
          sector: trimString(record.sector),
          b2b_b2c: b2b && VALID_B2B.has(b2b) ? b2b : null,
          naics_code: trimString(record.naics_code),
          revenue_floor: record.revenue_floor ? Number(record.revenue_floor) || null : null,
          typical_revenue_range: trimString(record.typical_revenue_range),
          typical_marketing_budget_pct: trimString(record.typical_marketing_budget_pct),
          key_decision_maker_title: trimString(record.key_decision_maker_title),
          tier: tier && VALID_TIERS.has(tier) ? tier : null,
          notes: trimString(record.notes),
        })
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Processing error'}`)
      }
    }

    if (processedData.length > 0) {
      let upsertData = processedData
      let updatedCount = 0
      let protectedSkipped = 0

      // Fetch existing verticals by normalized name for both modes
      const normalizedNames = processedData.map(r => r.name_normalized as string).filter(Boolean)
      const existingByNormalized = new Map<string, Record<string, unknown>>()
      if (normalizedNames.length > 0) {
        const { data: existing } = await supabase
          .from('verticals')
          .select('*')
          .eq('organization_id', organization_id)
          .in('name_normalized', normalizedNames)
          .is('deleted_at', null)

        for (const row of existing || []) {
          if (row.name_normalized) existingByNormalized.set(row.name_normalized as string, row)
        }
      }

      // Also fetch by exact name for upsert compatibility
      const names = processedData.map(r => r.name as string)
      const { data: existingByNameRows } = await supabase
        .from('verticals')
        .select('*')
        .eq('organization_id', organization_id)
        .in('name', names)
        .is('deleted_at', null)

      const existingByName = new Map<string, Record<string, unknown>>()
      for (const row of existingByNameRows || []) {
        existingByName.set((row.name as string).toLowerCase(), row)
      }

      if (mode === 'append') {
        upsertData = []
        for (const csvRow of processedData) {
          const nn = csvRow.name_normalized as string | null
          // Skip if normalized name matches existing DB record with different exact name
          if (nn && existingByNormalized.has(nn)) {
            const match = existingByNormalized.get(nn)!
            if ((match.name as string).toLowerCase() !== (csvRow.name as string).toLowerCase()) {
              errors.push(`Vertical "${csvRow.name}" is similar to existing vertical "${match.name}" — skipping`)
              continue
            }
          }

          const existingRow = existingByName.get((csvRow.name as string).toLowerCase())
          if (!existingRow) {
            upsertData.push(csvRow)
            continue
          }

          const merged = { ...csvRow }
          const mergeFields = [
            'sector', 'b2b_b2c', 'naics_code', 'revenue_floor',
            'typical_revenue_range', 'typical_marketing_budget_pct',
            'key_decision_maker_title', 'tier', 'notes',
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
        const allExisting = [...existingByNormalized.values(), ...existingByName.values()]
        const existingIds = [...new Set(allExisting.map(r => r.id as string))]
        const inUseIds = new Set<string>()

        if (existingIds.length > 0) {
          const [{ data: usedByCompanies }, { data: usedByCampaigns }] = await Promise.all([
            supabase.from('companies').select('vertical_id').in('vertical_id', existingIds).is('deleted_at', null),
            supabase.from('campaigns').select('vertical_id').in('vertical_id', existingIds).is('deleted_at', null),
          ])
          for (const row of usedByCompanies || []) inUseIds.add(row.vertical_id)
          for (const row of usedByCampaigns || []) inUseIds.add(row.vertical_id)
        }

        upsertData = []
        for (let i = 0; i < processedData.length; i++) {
          const csvRow = processedData[i]
          const nn = csvRow.name_normalized as string | null

          // Skip if normalized name matches existing DB record with different exact name
          if (nn && existingByNormalized.has(nn)) {
            const match = existingByNormalized.get(nn)!
            if ((match.name as string).toLowerCase() !== (csvRow.name as string).toLowerCase()) {
              errors.push(`Row ${i + 1}: Vertical "${csvRow.name}" is similar to existing vertical "${match.name}" — skipping`)
              continue
            }
          }

          const existingRow = existingByName.get((csvRow.name as string).toLowerCase())
          if (existingRow && inUseIds.has(existingRow.id as string)) {
            errors.push(`Row ${i + 1}: Vertical "${csvRow.name}" is in use (has companies/campaigns) — skipped in overwrite mode`)
            protectedSkipped++
          } else {
            upsertData.push(csvRow)
          }
        }
      }

      if (upsertData.length > 0) {
        const { data, error } = await supabase
          .from('verticals')
          .upsert(upsertData, { onConflict: 'organization_id,name', ignoreDuplicates: false })
          .select()

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        if (data) {
          for (const record of data) {
            await logCreate({ supabase, request }, 'vertical', record, { source: 'csv_import' })
          }
        }

        const totalCount = data?.length || 0
        return NextResponse.json({
          created: totalCount - updatedCount,
          updated: updatedCount,
          total: totalCount,
          protectedSkipped,
          errors,
          data,
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
        mode,
      })
    }

    return NextResponse.json({ created: 0, updated: 0, total: 0, protectedSkipped: 0, errors, data: [], mode })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
