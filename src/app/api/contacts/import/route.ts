import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { importContactsSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

const VALID_RELATIONSHIP_STATUSES = new Set([
  'unknown', 'identified', 'connected', 'engaged', 'responsive', 'meeting_held', 'client',
])

function trimString(val: string | null | undefined): string | null {
  if (val == null) return null
  const trimmed = val.trim()
  return trimmed || null
}

function parseBool(val: unknown): boolean {
  if (typeof val === 'boolean') return val
  if (typeof val === 'string') return val.trim().toLowerCase() === 'true'
  return false
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = validateRequest(importContactsSchema, body)
    if (!validation.success) return validation.response
    const { data: importData, mode } = validation.data

    const organization_id = await resolveUserOrgId(supabase)
    if (!organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build company name → id lookup
    const companyNames = importData
      .map(r => r.company?.trim())
      .filter((n): n is string => !!n)
    const uniqueCompanyNames = [...new Set(companyNames)]

    const companyCache = new Map<string, string>()
    if (uniqueCompanyNames.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .eq('organization_id', organization_id)
        .in('name', uniqueCompanyNames)
        .is('deleted_at', null)

      for (const c of companies || []) {
        companyCache.set(c.name.toLowerCase(), c.id)
      }
    }

    const processedData = []
    const errors: string[] = []

    for (let i = 0; i < importData.length; i++) {
      const record = importData[i]
      try {
        let company_id: string | null = null
        if (record.company) {
          const name = record.company.trim()
          company_id = companyCache.get(name.toLowerCase()) ?? null
          if (!company_id) {
            errors.push(`Row ${i + 1}: Company "${name}" not found — skipping row`)
            continue
          }
        }

        const relStatus = trimString(record.relationship_status)

        processedData.push({
          organization_id,
          company_id,
          first_name: record.first_name.trim(),
          last_name: record.last_name.trim(),
          title: trimString(record.title),
          email: trimString(record.email),
          phone: trimString(record.phone),
          linkedin_url: trimString(record.linkedin_url),
          is_primary: parseBool(record.is_primary),
          relationship_status: relStatus && VALID_RELATIONSHIP_STATUSES.has(relStatus) ? relStatus : 'unknown',
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
        // Match existing contacts by name + company_id
        const { data: existing } = await supabase
          .from('contacts')
          .select('*')
          .eq('organization_id', organization_id)
          .is('deleted_at', null)

        const existingByKey = new Map<string, Record<string, unknown>>()
        for (const row of existing || []) {
          const key = `${(row.first_name as string).toLowerCase()}|${(row.last_name as string).toLowerCase()}|${row.company_id || ''}`
          existingByKey.set(key, row)
        }

        upsertData = processedData.map(csvRow => {
          const key = `${csvRow.first_name.toLowerCase()}|${csvRow.last_name.toLowerCase()}|${csvRow.company_id || ''}`
          const existingRow = existingByKey.get(key)
          if (!existingRow) return csvRow

          const merged = { ...csvRow }
          const mergeFields = [
            'title', 'email', 'phone', 'linkedin_url', 'notes',
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

      // Contacts don't have a unique constraint for upsert, so use insert
      const { data, error } = await supabase
        .from('contacts')
        .insert(upsertData)
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      if (data) {
        for (const record of data) {
          logCreate({ supabase, request }, 'contact', record, { source: 'csv_import' })
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
