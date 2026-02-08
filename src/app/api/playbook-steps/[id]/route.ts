import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { updatePlaybookStepSchema } from '@/lib/validations/schemas'
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
      .from('playbook_steps')
      .select(`
        *,
        playbook_templates (id, name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Playbook step not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      throw new ApiError(
        'Failed to fetch playbook step',
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
    const validation = validateRequest(updatePlaybookStepSchema, body)
    if (!validation.success) return validation.response

    const { data: oldData } = await supabase.from('playbook_steps').select('*').eq('id', id).single()

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !oldData || oldData.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('playbook_steps')
      .update(validation.data)
      .eq('id', id)
      .select(`
        *,
        playbook_templates (id, name)
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(
          'Playbook step not found',
          ERROR_CODES.NOT_FOUND,
          404
        )
      }
      throw new ApiError(
        'Failed to update playbook step',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    if (oldData) await logUpdate({ supabase, request }, 'playbook_step', id, oldData, data)

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

    // Pre-fetch playbook step data for audit logging
    const { data: stepData } = await supabase
      .from('playbook_steps')
      .select('*')
      .eq('id', id)
      .single()

    const userOrgId = await resolveUserOrgId(supabase)
    if (!userOrgId || !stepData || stepData.organization_id !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check for active child references
    const [{ data: refActivities }, { data: refTemplates }] = await Promise.all([
      supabase.from('activities').select('id').eq('playbook_step_id', id).is('deleted_at', null).limit(1),
      supabase.from('email_templates').select('id').eq('playbook_step_id', id).is('deleted_at', null).limit(1),
    ])
    if (refActivities?.length || refTemplates?.length) {
      throw new ApiError(
        'Cannot delete playbook step — it has linked activities or email templates.',
        ERROR_CODES.RESOURCE_CONFLICT,
        409
      )
    }

    const { error } = await supabase
      .from('playbook_steps')
      .delete()
      .eq('id', id)

    if (error) {
      throw new ApiError(
        'Failed to delete playbook step',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    if (stepData) {
      await logDelete({ supabase, request }, 'playbook_step', stepData)
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
