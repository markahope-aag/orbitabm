import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { importDigitalSnapshotsSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

function trimString(val: string | null | undefined): string | null {
  if (val == null) return null
  const trimmed = val.trim()
  return trimmed || null
}

function parseNum(val: unknown): number | null {
  if (val == null || val === '') return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

function parseIntVal(val: unknown): number | null {
  if (val == null || val === '') return null
  const n = parseInt(String(val))
  return isNaN(n) ? null : n
}

function parseBool(val: unknown): boolean | null {
  if (val == null || val === '') return null
  if (typeof val === 'boolean') return val
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase()
    if (lower === 'true' || lower === '1' || lower === 'yes') return true
    if (lower === 'false' || lower === '0' || lower === 'no') return false
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = validateRequest(importDigitalSnapshotsSchema, body)
    if (!validation.success) return validation.response
    const { data: importData, mode } = validation.data

    const organization_id = await resolveUserOrgId(supabase)
    if (!organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build company name → id lookup
    const companyNames = importData.map(r => r.company.trim())
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
        const companyName = record.company.trim()
        const company_id = companyCache.get(companyName.toLowerCase())
        if (!company_id) {
          errors.push(`Row ${i + 1}: Company "${companyName}" not found — skipping row`)
          continue
        }

        processedData.push({
          organization_id,
          company_id,
          snapshot_date: record.snapshot_date?.trim() || new Date().toISOString().split('T')[0],
          google_rating: parseNum(record.google_rating),
          google_review_count: parseIntVal(record.google_review_count),
          yelp_rating: parseNum(record.yelp_rating),
          yelp_review_count: parseIntVal(record.yelp_review_count),
          bbb_rating: trimString(record.bbb_rating),
          facebook_followers: parseIntVal(record.facebook_followers),
          instagram_followers: parseIntVal(record.instagram_followers),
          linkedin_followers: parseIntVal(record.linkedin_followers),
          domain_authority: parseNum(record.domain_authority),
          page_speed_mobile: parseNum(record.page_speed_mobile),
          page_speed_desktop: parseNum(record.page_speed_desktop),
          organic_keywords: parseIntVal(record.organic_keywords),
          monthly_organic_traffic_est: parseIntVal(record.monthly_organic_traffic_est),
          has_blog: parseBool(record.has_blog),
          has_online_booking: parseBool(record.has_online_booking),
          has_live_chat: parseBool(record.has_live_chat),
          notes: trimString(record.notes),
        })
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Processing error'}`)
      }
    }

    if (processedData.length > 0) {
      // Digital snapshots are keyed by company_id + snapshot_date
      // For append mode, merge with existing snapshots
      let insertData = processedData
      let updatedCount = 0

      if (mode === 'append') {
        const keys = processedData.map(r => ({ company_id: r.company_id, date: r.snapshot_date }))
        const companyIds = [...new Set(keys.map(k => k.company_id))]

        const { data: existing } = await supabase
          .from('digital_snapshots')
          .select('*')
          .eq('organization_id', organization_id)
          .in('company_id', companyIds)

        const existingByKey = new Map<string, Record<string, unknown>>()
        for (const row of existing || []) {
          existingByKey.set(`${row.company_id}|${row.snapshot_date}`, row)
        }

        insertData = processedData.map(csvRow => {
          const existingRow = existingByKey.get(`${csvRow.company_id}|${csvRow.snapshot_date}`)
          if (!existingRow) return csvRow

          const merged = { ...csvRow }
          const mergeFields = [
            'google_rating', 'google_review_count', 'yelp_rating', 'yelp_review_count',
            'bbb_rating', 'facebook_followers', 'instagram_followers', 'linkedin_followers',
            'domain_authority', 'page_speed_mobile', 'page_speed_desktop',
            'organic_keywords', 'monthly_organic_traffic_est',
            'has_blog', 'has_online_booking', 'has_live_chat', 'notes',
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
        .from('digital_snapshots')
        .upsert(insertData, {
          onConflict: 'organization_id,company_id,snapshot_date',
          ignoreDuplicates: false,
        })
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      if (data) {
        for (const record of data) {
          await logCreate({ supabase, request }, 'digital_snapshot', record, { source: 'csv_import' })
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
