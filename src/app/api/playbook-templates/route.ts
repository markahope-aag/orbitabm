import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { createPlaybookTemplateSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const organizationId = searchParams.get('organization_id')
    const verticalId = searchParams.get('vertical_id')
    const isActive = searchParams.get('is_active')
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
      .from('playbook_templates')
      .select(`
        *,
        verticals (id, name),
        playbook_steps (id, step_number, channel, title, day_offset)
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)

    if (verticalId) query = query.eq('vertical_id', verticalId)
    if (isActive !== null && isActive !== undefined) query = query.eq('is_active', isActive === 'true')

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new ApiError(
        'Failed to fetch playbook templates',
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
    const validation = validateRequest(createPlaybookTemplateSchema, body)
    if (!validation.success) return validation.response

    const { data, error } = await supabase
      .from('playbook_templates')
      .insert(validation.data)
      .select(`
        *,
        verticals (id, name),
        playbook_steps (id, step_number, channel, title, day_offset)
      `)
      .single()

    if (error) {
      throw new ApiError(
        'Failed to create playbook template',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    logCreate({ supabase, request }, 'playbook_template', data)

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
