import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { importVerticalsSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

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

    const processedData = []
    const errors: string[] = []

    for (let i = 0; i < importData.length; i++) {
      const record = importData[i]
      try {
        const tier = trimString(record.tier)
        const b2b = trimString(record.b2b_b2c)

        processedData.push({
          organization_id,
          name: record.name.trim(),
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

      if (mode === 'append') {
        const names = processedData.map(r => r.name)
        const { data: existing } = await supabase
          .from('verticals')
          .select('*')
          .eq('organization_id', organization_id)
          .in('name', names)
          .is('deleted_at', null)

        const existingByName = new Map<string, Record<string, unknown>>()
        for (const row of existing || []) {
          existingByName.set((row.name as string).toLowerCase(), row)
        }

        upsertData = processedData.map(csvRow => {
          const existingRow = existingByName.get(csvRow.name.toLowerCase())
          if (!existingRow) return csvRow

          const merged = { ...csvRow }
          const mergeFields = [
            'sector', 'b2b_b2c', 'naics_code', 'revenue_floor',
            'typical_revenue_range', 'typical_marketing_budget_pct',
            'key_decision_maker_title', 'tier', 'notes',
          ] as const
          for (const field of mergeFields) {
            if (merged[field] === null || merged[field] === undefined) {
              (merged as Record<string, unknown>)[field] = existingRow[field] ?? null
            }
          }
          updatedCount++
          return merged
        })
      }

      const { data, error } = await supabase
        .from('verticals')
        .upsert(upsertData, { onConflict: 'organization_id,name', ignoreDuplicates: false })
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      if (data) {
        for (const record of data) {
          logCreate({ supabase, request }, 'vertical', record, { source: 'csv_import' })
        }
      }

      const totalCount = data?.length || 0
      return NextResponse.json({
        created: totalCount - updatedCount,
        updated: updatedCount,
        total: totalCount,
        errors,
        data,
        mode,
      })
    }

    return NextResponse.json({ created: 0, updated: 0, total: 0, errors, data: [], mode })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
