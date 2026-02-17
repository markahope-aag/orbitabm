import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { updateEmailSendSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const orgId = await resolveUserOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('email_sends')
      .select(`
        *,
        contacts (id, first_name, last_name, email, title, companies (id, name)),
        campaigns (id, name, status),
        email_templates (id, name, subject_line, subject_line_alt)
      `)
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError('Email send not found', ERROR_CODES.NOT_FOUND, 404)
      }
      throw new ApiError('Failed to fetch email send', ERROR_CODES.DATABASE_ERROR, 500, error)
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code, success: false }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()
    const validation = validateRequest(updateEmailSendSchema, body)
    if (!validation.success) return validation.response

    const orgId = await resolveUserOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('email_sends')
      .update(validation.data)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      throw new ApiError('Failed to update email send', ERROR_CODES.DATABASE_ERROR, 500, error)
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code, success: false }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const orgId = await resolveUserOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Only allow cancelling queued emails
    const { data, error } = await supabase
      .from('email_sends')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('organization_id', orgId)
      .eq('status', 'queued')
      .select()
      .single()

    if (error) {
      throw new ApiError('Failed to cancel email send (may not be in queued status)', ERROR_CODES.DATABASE_ERROR, 400, error)
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code, success: false }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
