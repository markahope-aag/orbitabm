import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { updateActivitySchema } from '@/lib/validations/schemas'
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
      .from('activities')
      .select(`
        *,
        campaigns (id, name),
        contacts (id, first_name, last_name, email),
        playbook_steps (id, step_number, title)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Activity not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      throw new ApiError(
        'Failed to fetch activity',
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
    const validation = validateRequest(updateActivitySchema, body)
    if (!validation.success) return validation.response

    const { data: oldData } = await supabase.from('activities').select('*').eq('id', id).single()

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !oldData || oldData.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('activities')
      .update(validation.data)
      .eq('id', id)
      .select(`
        *,
        campaigns (id, name),
        contacts (id, first_name, last_name, email),
        playbook_steps (id, step_number, title)
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Activity not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      throw new ApiError(
        'Failed to update activity',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    if (oldData) await logUpdate({ supabase, request }, 'activity', id, oldData, data)

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

    // Pre-fetch activity data for audit logging
    const { data: activityData } = await supabase
      .from('activities')
      .select('*')
      .eq('id', id)
      .single()

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !activityData || activityData.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id)

    if (error) {
      throw new ApiError(
        'Failed to delete activity',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    if (activityData) {
      await logDelete({ supabase, request }, 'activity', activityData)
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
