import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { updateDigitalSnapshotSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logUpdate, logDelete } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('digital_snapshots')
      .select(`
        *,
        companies (
          id,
          name,
          website,
          status,
          estimated_revenue,
          employee_count
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Digital snapshot not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      throw new ApiError(
        'Failed to fetch digital snapshot',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || data.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      data,
      success: true
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    const validation = validateRequest(updateDigitalSnapshotSchema, body)
    if (!validation.success) return validation.response
    const updateData = validation.data

    // If snapshot_date is being updated, check for duplicates
    if (updateData.snapshot_date) {
      const { data: current, error: currentError } = await supabase
        .from('digital_snapshots')
        .select('organization_id, company_id')
        .eq('id', id)
        .single()

      if (currentError || !current) {
        throw new ApiError(
          'Digital snapshot not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }

      const { data: existing, error: checkError } = await supabase
        .from('digital_snapshots')
        .select('id')
        .eq('organization_id', current.organization_id)
        .eq('company_id', current.company_id)
        .eq('snapshot_date', updateData.snapshot_date)
        .neq('id', id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw new ApiError(
          'Failed to check for duplicate snapshot',
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
            value: updateData.snapshot_date,
            company_id: current.company_id
          }
        )
      }
    }

    const { data: oldData } = await supabase.from('digital_snapshots').select('*').eq('id', id).single()

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !oldData || oldData.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('digital_snapshots')
      .update(updateData)
      .eq('id', id)
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
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Digital snapshot not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      throw new ApiError(
        'Failed to update digital snapshot',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    if (oldData) await logUpdate({ supabase, request }, 'digital_snapshot', id, oldData, data)

    return NextResponse.json({
      data,
      success: true
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Pre-fetch snapshot data for audit logging
    const { data: snapshotData } = await supabase
      .from('digital_snapshots')
      .select('*')
      .eq('id', id)
      .single()

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !snapshotData || snapshotData.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Digital snapshots are historical data, so we do a hard delete
    // (unlike other entities that use soft deletes)
    const { error } = await supabase
      .from('digital_snapshots')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Digital snapshot not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      throw new ApiError(
        'Failed to delete digital snapshot',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    if (snapshotData) {
      await logDelete({ supabase, request }, 'digital_snapshot', snapshotData)
    }

    return NextResponse.json({
      data: { id, deleted: true },
      success: true
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