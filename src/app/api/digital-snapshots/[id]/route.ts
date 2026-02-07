import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'

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

    // Remove fields that shouldn't be updated
    const {
      id: _id,
      organization_id: _orgId,
      company_id: _companyId,
      created_at: _createdAt,
      ...updateData
    } = body

    // Validate numeric ranges if being updated
    if (updateData.google_rating !== undefined && updateData.google_rating !== null && (updateData.google_rating < 0 || updateData.google_rating > 5)) {
      throw new ApiError(
        'Google rating must be between 0 and 5',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        { field: 'google_rating', value: updateData.google_rating }
      )
    }

    if (updateData.yelp_rating !== undefined && updateData.yelp_rating !== null && (updateData.yelp_rating < 0 || updateData.yelp_rating > 5)) {
      throw new ApiError(
        'Yelp rating must be between 0 and 5',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        { field: 'yelp_rating', value: updateData.yelp_rating }
      )
    }

    if (updateData.page_speed_mobile !== undefined && updateData.page_speed_mobile !== null && (updateData.page_speed_mobile < 0 || updateData.page_speed_mobile > 100)) {
      throw new ApiError(
        'Page speed mobile must be between 0 and 100',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        { field: 'page_speed_mobile', value: updateData.page_speed_mobile }
      )
    }

    if (updateData.page_speed_desktop !== undefined && updateData.page_speed_desktop !== null && (updateData.page_speed_desktop < 0 || updateData.page_speed_desktop > 100)) {
      throw new ApiError(
        'Page speed desktop must be between 0 and 100',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        { field: 'page_speed_desktop', value: updateData.page_speed_desktop }
      )
    }

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