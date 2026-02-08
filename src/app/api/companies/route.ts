import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { createCompanySchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const organizationId = searchParams.get('organization_id')
    const marketId = searchParams.get('market_id')
    const verticalId = searchParams.get('vertical_id')
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
      .from('companies')
      .select(`
        *,
        markets (name),
        verticals (name)
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)

    // Apply filters
    if (marketId) query = query.eq('market_id', marketId)
    if (verticalId) query = query.eq('vertical_id', verticalId)
    if (status) query = query.eq('status', status)

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new ApiError(
        'Failed to fetch companies',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    return NextResponse.json({
      data,
      count,
      success: true
    })

  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { 
          error: error.message, 
          code: error.code,
          success: false 
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
    const validation = validateRequest(createCompanySchema, body)
    if (!validation.success) return validation.response

    const { data, error } = await supabase
      .from('companies')
      .insert([validation.data])
      .select()
      .single()

    if (error) {
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        throw new ApiError(
          'A company with this name already exists',
          ERROR_CODES.DUPLICATE_ENTRY,
          409,
          error
        )
      }
      
      throw new ApiError(
        'Failed to create company',
        ERROR_CODES.DATABASE_ERROR,
        400,
        error
      )
    }

    logCreate({ supabase, request }, 'company', data)

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
          success: false 
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