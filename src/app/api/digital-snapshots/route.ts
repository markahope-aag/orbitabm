import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { createDigitalSnapshotSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const organizationId = await resolveUserOrgId(supabase)
    if (!organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const companyId = searchParams.get('company_id')
    const snapshotDate = searchParams.get('snapshot_date')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('digital_snapshots')
      .select(`
        *,
        companies (
          id,
          name,
          website,
          status
        )
      `)
      .eq('organization_id', organizationId)

    // Apply filters
    if (companyId) query = query.eq('company_id', companyId)
    if (snapshotDate) query = query.eq('snapshot_date', snapshotDate)
    if (fromDate) query = query.gte('snapshot_date', fromDate)
    if (toDate) query = query.lte('snapshot_date', toDate)

    // Apply pagination and ordering
    query = query
      .order('snapshot_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new ApiError(
        'Failed to fetch digital snapshots',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    return NextResponse.json({
      data,
      success: true,
      count
    })

  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          success: false,
          details: error.details
        },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: ERROR_CODES.SERVER_ERROR,
        success: false
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = validateRequest(createDigitalSnapshotSchema, body)
    if (!validation.success) return validation.response

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { company_id } = validation.data
    const snapshot_date = validation.data.snapshot_date ?? new Date().toISOString().split('T')[0]

    // Verify that the company exists and belongs to the organization
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', company_id)
      .eq('organization_id', userOrgId)
      .is('deleted_at', null)
      .single()

    if (companyError || !company) {
      throw new ApiError(
        'Company not found or does not belong to organization',
        ERROR_CODES.NOT_FOUND,
        404
      )
    }

    // Check if a snapshot already exists for this company and date
    const { data: existing, error: checkError } = await supabase
      .from('digital_snapshots')
      .select('id')
      .eq('organization_id', userOrgId)
      .eq('company_id', company_id)
      .eq('snapshot_date', snapshot_date)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw new ApiError(
        'Failed to check for existing snapshot',
        ERROR_CODES.DATABASE_ERROR,
        500,
        checkError
      )
    }

    if (existing) {
      throw new ApiError(
        'Digital snapshot already exists for this company and date',
        ERROR_CODES.DUPLICATE_ENTRY,
        409,
        { 
          field: 'snapshot_date', 
          value: snapshot_date,
          company_id: company_id
        }
      )
    }

    // Insert new digital snapshot
    const { data, error } = await supabase
      .from('digital_snapshots')
      .insert({ ...validation.data, snapshot_date, organization_id: userOrgId })
      .select(`
        *,
        companies (
          id,
          name,
          website
        )
      `)
      .single()

    if (error) {
      throw new ApiError(
        'Failed to create digital snapshot',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    logCreate({ supabase, request }, 'digital_snapshot', data)

    return NextResponse.json({
      data,
      success: true
    }, { status: 201 })

  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          success: false,
          details: error.details
        },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: ERROR_CODES.SERVER_ERROR,
        success: false
      },
      { status: 500 }
    )
  }
}