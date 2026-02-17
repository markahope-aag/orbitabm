import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'

/**
 * List unsubscribed emails for the org.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const orgId = await resolveUserOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data, error } = await supabase
      .from('email_unsubscribes')
      .select(`
        *,
        contacts (id, first_name, last_name, email)
      `)
      .eq('organization_id', orgId)
      .order('unsubscribed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new ApiError('Failed to fetch unsubscribes', ERROR_CODES.DATABASE_ERROR, 500, error)
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code, success: false }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}

/**
 * Re-subscribe a contact (delete the unsubscribe record).
 * Body: { email_address: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { email_address } = await request.json()

    const orgId = await resolveUserOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!email_address) {
      return NextResponse.json({ error: 'Missing email_address' }, { status: 400 })
    }

    // Delete unsubscribe record
    await supabase
      .from('email_unsubscribes')
      .delete()
      .eq('organization_id', orgId)
      .eq('email_address', email_address)

    // Reset contact flag
    await supabase
      .from('contacts')
      .update({ email_unsubscribed: false })
      .eq('organization_id', orgId)
      .eq('email', email_address)

    return NextResponse.json({ success: true, message: `${email_address} re-subscribed` })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code, success: false }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
