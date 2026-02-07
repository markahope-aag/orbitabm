import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const organizationId = searchParams.get('organization_id')
    const companyId = searchParams.get('company_id')
    const snapshotDate = searchParams.get('snapshot_date')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
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

    const {
      organization_id,
      company_id,
      snapshot_date = new Date().toISOString().split('T')[0], // Default to today
      google_rating,
      google_review_count,
      yelp_rating,
      yelp_review_count,
      bbb_rating,
      facebook_followers,
      instagram_followers,
      linkedin_followers,
      domain_authority,
      page_speed_mobile,
      page_speed_desktop,
      organic_keywords,
      monthly_organic_traffic_est,
      website_has_ssl,
      website_is_mobile_responsive,
      has_online_booking,
      has_live_chat,
      has_blog,
      notes
    } = body

    // Validation
    if (!organization_id || !company_id) {
      throw new ApiError(
        'Organization ID and company ID are required',
        ERROR_CODES.VALIDATION_ERROR,
        400
      )
    }

    // Verify that the company exists and belongs to the organization
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', company_id)
      .eq('organization_id', organization_id)
      .is('deleted_at', null)
      .single()

    if (companyError || !company) {
      throw new ApiError(
        'Company not found or does not belong to organization',
        ERROR_CODES.NOT_FOUND,
        404
      )
    }

    // Validate numeric ranges
    if (google_rating !== null && google_rating !== undefined && (google_rating < 0 || google_rating > 5)) {
      throw new ApiError(
        'Google rating must be between 0 and 5',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        { field: 'google_rating', value: google_rating }
      )
    }

    if (yelp_rating !== null && yelp_rating !== undefined && (yelp_rating < 0 || yelp_rating > 5)) {
      throw new ApiError(
        'Yelp rating must be between 0 and 5',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        { field: 'yelp_rating', value: yelp_rating }
      )
    }

    if (page_speed_mobile !== null && page_speed_mobile !== undefined && (page_speed_mobile < 0 || page_speed_mobile > 100)) {
      throw new ApiError(
        'Page speed mobile must be between 0 and 100',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        { field: 'page_speed_mobile', value: page_speed_mobile }
      )
    }

    if (page_speed_desktop !== null && page_speed_desktop !== undefined && (page_speed_desktop < 0 || page_speed_desktop > 100)) {
      throw new ApiError(
        'Page speed desktop must be between 0 and 100',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        { field: 'page_speed_desktop', value: page_speed_desktop }
      )
    }

    // Check if a snapshot already exists for this company and date
    const { data: existing, error: checkError } = await supabase
      .from('digital_snapshots')
      .select('id')
      .eq('organization_id', organization_id)
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
      .insert({
        organization_id,
        company_id,
        snapshot_date,
        google_rating,
        google_review_count,
        yelp_rating,
        yelp_review_count,
        bbb_rating,
        facebook_followers,
        instagram_followers,
        linkedin_followers,
        domain_authority,
        page_speed_mobile,
        page_speed_desktop,
        organic_keywords,
        monthly_organic_traffic_est,
        website_has_ssl,
        website_is_mobile_responsive,
        has_online_booking,
        has_live_chat,
        has_blog,
        notes
      })
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