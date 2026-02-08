import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { updateAssetSchema } from '@/lib/validations/schemas'
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
      .from('assets')
      .select(`
        *,
        campaigns (id, name),
        companies (id, name)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Asset not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      throw new ApiError(
        'Failed to fetch asset',
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
    const validation = validateRequest(updateAssetSchema, body)
    if (!validation.success) return validation.response

    const { data: oldData } = await supabase.from('assets').select('*').eq('id', id).is('deleted_at', null).single()

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !oldData || oldData.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('assets')
      .update(validation.data)
      .eq('id', id)
      .is('deleted_at', null)
      .select(`
        *,
        campaigns (id, name),
        companies (id, name)
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Asset not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      throw new ApiError(
        'Failed to update asset',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    if (oldData) logUpdate({ supabase, request }, 'asset', id, oldData, data)

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

    const { data: existing } = await supabase.from('assets').select('organization_id').eq('id', id).single()
    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !existing || existing.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Asset not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      throw new ApiError(
        'Failed to delete asset',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    logDelete({ supabase, request }, 'asset', data)

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
