import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token'

/**
 * GET: Verify an unsubscribe token and return contact info.
 * POST: Process the unsubscribe (mark contact, cancel sends).
 * Both are public (no auth required) — they use signed JWT tokens.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    const payload = verifyUnsubscribeToken(token)

    // Look up contact for display
    const supabase = createAdminClient()
    const { data: contact } = await supabase
      .from('contacts')
      .select('first_name, last_name, email')
      .eq('id', payload.contact_id)
      .single()

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', payload.org_id)
      .single()

    return NextResponse.json({
      success: true,
      email: payload.email,
      contact_name: contact ? `${contact.first_name} ${contact.last_name}` : null,
      organization_name: org?.name || null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid or expired token'
    return NextResponse.json({ error: message, success: false }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, reason } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    const payload = verifyUnsubscribeToken(token)
    const supabase = createAdminClient()

    // Mark contact as unsubscribed
    await supabase
      .from('contacts')
      .update({ email_unsubscribed: true })
      .eq('id', payload.contact_id)

    // Create unsubscribe record
    await supabase
      .from('email_unsubscribes')
      .upsert({
        organization_id: payload.org_id,
        contact_id: payload.contact_id,
        email_address: payload.email,
        reason: reason || 'User clicked unsubscribe link',
        source_email_send_id: payload.email_send_id,
      }, { onConflict: 'organization_id,email_address' })

    // Cancel all queued sends for this contact in this org
    await supabase
      .from('email_sends')
      .update({ status: 'cancelled', error_message: 'Contact unsubscribed' })
      .eq('organization_id', payload.org_id)
      .eq('contact_id', payload.contact_id)
      .eq('status', 'queued')

    return NextResponse.json({
      success: true,
      message: 'You have been unsubscribed successfully.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid or expired token'
    return NextResponse.json({ error: message, success: false }, { status: 400 })
  }
}
