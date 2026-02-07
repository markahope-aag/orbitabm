import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const organizationId = searchParams.get('organization_id')
    const playbookTemplateId = searchParams.get('playbook_template_id')
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
      .from('playbook_steps')
      .select(`
        *,
        playbook_templates (id, name)
      `)
      .eq('organization_id', organizationId)

    if (playbookTemplateId) query = query.eq('playbook_template_id', playbookTemplateId)

    query = query
      .order('step_number', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new ApiError(
        'Failed to fetch playbook steps',
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
      playbook_template_id,
      step_number,
      day_offset,
      channel,
      title,
      description,
      asset_type_required,
      is_pivot_trigger
    } = body

    if (!organization_id || !playbook_template_id || !step_number || !day_offset || !channel || !title) {
      throw new ApiError(
        'Organization ID, playbook template ID, step number, day offset, channel, and title are required',
        ERROR_CODES.VALIDATION_ERROR,
        400
      )
    }

    const { data, error } = await supabase
      .from('playbook_steps')
      .insert({
        organization_id,
        playbook_template_id,
        step_number,
        day_offset,
        channel,
        title,
        description,
        asset_type_required,
        is_pivot_trigger
      })
      .select(`
        *,
        playbook_templates (id, name)
      `)
      .single()

    if (error) {
      throw new ApiError(
        'Failed to create playbook step',
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
