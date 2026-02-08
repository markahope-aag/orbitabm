import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { importCompaniesSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

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

    // Fetch markets and verticals for lookup
    const [marketsResult, verticalsResult] = await Promise.all([
      supabase
        .from('markets')
        .select('id, name')
        .eq('organization_id', organization_id)
        .is('deleted_at', null),
      supabase
        .from('verticals')
        .select('id, name')
        .eq('organization_id', organization_id)
        .is('deleted_at', null)
    ])

    const markets = marketsResult.data || []
    const verticals = verticalsResult.data || []

    // Process each record
    const processedData = []
    const errors = []

    for (let i = 0; i < importData.length; i++) {
      const record = importData[i]
      
      try {
        const processedRecord = {
          organization_id,
          name: record.name,
          website: record.website || null,
          phone: record.phone || null,
          address_line1: record.address_line1 || null,
          address_line2: record.address_line2 || null,
          city: record.city || null,
          state: record.state || null,
          zip: record.zip || null,
          estimated_revenue: record.estimated_revenue ? parseInt(String(record.estimated_revenue)) : null,
          employee_count: record.employee_count ? parseInt(String(record.employee_count)) : null,
          year_founded: record.year_founded ? parseInt(String(record.year_founded)) : null,
          ownership_type: record.ownership_type || 'private',
          qualifying_tier: record.qualifying_tier || null,
          status: record.status || 'active',
          manufacturer_affiliations: record.manufacturer_affiliations || null,
          certifications: record.certifications || null,
          awards: record.awards || null,
          notes: record.notes || null,
          market_id: null,
          vertical_id: null
        }

        // Lookup market by name
        if (record.market) {
          const market = markets.find((m: { id: string; name: string }) => 
            m.name.toLowerCase() === record.market!.toLowerCase()
          )
          if (market) {
            processedRecord.market_id = market.id
          } else {
            errors.push(`Row ${i + 1}: Market "${record.market}" not found`)
          }
        }

        // Lookup vertical by name
        if (record.vertical) {
          const vertical = verticals.find((v: { id: string; name: string }) => 
            v.name.toLowerCase() === record.vertical!.toLowerCase()
          )
          if (vertical) {
            processedRecord.vertical_id = vertical.id
          } else {
            errors.push(`Row ${i + 1}: Vertical "${record.vertical}" not found`)
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
        data
      })
    } else {
      return NextResponse.json({
        created: 0,
        errors,
        data: []
      })
    }

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}