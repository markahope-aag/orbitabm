import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { createEmailSendSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const orgId = await resolveUserOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const campaignId = searchParams.get('campaign_id')
    const contactId = searchParams.get('contact_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('email_sends')
      .select(`
        *,
        contacts (id, first_name, last_name, email),
        campaigns (id, name),
        email_templates (id, name)
      `)
      .eq('organization_id', orgId)

    if (campaignId) query = query.eq('campaign_id', campaignId)
    if (contactId) query = query.eq('contact_id', contactId)
    if (status) query = query.eq('status', status)

    query = query
      .order('scheduled_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new ApiError('Failed to fetch email sends', ERROR_CODES.DATABASE_ERROR, 500, error)
    }

    return NextResponse.json({ data, success: true, count })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code, success: false }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = validateRequest(createEmailSendSchema, body)
    if (!validation.success) return validation.response

    const orgId = await resolveUserOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('email_sends')
      .insert({ ...validation.data, organization_id: orgId })
      .select()
      .single()

    if (error) {
      throw new ApiError('Failed to create email send', ERROR_CODES.DATABASE_ERROR, 500, error)
    }

    return NextResponse.json({ data, success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code, success: false }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
