import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'
import { createSesClient, sendViaSes } from '@/lib/email/ses-client'
import { buildHtmlEmail, buildPlainEmail } from '@/lib/email/builder'

/**
 * Send a test email to verify SES configuration.
 * POST body: { to: "test@example.com" }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const orgId = await resolveUserOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { to } = await request.json()
    if (!to) {
      return NextResponse.json({ error: 'Missing "to" email address' }, { status: 400 })
    }

    const { data: settings } = await supabase
      .from('email_settings')
      .select('*')
      .eq('organization_id', orgId)
      .single()

    if (!settings) {
      return NextResponse.json({ error: 'Email settings not configured' }, { status: 404 })
    }

    const sesClient = createSesClient(settings)

    const subject = '[OrbitABM Test] Email Configuration Verified'
    const bodyText = 'This is a test email from OrbitABM to verify your email sending configuration is working correctly.\n\nIf you received this, your SES setup is good to go!'
    const bodyHtml = buildHtmlEmail(bodyText, settings.signature_html)
    const bodyPlain = buildPlainEmail(bodyText, settings.signature_plain)

    const messageId = await sendViaSes(sesClient, settings, {
      to,
      subject,
      bodyHtml,
      bodyPlain,
      tags: { type: 'test', org_id: orgId },
    })

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${to}`,
      ses_message_id: messageId,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send test email',
    }, { status: 500 })
  }
}
