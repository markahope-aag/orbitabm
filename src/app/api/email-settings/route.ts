import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { createEmailSettingsSchema, updateEmailSettingsSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'
import { encrypt } from '@/lib/email/crypto'

export async function GET() {
  try {
    const supabase = await createClient()
    const orgId = await resolveUserOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .eq('organization_id', orgId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new ApiError('Failed to fetch email settings', ERROR_CODES.DATABASE_ERROR, 500, error)
    }

    // Mask encrypted fields for the response
    if (data) {
      const masked = {
        ...data,
        aws_access_key_id_encrypted: data.aws_access_key_id_encrypted ? '***configured***' : null,
        aws_secret_key_encrypted: data.aws_secret_key_encrypted ? '***configured***' : null,
        hubspot_token_encrypted: data.hubspot_token_encrypted ? '***configured***' : null,
      }
      return NextResponse.json({ data: masked, success: true })
    }

    return NextResponse.json({ data: null, success: true })
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
    const validation = validateRequest(createEmailSettingsSchema, body)
    if (!validation.success) return validation.response

    const orgId = await resolveUserOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Encrypt sensitive fields
    const insert: Record<string, unknown> = { organization_id: orgId }
    const { aws_access_key_id, aws_secret_key, hubspot_token, ...rest } = validation.data
    Object.assign(insert, rest)

    if (aws_access_key_id) insert.aws_access_key_id_encrypted = encrypt(aws_access_key_id)
    if (aws_secret_key) insert.aws_secret_key_encrypted = encrypt(aws_secret_key)
    if (hubspot_token) insert.hubspot_token_encrypted = encrypt(hubspot_token)

    const { data, error } = await supabase
      .from('email_settings')
      .insert(insert)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ApiError('Email settings already exist for this organization', ERROR_CODES.DUPLICATE_ENTRY, 409, error)
      }
      throw new ApiError('Failed to create email settings', ERROR_CODES.DATABASE_ERROR, 500, error)
    }

    return NextResponse.json({ data, success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code, success: false }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = validateRequest(updateEmailSettingsSchema, body)
    if (!validation.success) return validation.response

    const orgId = await resolveUserOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Encrypt sensitive fields if provided
    const update: Record<string, unknown> = {}
    const { aws_access_key_id, aws_secret_key, hubspot_token, ...rest } = validation.data
    Object.assign(update, rest)

    if (aws_access_key_id) update.aws_access_key_id_encrypted = encrypt(aws_access_key_id)
    if (aws_secret_key) update.aws_secret_key_encrypted = encrypt(aws_secret_key)
    if (hubspot_token) update.hubspot_token_encrypted = encrypt(hubspot_token)

    const { data, error } = await supabase
      .from('email_settings')
      .update(update)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      throw new ApiError('Failed to update email settings', ERROR_CODES.DATABASE_ERROR, 500, error)
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code, success: false }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
