import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { importMarketsSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

const PE_ACTIVITY_LEVELS = new Set(['none', 'low', 'moderate', 'high', 'critical'])

function trimString(val: string | null | undefined): string | null {
  if (val == null) return null
  const trimmed = val.trim()
  return trimmed || null
}

function normalizePeActivityLevel(val: string | null | undefined): string | null {
  if (!val) return null
  const key = val.trim().toLowerCase()
  return PE_ACTIVITY_LEVELS.has(key) ? key : null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = validateRequest(importMarketsSchema, body)
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
        // Extract state from market name if not provided ("Madison, WI" → "WI")
        let state = trimString(record.state as string | null)
        if (!state && record.name) {
          const match = record.name.match(/,\s*([A-Za-z]{2})$/)
          if (match) state = match[1].toUpperCase()
        }

        const processedRecord = {
          organization_id,
          name: record.name.trim(),
          state: state || '',
          metro_population: record.metro_population ? parseInt(String(record.metro_population)) || null : null,
          market_size_estimate: record.market_size_estimate
            ? (isNaN(Number(record.market_size_estimate)) ? null : Number(record.market_size_estimate))
            : null,
          pe_activity_level: normalizePeActivityLevel(record.pe_activity_level as string | null),
          notes: trimString(record.notes),
        }

        processedData.push(processedRecord)
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
          .from('markets')
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
          const mergeFields = ['state', 'metro_population', 'market_size_estimate', 'pe_activity_level', 'notes'] as const
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
        .from('markets')
        .upsert(upsertData, {
          onConflict: 'organization_id,name',
          ignoreDuplicates: false,
        })
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      if (data) {
        for (const record of data) {
          logCreate({ supabase, request }, 'market', record, { source: 'csv_import' })
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

    return NextResponse.json({
      created: 0,
      updated: 0,
      total: 0,
      errors,
      data: [],
      mode,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
