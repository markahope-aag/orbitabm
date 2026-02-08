import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { createVerticalSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'
import { normalizeName } from '@/lib/utils/normalize'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const organizationId = await resolveUserOrgId(supabase)
    if (!organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const sector = searchParams.get('sector')
    const tier = searchParams.get('tier')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('verticals')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)

    // Apply filters
    if (sector) query = query.eq('sector', sector)
    if (tier) query = query.eq('tier', tier)

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new ApiError(
        'Failed to fetch verticals',
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
    const validation = validateRequest(createVerticalSchema, body)
    if (!validation.success) return validation.response

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name } = validation.data
    const nameNormalized = normalizeName(name)

    // Check for duplicate normalized name within organization
    if (nameNormalized) {
      const { data: existing, error: checkError } = await supabase
        .from('verticals')
        .select('id, name')
        .eq('organization_id', userOrgId)
        .eq('name_normalized', nameNormalized)
        .is('deleted_at', null)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw new ApiError(
          'Failed to check for duplicate vertical',
          ERROR_CODES.DATABASE_ERROR,
          500,
          checkError
        )
      }

      if (existing) {
        throw new ApiError(
          `A vertical with a similar name already exists: '${existing.name}'`,
          ERROR_CODES.DUPLICATE_ENTRY,
          409,
          { field: 'name', value: name }
        )
      }
    }

    // Insert new vertical
    const { data, error } = await supabase
      .from('verticals')
      .insert({ ...validation.data, organization_id: userOrgId, name_normalized: nameNormalized })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ApiError(
          'A vertical with this name already exists',
          ERROR_CODES.DUPLICATE_ENTRY,
          409,
          error
        )
      }
      throw new ApiError(
        'Failed to create vertical',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    logCreate({ supabase, request }, 'vertical', data)

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