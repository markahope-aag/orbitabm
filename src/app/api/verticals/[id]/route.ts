import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { updateVerticalSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logUpdate, logDelete } from '@/lib/audit'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'
import { normalizeName } from '@/lib/utils/normalize'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('verticals')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Vertical not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      throw new ApiError(
        'Failed to fetch vertical',
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
    const validation = validateRequest(updateVerticalSchema, body)
    if (!validation.success) return validation.response
    const updateData = { ...validation.data } as Record<string, unknown>

    // If name is being updated, check for normalized name duplicates
    if (validation.data.name) {
      const nameNormalized = normalizeName(validation.data.name)
      updateData.name_normalized = nameNormalized

      if (nameNormalized) {
        const { data: existing, error: checkError } = await supabase
          .from('verticals')
          .select('id, name')
          .eq('name_normalized', nameNormalized)
          .neq('id', id)
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
            { field: 'name', value: validation.data.name }
          )
        }
      }
    }

    const { data: oldData } = await supabase.from('verticals').select('*').eq('id', id).is('deleted_at', null).single()

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !oldData || oldData.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('verticals')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Vertical not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      if (error.code === '23505') {
        throw new ApiError(
          'A vertical with this name already exists',
          ERROR_CODES.DUPLICATE_ENTRY,
          409,
          error
        )
      }
      throw new ApiError(
        'Failed to update vertical',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    if (oldData) logUpdate({ supabase, request }, 'vertical', id, oldData, data)

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

    const { data: existing } = await supabase.from('verticals').select('organization_id').eq('id', id).single()
    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !existing || existing.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if vertical is in use by companies
    const { data: companiesUsingVertical, error: checkError } = await supabase
      .from('companies')
      .select('id')
      .eq('vertical_id', id)
      .is('deleted_at', null)
      .limit(1)

    if (checkError) {
      throw new ApiError(
        'Failed to check vertical usage',
        ERROR_CODES.DATABASE_ERROR,
        500,
        checkError
      )
    }

    if (companiesUsingVertical && companiesUsingVertical.length > 0) {
      throw new ApiError(
        'Cannot delete vertical that is in use by companies',
        ERROR_CODES.VALIDATION_ERROR,
        409,
        { reason: 'vertical_in_use' }
      )
    }

    // Soft delete the vertical
    const { data, error } = await supabase
      .from('verticals')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Vertical not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      throw new ApiError(
        'Failed to delete vertical',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    logDelete({ supabase, request }, 'vertical', data)

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