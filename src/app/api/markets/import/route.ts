import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { importMarketsSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'
import { normalizeName } from '@/lib/utils/normalize'

const PE_ACTIVITY_LEVELS = new Set(['none', 'low', 'moderate', 'high', 'critical'])
const PE_CONSOLIDATION_LEVELS = new Set(['low', 'moderate', 'high'])
const COMPETITION_LEVELS = new Set(['low', 'moderate', 'high'])
const MARKET_MATURITY_LEVELS = new Set(['emerging', 'growing', 'mature', 'declining'])

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

function normalizePeConsolidationStatus(val: string | null | undefined): string | null {
  if (!val) return null
  const key = val.trim().toLowerCase()
  return PE_CONSOLIDATION_LEVELS.has(key) ? key : null
}

function normalizeCompetitionLevel(val: string | null | undefined): string | null {
  if (!val) return null
  const key = val.trim().toLowerCase()
  return COMPETITION_LEVELS.has(key) ? key : null
}

function normalizeMarketMaturity(val: string | null | undefined): string | null {
  if (!val) return null
  const key = val.trim().toLowerCase()
  return MARKET_MATURITY_LEVELS.has(key) ? key : null
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

    const processedData: Array<Record<string, unknown>> = []
    const errors: string[] = []
    const seenNormalized = new Map<string, number>() // normalized name → first row index

    for (let i = 0; i < importData.length; i++) {
      const record = importData[i]

      try {
        // Extract state from market name if not provided ("Madison, WI" → "WI")
        let state = trimString(record.state as string | null)
        if (!state && record.name) {
          const match = record.name.match(/,\s*([A-Za-z]{2})$/)
          if (match) state = match[1].toUpperCase()
        }

        const name = record.name.trim()
        const nameNormalized = normalizeName(name)

        // Intra-batch normalized name dedup
        if (nameNormalized) {
          const existingRow = seenNormalized.get(nameNormalized)
          if (existingRow !== undefined) {
            errors.push(`Row ${i + 1}: Duplicate market name '${name}' — similar to row ${existingRow + 1}, skipping`)
            continue
          }
          seenNormalized.set(nameNormalized, i)
        }

        const processedRecord = {
          organization_id,
          name,
          name_normalized: nameNormalized,
          state: state || '',
          metro_population: record.metro_population ? parseInt(String(record.metro_population)) || null : null,
          market_size_estimate: record.market_size_estimate
            ? (isNaN(Number(record.market_size_estimate)) ? null : Number(record.market_size_estimate))
            : null,
          pe_activity_level: normalizePeActivityLevel(record.pe_activity_level as string | null),
          target_company_count: record.target_company_count ? parseInt(String(record.target_company_count)) || null : null,
          pe_consolidation_status: normalizePeConsolidationStatus(record.pe_consolidation_status as string | null),
          competition_level: normalizeCompetitionLevel(record.competition_level as string | null),
          primary_trade_association: trimString(record.primary_trade_association as string | null),
          peak_season_months: trimString(record.peak_season_months as string | null),
          market_maturity: normalizeMarketMaturity(record.market_maturity as string | null),
          avg_cpc_estimate: record.avg_cpc_estimate
            ? (isNaN(Number(record.avg_cpc_estimate)) ? null : Number(record.avg_cpc_estimate))
            : null,
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
      let protectedSkipped = 0

      // Fetch existing markets by normalized name for both modes
      const normalizedNames = processedData.map(r => r.name_normalized as string).filter(Boolean)
      const existingByNormalized = new Map<string, Record<string, unknown>>()
      if (normalizedNames.length > 0) {
        const { data: existing } = await supabase
          .from('markets')
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
        .from('markets')
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
              errors.push(`Market "${csvRow.name}" is similar to existing market "${match.name}" — skipping`)
              continue
            }
          }

          const existingRow = existingByName.get((csvRow.name as string).toLowerCase())
          if (!existingRow) {
            upsertData.push(csvRow)
            continue
          }

          const merged = { ...csvRow }
          const mergeFields = ['state', 'metro_population', 'market_size_estimate', 'pe_activity_level', 'target_company_count', 'pe_consolidation_status', 'competition_level', 'primary_trade_association', 'peak_season_months', 'market_maturity', 'avg_cpc_estimate', 'notes']
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
            supabase.from('companies').select('market_id').in('market_id', existingIds).is('deleted_at', null),
            supabase.from('campaigns').select('market_id').in('market_id', existingIds).is('deleted_at', null),
          ])
          for (const row of usedByCompanies || []) inUseIds.add(row.market_id)
          for (const row of usedByCampaigns || []) inUseIds.add(row.market_id)
        }

        upsertData = []
        for (let i = 0; i < processedData.length; i++) {
          const csvRow = processedData[i]
          const nn = csvRow.name_normalized as string | null

          // Skip if normalized name matches existing DB record with different exact name
          if (nn && existingByNormalized.has(nn)) {
            const match = existingByNormalized.get(nn)!
            if ((match.name as string).toLowerCase() !== (csvRow.name as string).toLowerCase()) {
              errors.push(`Row ${i + 1}: Market "${csvRow.name}" is similar to existing market "${match.name}" — skipping`)
              continue
            }
          }

          const existingRow = existingByName.get((csvRow.name as string).toLowerCase())
          if (existingRow && inUseIds.has(existingRow.id as string)) {
            errors.push(`Row ${i + 1}: Market "${csvRow.name}" is in use (has companies/campaigns) — skipped in overwrite mode`)
            protectedSkipped++
          } else {
            upsertData.push(csvRow)
          }
        }
      }

      if (upsertData.length > 0) {
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
            await logCreate({ supabase, request }, 'market', record, { source: 'csv_import' })
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

    return NextResponse.json({
      created: 0,
      updated: 0,
      total: 0,
      protectedSkipped: 0,
      errors,
      data: [],
      mode,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
