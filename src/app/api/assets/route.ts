import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const organizationId = searchParams.get('organization_id')
    const campaignId = searchParams.get('campaign_id')
    const companyId = searchParams.get('company_id')
    const assetType = searchParams.get('asset_type')
    const status = searchParams.get('status')
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
      .from('assets')
      .select(`
        *,
        campaigns (id, name),
        companies (id, name)
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)

    if (campaignId) query = query.eq('campaign_id', campaignId)
    if (companyId) query = query.eq('company_id', companyId)
    if (assetType) query = query.eq('asset_type', assetType)
    if (status) query = query.eq('status', status)

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new ApiError(
        'Failed to fetch assets',
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
      asset_type,
      title,
      campaign_id,
      company_id,
      description,
      file_url,
      landing_page_url,
      status,
      delivered_date
    } = body

    if (!organization_id || !asset_type || !title) {
      throw new ApiError(
        'Organization ID, asset type, and title are required',
        ERROR_CODES.VALIDATION_ERROR,
        400
      )
    }

    const { data, error } = await supabase
      .from('assets')
      .insert({
        organization_id,
        asset_type,
        title,
        campaign_id,
        company_id,
        description,
        file_url,
        landing_page_url,
        status,
        delivered_date
      })
      .select(`
        *,
        campaigns (id, name),
        companies (id, name)
      `)
      .single()

    if (error) {
      throw new ApiError(
        'Failed to create asset',
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
