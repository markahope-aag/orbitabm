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

    const processedData: Array<Record<string, unknown>> = []
    const errors: string[] = []
    const seenEmails = new Map<string, number>() // email → first row index

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

        const email = record.email.trim().toLowerCase()

        // Intra-batch email dedup
        const existingEmailRow = seenEmails.get(email)
        if (existingEmailRow !== undefined) {
          errors.push(`Row ${i + 1}: Duplicate email '${email}' — already in row ${existingEmailRow + 1}, skipping`)
          continue
        }
        seenEmails.set(email, i)

        const relStatus = trimString(record.relationship_status)

        processedData.push({
          organization_id,
          company_id,
          first_name: record.first_name.trim(),
          last_name: record.last_name.trim(),
          title: trimString(record.title),
          email,
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
      let protectedSkipped = 0

      // Fetch existing contacts by email for dedup
      const emails = processedData.map(r => r.email as string).filter(Boolean)
      const existingByEmail = new Map<string, Record<string, unknown>>()
      if (emails.length > 0) {
        const { data: existing } = await supabase
          .from('contacts')
          .select('*')
          .eq('organization_id', organization_id)
          .in('email', emails)
          .is('deleted_at', null)

        for (const row of existing || []) {
          if (row.email) existingByEmail.set((row.email as string).toLowerCase(), row)
        }
      }

      if (mode === 'append') {
        upsertData = []
        for (const csvRow of processedData) {
          const csvEmail = (csvRow.email as string).toLowerCase()
          const existingRow = existingByEmail.get(csvEmail)
          if (!existingRow) {
            upsertData.push(csvRow)
            continue
          }

          // Merge: overlay non-null CSV values onto existing
          const merged = { ...csvRow }
          const mergeFields = ['title', 'phone', 'linkedin_url', 'notes']
          for (const field of mergeFields) {
            if (merged[field] === null || merged[field] === undefined) {
              merged[field] = existingRow[field] ?? null
            }
          }
          updatedCount++
          // Skip — contact with this email already exists (append mode keeps existing)
          errors.push(`Contact with email '${csvEmail}' already exists (${existingRow.first_name} ${existingRow.last_name}) — skipping`)
        }
      } else {
        // Overwrite mode — protect contacts that have activities
        const allExistingIds = [...existingByEmail.values()].map(r => r.id as string)
        const inUseIds = new Set<string>()

        if (allExistingIds.length > 0) {
          const { data: usedByActivities } = await supabase
            .from('activities').select('contact_id').in('contact_id', allExistingIds).is('deleted_at', null)
          for (const row of usedByActivities || []) inUseIds.add(row.contact_id)
        }

        upsertData = []
        for (let i = 0; i < processedData.length; i++) {
          const csvRow = processedData[i]
          const csvEmail = (csvRow.email as string).toLowerCase()
          const existingRow = existingByEmail.get(csvEmail)
          if (existingRow && inUseIds.has(existingRow.id as string)) {
            errors.push(`Row ${i + 1}: Contact with email '${csvEmail}' is in use (has activities) — skipped in overwrite mode`)
            protectedSkipped++
          } else if (existingRow) {
            // Email exists but not in use — skip (duplicate)
            errors.push(`Row ${i + 1}: Contact with email '${csvEmail}' already exists (${existingRow.first_name} ${existingRow.last_name}) — skipping`)
          } else {
            upsertData.push(csvRow)
          }
        }
      }

      if (upsertData.length > 0) {
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
