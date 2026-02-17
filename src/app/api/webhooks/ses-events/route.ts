import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sesEventSchema } from '@/lib/validations/schemas'

export const dynamic = 'force-dynamic'

/**
 * Webhook endpoint for SES events posted by n8n.
 * Handles: Delivery, Open, Click, Bounce, Complaint
 */
export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get('x-webhook-secret')
  const expectedSecret = process.env.ORBIT_WEBHOOK_SECRET
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = sesEventSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid event payload', details: result.error.issues }, { status: 400 })
    }

    const { ses_message_id, event_type, timestamp, details } = result.data
    const supabase = createAdminClient()

    // Look up the email send by SES message ID
    const { data: emailSend, error: lookupError } = await supabase
      .from('email_sends')
      .select('id, organization_id, contact_id, campaign_id, activity_id, status, open_count, click_count, clicked_links')
      .eq('ses_message_id', ses_message_id)
      .single()

    if (lookupError || !emailSend) {
      // Not found — might be a test email or old email. Log and return 200.
      console.log(`[ses-events] No email_send found for message_id: ${ses_message_id}`)
      return NextResponse.json({ success: true, message: 'No matching email send found' })
    }

    const now = timestamp || new Date().toISOString()
    const update: Record<string, unknown> = {}

    switch (event_type) {
      case 'Delivery':
        // Only upgrade status if currently 'sending'
        if (emailSend.status === 'sending') {
          update.status = 'delivered'
        }
        break

      case 'Open':
        update.open_count = (emailSend.open_count || 0) + 1
        update.last_opened_at = now
        if (!emailSend.open_count || emailSend.open_count === 0) {
          update.first_opened_at = now
        }
        // Only upgrade status if not already clicked/replied
        if (!['clicked', 'replied'].includes(emailSend.status)) {
          update.status = 'opened'
        }
        // Update activity outcome
        if (emailSend.activity_id) {
          await supabase
            .from('activities')
            .update({ outcome: 'opened' })
            .eq('id', emailSend.activity_id)
        }
        break

      case 'Click': {
        update.click_count = (emailSend.click_count || 0) + 1
        if (!emailSend.click_count || emailSend.click_count === 0) {
          update.first_clicked_at = now
        }
        const link = (details?.link as string) || ''
        if (link) {
          const existing = emailSend.clicked_links || []
          if (!existing.includes(link)) {
            update.clicked_links = [...existing, link]
          }
        }
        // Upgrade status
        if (emailSend.status !== 'replied') {
          update.status = 'clicked'
        }
        // Update activity outcome
        if (emailSend.activity_id) {
          await supabase
            .from('activities')
            .update({ outcome: 'clicked' })
            .eq('id', emailSend.activity_id)
        }
        break
      }

      case 'Bounce': {
        update.bounced_at = now
        update.bounce_type = (details?.bounceType as string) || 'Permanent'
        update.status = 'bounced'
        // Update activity outcome
        if (emailSend.activity_id) {
          await supabase
            .from('activities')
            .update({ outcome: 'bounced', status: 'completed' })
            .eq('id', emailSend.activity_id)
        }

        // Auto-pause: mark contact unsubscribed, cancel remaining queued sends
        const isPermanent = update.bounce_type === 'Permanent'
        if (isPermanent && emailSend.contact_id) {
          // Mark contact as unsubscribed
          await supabase
            .from('contacts')
            .update({ email_unsubscribed: true })
            .eq('id', emailSend.contact_id)

          // Get contact email for unsubscribe record
          const { data: contact } = await supabase
            .from('contacts')
            .select('email')
            .eq('id', emailSend.contact_id)
            .single()

          if (contact?.email) {
            // Create unsubscribe record
            await supabase
              .from('email_unsubscribes')
              .upsert({
                organization_id: emailSend.organization_id,
                contact_id: emailSend.contact_id,
                email_address: contact.email,
                reason: `Hard bounce: ${update.bounce_type}`,
                source_email_send_id: emailSend.id,
              }, { onConflict: 'organization_id,email_address' })
          }

          // Cancel remaining queued sends for this contact in this campaign
          if (emailSend.campaign_id) {
            await supabase
              .from('email_sends')
              .update({ status: 'cancelled', error_message: 'Contact bounced (permanent)' })
              .eq('contact_id', emailSend.contact_id)
              .eq('campaign_id', emailSend.campaign_id)
              .eq('status', 'queued')
          }
        }
        break
      }

      case 'Complaint': {
        update.complained_at = now
        update.status = 'complained'
        // Update activity outcome
        if (emailSend.activity_id) {
          await supabase
            .from('activities')
            .update({ outcome: 'complained', status: 'completed' })
            .eq('id', emailSend.activity_id)
        }

        // Same auto-pause as bounce
        if (emailSend.contact_id) {
          await supabase
            .from('contacts')
            .update({ email_unsubscribed: true })
            .eq('id', emailSend.contact_id)

          const { data: contact } = await supabase
            .from('contacts')
            .select('email')
            .eq('id', emailSend.contact_id)
            .single()

          if (contact?.email) {
            await supabase
              .from('email_unsubscribes')
              .upsert({
                organization_id: emailSend.organization_id,
                contact_id: emailSend.contact_id,
                email_address: contact.email,
                reason: 'Spam complaint',
                source_email_send_id: emailSend.id,
              }, { onConflict: 'organization_id,email_address' })
          }

          if (emailSend.campaign_id) {
            await supabase
              .from('email_sends')
              .update({ status: 'cancelled', error_message: 'Contact complained (spam)' })
              .eq('contact_id', emailSend.contact_id)
              .eq('campaign_id', emailSend.campaign_id)
              .eq('status', 'queued')
          }
        }
        break
      }
    }

    // Apply updates
    if (Object.keys(update).length > 0) {
      await supabase
        .from('email_sends')
        .update(update)
        .eq('id', emailSend.id)
    }

    return NextResponse.json({ success: true, event_type, email_send_id: emailSend.id })
  } catch (error) {
    console.error('[ses-events] Error processing event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
