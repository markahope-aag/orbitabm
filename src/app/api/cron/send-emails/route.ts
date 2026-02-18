import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSesClient, sendViaSes } from '@/lib/email/ses-client'
import { buildHtmlEmail, buildPlainEmail, buildUnsubscribeFooter, formatBodyText } from '@/lib/email/builder'
import { renderMergeFields, buildMergeData } from '@/lib/email/merge-fields'
import { signUnsubscribeToken } from '@/lib/email/unsubscribe-token'
import { createEmailEngagement, decryptHubSpotToken } from '@/lib/email/hubspot'

export const maxDuration = 300 // 5 min max for Vercel
export const dynamic = 'force-dynamic'

/**
 * Cron-triggered email sending engine.
 * Runs every 5 min on weekdays 8am-6pm (UTC).
 * Picks up queued emails, sends via SES, updates status.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results: { org: string; sent: number; errors: number }[] = []

  // Get all orgs with sending enabled
  const { data: orgSettings } = await supabase
    .from('email_settings')
    .select('*')
    .eq('sending_enabled', true)

  if (!orgSettings || orgSettings.length === 0) {
    return NextResponse.json({ message: 'No orgs with sending enabled', results: [] })
  }

  for (const settings of orgSettings) {
    let sent = 0
    let errors = 0

    // Reset daily counter if needed
    const today = new Date().toISOString().split('T')[0]
    if (settings.sends_today_reset_at !== today) {
      await supabase
        .from('email_settings')
        .update({ sends_today: 0, sends_today_reset_at: today })
        .eq('id', settings.id)
      settings.sends_today = 0
    }

    // Check daily limit
    if (settings.sends_today >= settings.daily_send_limit) {
      results.push({ org: settings.organization_id, sent: 0, errors: 0 })
      continue
    }

    const remaining = settings.daily_send_limit - settings.sends_today

    // Get queued emails ready to send
    const { data: queuedEmails } = await supabase
      .from('email_sends')
      .select(`
        *,
        contacts (id, first_name, last_name, title, email, email_unsubscribed, hubspot_contact_id, companies (id, name, website, city, state, hubspot_company_id)),
        campaigns (id, name, status),
        email_templates (id, subject_line, subject_line_alt, body, include_unsubscribe_footer)
      `)
      .eq('organization_id', settings.organization_id)
      .eq('status', 'queued')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(remaining)

    if (!queuedEmails || queuedEmails.length === 0) {
      results.push({ org: settings.organization_id, sent: 0, errors: 0 })
      continue
    }

    // Create SES client for this org
    let sesClient
    try {
      sesClient = createSesClient(settings)
    } catch (err) {
      console.error(`[cron] Failed to create SES client for org ${settings.organization_id}:`, err)
      results.push({ org: settings.organization_id, sent: 0, errors: queuedEmails.length })
      continue
    }

    for (const emailSend of queuedEmails) {
      try {
        // Skip if contact unsubscribed
        if (emailSend.contacts?.email_unsubscribed) {
          await supabase
            .from('email_sends')
            .update({ status: 'cancelled', error_message: 'Contact unsubscribed' })
            .eq('id', emailSend.id)
          continue
        }

        // Skip if campaign paused or completed
        const campaignStatus = emailSend.campaigns?.status
        if (campaignStatus && !['active', 'planned'].includes(campaignStatus)) {
          await supabase
            .from('email_sends')
            .update({ status: 'cancelled', error_message: `Campaign ${campaignStatus}` })
            .eq('id', emailSend.id)
          continue
        }

        // Check for unsubscribe in the unsubscribes table
        const { data: unsub } = await supabase
          .from('email_unsubscribes')
          .select('id')
          .eq('organization_id', settings.organization_id)
          .eq('email_address', emailSend.recipient_email)
          .limit(1)
          .single()

        if (unsub) {
          await supabase
            .from('email_sends')
            .update({ status: 'cancelled', error_message: 'Email address unsubscribed' })
            .eq('id', emailSend.id)
          continue
        }

        // Re-render merge fields from template if available
        const template = emailSend.email_templates
        const contact = emailSend.contacts
        const company = contact?.companies

        const mergeData = contact
          ? buildMergeData(contact, company)
          : {}

        // Pick A/B subject
        let subject = emailSend.subject_line
        let variant: 'A' | 'B' = 'A'
        if (template?.subject_line_alt) {
          if (Math.random() < 0.5) {
            subject = renderMergeFields(template.subject_line_alt, mergeData)
            variant = 'B'
          } else {
            subject = renderMergeFields(template.subject_line, mergeData)
          }
        } else if (template) {
          subject = renderMergeFields(template.subject_line, mergeData)
        }

        // Render body
        const bodyRaw = template
          ? renderMergeFields(template.body, mergeData)
          : emailSend.body_plain || ''
        const bodyText = formatBodyText(bodyRaw)

        // Build unsubscribe footer
        let unsubFooter = ''
        const includeUnsub = template?.include_unsubscribe_footer !== false
        if (includeUnsub && contact) {
          const token = signUnsubscribeToken({
            org_id: settings.organization_id,
            contact_id: contact.id,
            email_send_id: emailSend.id,
            email: emailSend.recipient_email,
          })
          const baseUrl = settings.unsubscribe_url || process.env.NEXT_PUBLIC_APP_URL || 'https://app.orbitabm.com'
          const unsubUrl = `${baseUrl}/unsubscribe?token=${token}`
          unsubFooter = buildUnsubscribeFooter(unsubUrl, settings.sender_address)
        }

        // Build final email
        const bodyHtml = buildHtmlEmail(bodyText, settings.signature_html) + unsubFooter
        const bodyPlain = buildPlainEmail(bodyText, settings.signature_plain)

        // Mark as sending
        await supabase
          .from('email_sends')
          .update({ status: 'sending' })
          .eq('id', emailSend.id)

        // Send
        const messageId = await sendViaSes(sesClient, settings, {
          to: emailSend.recipient_email,
          subject,
          bodyHtml,
          bodyPlain,
          tags: {
            org_id: settings.organization_id,
            email_send_id: emailSend.id,
            campaign_id: emailSend.campaign_id || '',
            contact_id: emailSend.contact_id || '',
          },
        })

        // Update with success
        await supabase
          .from('email_sends')
          .update({
            status: 'delivered',
            ses_message_id: messageId,
            subject_line: subject,
            subject_line_variant: variant,
            body_plain: bodyPlain,
            body_html: bodyHtml,
            sent_at: new Date().toISOString(),
          })
          .eq('id', emailSend.id)

        // Sync to HubSpot
        if (settings.hubspot_enabled && settings.hubspot_token_encrypted && contact?.hubspot_contact_id) {
          try {
            const hsToken = decryptHubSpotToken(settings.hubspot_token_encrypted)
            const engagementId = await createEmailEngagement(hsToken, {
              subject,
              bodyPlain,
              fromEmail: settings.from_email,
              fromName: settings.from_name || '',
              hubspotOwnerId: settings.hubspot_owner_id,
              contactHsId: contact.hubspot_contact_id,
              companyHsId: company?.hubspot_company_id,
            })
            if (engagementId) {
              await supabase
                .from('email_sends')
                .update({ hubspot_engagement_id: engagementId })
                .eq('id', emailSend.id)
            }
          } catch (hsErr) {
            console.error(`[cron] HubSpot sync failed for email ${emailSend.id}:`, hsErr)
          }
        }

        // Update linked activity
        if (emailSend.activity_id) {
          await supabase
            .from('activities')
            .update({
              status: 'completed',
              completed_date: new Date().toISOString().split('T')[0],
            })
            .eq('id', emailSend.activity_id)
        }

        // Increment daily counter
        await supabase
          .from('email_settings')
          .update({ sends_today: settings.sends_today + sent + 1 })
          .eq('id', settings.id)

        sent++

        // Rate limit delay
        if (settings.delay_between_sends_ms > 0) {
          await new Promise((r) => setTimeout(r, settings.delay_between_sends_ms))
        }
      } catch (err) {
        console.error(`[cron] Failed to send email ${emailSend.id}:`, err)
        await supabase
          .from('email_sends')
          .update({
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown error',
          })
          .eq('id', emailSend.id)
        errors++
      }
    }

    results.push({ org: settings.organization_id, sent, errors })
  }

  return NextResponse.json({
    message: 'Cron complete',
    timestamp: new Date().toISOString(),
    results,
  })
}
