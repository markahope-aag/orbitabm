import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { createCompanySchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'
import { extractDomain } from '@/lib/utils/normalize'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const organizationId = await resolveUserOrgId(supabase)
    if (!organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const marketId = searchParams.get('market_id')
    const verticalId = searchParams.get('vertical_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

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

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const domain = extractDomain(validation.data.website)

    // Check for duplicate domain within organization
    if (domain) {
      const { data: existing, error: checkError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('organization_id', userOrgId)
        .eq('domain', domain)
        .is('deleted_at', null)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw new ApiError(
          'Failed to check for duplicate company',
          ERROR_CODES.DATABASE_ERROR,
          500,
          checkError
        )
      }

      if (existing) {
        throw new ApiError(
          `A company with domain '${domain}' already exists (${existing.name})`,
          ERROR_CODES.DUPLICATE_ENTRY,
          409,
          { field: 'website', value: domain }
        )
      }
    }

    const { data, error } = await supabase
      .from('companies')
      .insert([{ ...validation.data, organization_id: userOrgId, domain }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ApiError(
          'A company with this name or domain already exists',
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