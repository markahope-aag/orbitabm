import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const organizationId = searchParams.get('organization_id')
    const campaignId = searchParams.get('campaign_id')
    const resultType = searchParams.get('result_type')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!organizationId) {
      throw new ApiError(
        'Organization ID is required',
        ERROR_CODES.VALIDATION_ERROR,
        400
      )
    }

    let query = supabase
      .from('results')
      .select(`
        *,
        campaigns (id, name)
      `)
      .eq('organization_id', organizationId)

    if (campaignId) query = query.eq('campaign_id', campaignId)
    if (resultType) query = query.eq('result_type', resultType)

    query = query
      .order('result_date', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new ApiError(
        'Failed to fetch results',
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

    const {
      organization_id,
      campaign_id,
      result_type,
      result_date,
      contract_value_monthly,
      contract_term_months,
      total_contract_value,
      notes
    } = body

    if (!organization_id || !campaign_id || !result_type || !result_date) {
      throw new ApiError(
        'Organization ID, campaign ID, result type, and result date are required',
        ERROR_CODES.VALIDATION_ERROR,
        400
      )
    }

    const { data, error } = await supabase
      .from('results')
      .insert({
        organization_id,
        campaign_id,
        result_type,
        result_date,
        contract_value_monthly,
        contract_term_months,
        total_contract_value,
        notes
      })
      .select(`
        *,
        campaigns (id, name)
      `)
      .single()

    if (error) {
      throw new ApiError(
        'Failed to create result',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

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
