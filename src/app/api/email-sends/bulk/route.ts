import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ERROR_CODES } from '@/lib/utils/errors'
import { bulkEmailSendsSchema } from '@/lib/validations/schemas'
import { validateRequest } from '@/lib/validations/helpers'
import { resolveUserOrgId } from '@/lib/auth/resolve-org'
import { renderMergeFields, buildMergeData } from '@/lib/email/merge-fields'
import { formatBodyText } from '@/lib/email/builder'

/**
 * Bulk generate email queue from a campaign's playbook.
 * For each email step in the playbook, creates activity + email_sends rows
 * for every contact in the campaign's company.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = validateRequest(bulkEmailSendsSchema, body)
    if (!validation.success) return validation.response

    const orgId = await resolveUserOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { campaign_id, start_from_step } = validation.data

    // Fetch campaign with company and playbook
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        *,
        companies (id, name, website, city, state),
        playbook_templates (id, name)
      `)
      .eq('id', campaign_id)
      .eq('organization_id', orgId)
      .single()

    if (campaignError || !campaign) {
      throw new ApiError('Campaign not found', ERROR_CODES.NOT_FOUND, 404)
    }

    if (!campaign.playbook_template_id) {
      throw new ApiError('Campaign has no playbook template assigned', ERROR_CODES.VALIDATION_ERROR, 400)
    }

    if (!campaign.start_date) {
      throw new ApiError('Campaign has no start date', ERROR_CODES.VALIDATION_ERROR, 400)
    }

    // Fetch email steps from playbook
    let stepsQuery = supabase
      .from('playbook_steps')
      .select('*')
      .eq('playbook_template_id', campaign.playbook_template_id)
      .eq('channel', 'email')
      .order('step_number', { ascending: true })

    if (start_from_step) {
      stepsQuery = stepsQuery.gte('step_number', start_from_step)
    }

    const { data: steps } = await stepsQuery
    if (!steps || steps.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No email steps found in playbook',
        created: 0,
      })
    }

    // Fetch contacts for this company
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('company_id', campaign.company_id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .eq('email_unsubscribed', false)

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No eligible contacts found for this company',
        created: 0,
      })
    }

    // Fetch email settings for from_email
    const { data: settings } = await supabase
      .from('email_settings')
      .select('ses_from_email')
      .eq('organization_id', orgId)
      .single()

    const fromEmail = settings?.ses_from_email || 'noreply@orbitabm.com'

    // Fetch email templates for these steps
    const stepIds = steps.map((s) => s.id)
    const { data: templates } = await supabase
      .from('email_templates')
      .select('*')
      .eq('organization_id', orgId)
      .in('playbook_step_id', stepIds)

    // Build template lookup: campaign-scoped first, then org default
    type EmailTemplate = NonNullable<typeof templates>[number]
    const templateMap = new Map<string, EmailTemplate>()
    for (const t of templates || []) {
      if (!t.playbook_step_id) continue
      const existing = templateMap.get(t.playbook_step_id)
      // Campaign-scoped template wins
      if (t.campaign_id === campaign_id) {
        templateMap.set(t.playbook_step_id, t)
      } else if (!existing) {
        templateMap.set(t.playbook_step_id, t)
      }
    }

    const startDate = new Date(campaign.start_date)
    let created = 0

    for (const step of steps) {
      const template = templateMap.get(step.id)
      if (!template) continue // Skip steps without email templates

      const scheduledDate = new Date(startDate)
      scheduledDate.setDate(scheduledDate.getDate() + step.day_offset)

      for (const contact of contacts) {
        if (!contact.email) continue

        const mergeData = buildMergeData(contact, campaign.companies)
        const subject = renderMergeFields(template.subject_line, mergeData)
        const bodyRaw = renderMergeFields(template.body, mergeData)
        const bodyPlain = formatBodyText(bodyRaw)

        // Create activity
        const { data: activity } = await supabase
          .from('activities')
          .insert({
            organization_id: orgId,
            campaign_id: campaign.id,
            playbook_step_id: step.id,
            contact_id: contact.id,
            activity_type: 'email_sent',
            channel: 'email',
            scheduled_date: scheduledDate.toISOString().split('T')[0],
            status: 'scheduled',
          })
          .select('id')
          .single()

        // Create email send
        await supabase
          .from('email_sends')
          .insert({
            organization_id: orgId,
            campaign_id: campaign.id,
            contact_id: contact.id,
            activity_id: activity?.id || null,
            email_template_id: template.id,
            recipient_email: contact.email,
            from_email: fromEmail,
            subject_line: subject,
            body_plain: bodyPlain,
            status: 'queued',
            scheduled_at: scheduledDate.toISOString(),
          })

        created++
      }
    }

    // Activate campaign if it was planned
    if (campaign.status === 'planned') {
      await supabase
        .from('campaigns')
        .update({ status: 'active' })
        .eq('id', campaign.id)
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${created} email sends across ${steps.length} steps for ${contacts.length} contacts`,
      created,
      steps: steps.length,
      contacts: contacts.length,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code, success: false }, { status: error.statusCode })
    }
    console.error('[bulk-email-sends]', error)
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
