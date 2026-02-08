import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { createActivitySchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { logCreate } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const organizationId = searchParams.get('organization_id')
    const campaignId = searchParams.get('campaign_id')
    const contactId = searchParams.get('contact_id')
    const activityType = searchParams.get('activity_type')
    const channel = searchParams.get('channel')
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
      .from('activities')
      .select(`
        *,
        campaigns (id, name),
        contacts (id, first_name, last_name, email),
        playbook_steps (id, step_number, title)
      `)
      .eq('organization_id', organizationId)

    if (campaignId) query = query.eq('campaign_id', campaignId)
    if (contactId) query = query.eq('contact_id', contactId)
    if (activityType) query = query.eq('activity_type', activityType)
    if (channel) query = query.eq('channel', channel)
    if (status) query = query.eq('status', status)

    query = query
      .order('scheduled_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new ApiError(
        'Failed to fetch activities',
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
    const validation = validateRequest(createActivitySchema, body)
    if (!validation.success) return validation.response

    const { data, error } = await supabase
      .from('activities')
      .insert(validation.data)
      .select(`
        *,
        campaigns (id, name),
        contacts (id, first_name, last_name, email),
        playbook_steps (id, step_number, title)
      `)
      .single()

    if (error) {
      throw new ApiError(
        'Failed to create activity',
        ERROR_CODES.DATABASE_ERROR,
        500,
        error
      )
    }

    logCreate({ supabase, request }, 'activity', data)

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
