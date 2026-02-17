/**
 * BluePoint ATM Email Migration Script
 *
 * One-time migration to move BluePoint ABM email data from Google Sheets
 * into OrbitABM's email_settings + email_sends tables.
 *
 * Usage:
 *   npx tsx scripts/migrate-bluepoint-emails.ts --dry-run     Preview what would be migrated
 *   npx tsx scripts/migrate-bluepoint-emails.ts               Run the migration
 *
 * Prerequisites:
 *   - OrbitABM migrations 022 + 023 applied
 *   - EMAIL_ENCRYPTION_KEY set in environment
 *   - Google service account with Sheets access
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in environment
 */

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { encrypt } from '../src/lib/email/crypto'

// ============================================================
// CONFIG
// ============================================================

const BLUEPOINT_CONFIG = {
  // SES config from sender.mjs
  ses_region: 'us-east-2',
  ses_from_name: 'Mike Stebbins',
  ses_from_email: 'mike@bluepointatm.co',
  ses_reply_to: 'mike@bluepointatm.co',
  ses_config_set: 'bluepoint-abm-tracking',

  // AWS creds (will be encrypted) - read from env vars
  aws_access_key_id: process.env.BP_AWS_ACCESS_KEY_ID || '',
  aws_secret_key: process.env.BP_AWS_SECRET_ACCESS_KEY || '',

  // HubSpot - read from env var
  hubspot_token: process.env.BP_HUBSPOT_TOKEN || '',
  hubspot_owner_id: '70619571',

  // Sending controls
  daily_send_limit: 50,
  delay_between_sends_ms: 1500,

  // CAN-SPAM
  sender_address: '69 W. Floyd Ave, Suite 309, Denver, Colorado 80110',

  // Signature
  signature_html: `<br>
<br>
<div style="border-top:1px solid #cccccc;padding-top:12px;margin-top:8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#555555;">
  <table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#555555;">
    <tr>
      <td style="padding-right:15px;vertical-align:top;">
        <img src="https://bluepointatm.com/wp-content/uploads/2025/09/bp-footer-logo-1.png" alt="BluePoint Cashless" width="120" style="display:block;" />
      </td>
      <td style="vertical-align:top;">
        <strong style="font-size:14px;color:#333333;">Mike Stebbins</strong> | Executive Vice President<br>
        BluePoint Cashless | 69 W. Floyd Ave | Suite 309<br>
        Denver, Colorado 80110<br>
        <span style="color:#888888;">e:</span> <a href="mailto:mike@bluepointatm.com" style="color:#1a73e8;text-decoration:none;">mike@bluepointatm.com</a><br>
        <span style="color:#888888;">w:</span> <a href="https://bluepointatm.com/go-cashless/" style="color:#1a73e8;text-decoration:none;">bluepointatm.com/go-cashless</a><br>
        <span style="color:#888888;">m:</span> 720-987-5711<br>
        <br>
        <a href="https://bluepointatm.com/go-cashless/" style="color:#1a73e8;text-decoration:none;font-size:12px;">Want to learn more about Going Cashless? Watch our 60-second video</a>
        &nbsp;
        <a href="https://www.linkedin.com/in/mikestebbins/" style="text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" width="16" height="16" style="vertical-align:middle;" />
        </a>
      </td>
    </tr>
  </table>
</div>`,

  signature_plain: `--
Mike Stebbins | Executive Vice President
BluePoint Cashless | 69 W. Floyd Ave | Suite 309
Denver, Colorado 80110
e: mike@bluepointatm.com
w: https://bluepointatm.com/go-cashless/
m: 720-987-5711

Want to learn more about Going Cashless?
Watch our 60-second video: https://bluepointatm.com/go-cashless/`,

  // Google Sheet
  sheet_id: '1o9s_RHaA9932h9fEDxADlkhmn7OypBpa8K6cc9Px7Q4',
  sheet_range: 'Sheet1',
  key_file: 'D:/projects/workspace/local/google-service-account.json',
  impersonate: 'mark.hope@asymmetric.pro',
}

// ============================================================
// SUPABASE
// ============================================================

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!process.env.EMAIL_ENCRYPTION_KEY) {
  console.error('Missing EMAIL_ENCRYPTION_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ============================================================
// GOOGLE SHEETS
// ============================================================

async function readSheet(): Promise<Record<string, string>[]> {
  const auth = new google.auth.GoogleAuth({
    keyFile: BLUEPOINT_CONFIG.key_file,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    clientOptions: { subject: BLUEPOINT_CONFIG.impersonate },
  })
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: BLUEPOINT_CONFIG.sheet_id,
    range: BLUEPOINT_CONFIG.sheet_range,
  })

  const rows = res.data.values
  if (!rows || rows.length < 2) {
    console.log('No data found in sheet')
    return []
  }

  const headers = rows[0].map((h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return rows.slice(1).map((row: string[]) => {
    const obj: Record<string, string> = {}
    headers.forEach((h: string, i: number) => {
      obj[h] = row[i] || ''
    })
    return obj
  })
}

// ============================================================
// MIGRATION
// ============================================================

async function findBluepointOrg(): Promise<string | null> {
  // Look for BluePoint organization by name
  const { data } = await supabase
    .from('organizations')
    .select('id, name')
    .ilike('name', '%bluepoint%')
    .limit(1)
    .single()

  return data?.id || null
}

async function findOrCreateCampaign(orgId: string): Promise<string> {
  // Look for existing ABM campaign
  const { data: existing } = await supabase
    .from('campaigns')
    .select('id')
    .eq('organization_id', orgId)
    .ilike('name', '%ABM%')
    .limit(1)
    .single()

  if (existing) return existing.id

  // Create one
  const { data: created, error } = await supabase
    .from('campaigns')
    .insert({
      organization_id: orgId,
      name: 'BluePoint ABM Campaign',
      status: 'active',
      start_date: new Date().toISOString().split('T')[0],
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create campaign: ${error.message}`)
  return created!.id
}

async function matchContact(
  orgId: string,
  email: string,
  firstName: string,
  lastName: string,
  companyName: string,
): Promise<{ contactId: string | null; companyId: string | null }> {
  // Try email match first
  if (email) {
    const { data } = await supabase
      .from('contacts')
      .select('id, company_id')
      .eq('organization_id', orgId)
      .eq('email', email.toLowerCase())
      .limit(1)
      .single()

    if (data) return { contactId: data.id, companyId: data.company_id }
  }

  // Try name match
  if (firstName && lastName) {
    const { data } = await supabase
      .from('contacts')
      .select('id, company_id')
      .eq('organization_id', orgId)
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .limit(1)
      .single()

    if (data) return { contactId: data.id, companyId: data.company_id }
  }

  // Try company match for company_id only
  let companyId: string | null = null
  if (companyName) {
    const { data } = await supabase
      .from('companies')
      .select('id')
      .eq('organization_id', orgId)
      .ilike('name', `%${companyName}%`)
      .limit(1)
      .single()

    if (data) companyId = data.id
  }

  return { contactId: null, companyId }
}

async function createEmailSettings(orgId: string, dryRun: boolean): Promise<void> {
  // Check if settings already exist
  const { data: existing } = await supabase
    .from('email_settings')
    .select('id')
    .eq('organization_id', orgId)
    .single()

  if (existing) {
    console.log('  Email settings already exist, skipping')
    return
  }

  const settings = {
    organization_id: orgId,
    ses_region: BLUEPOINT_CONFIG.ses_region,
    ses_from_name: BLUEPOINT_CONFIG.ses_from_name,
    ses_from_email: BLUEPOINT_CONFIG.ses_from_email,
    ses_reply_to: BLUEPOINT_CONFIG.ses_reply_to,
    ses_config_set: BLUEPOINT_CONFIG.ses_config_set,
    aws_access_key_id_encrypted: encrypt(BLUEPOINT_CONFIG.aws_access_key_id),
    aws_secret_key_encrypted: encrypt(BLUEPOINT_CONFIG.aws_secret_key),
    hubspot_token_encrypted: encrypt(BLUEPOINT_CONFIG.hubspot_token),
    hubspot_owner_id: BLUEPOINT_CONFIG.hubspot_owner_id,
    hubspot_enabled: true,
    daily_send_limit: BLUEPOINT_CONFIG.daily_send_limit,
    delay_between_sends_ms: BLUEPOINT_CONFIG.delay_between_sends_ms,
    sending_enabled: false, // Start disabled, enable after verification
    signature_html: BLUEPOINT_CONFIG.signature_html,
    signature_plain: BLUEPOINT_CONFIG.signature_plain,
    sender_address: BLUEPOINT_CONFIG.sender_address,
  }

  if (dryRun) {
    console.log('  [DRY RUN] Would create email_settings row')
    return
  }

  const { error } = await supabase
    .from('email_settings')
    .insert(settings)

  if (error) throw new Error(`Failed to create email settings: ${error.message}`)
  console.log('  Created email_settings row')
}

interface SheetRow {
  email?: string
  contact_email?: string
  recipient_email?: string
  first_name?: string
  last_name?: string
  company?: string
  company_name?: string
  subject?: string
  subject_line?: string
  body?: string
  body_text?: string
  scheduled_date?: string
  send_date?: string
  status?: string
  sent_date?: string
  sent_at?: string
  [key: string]: string | undefined
}

async function migrateEmails(orgId: string, campaignId: string, dryRun: boolean): Promise<void> {
  const rows = await readSheet() as SheetRow[]
  console.log(`  Found ${rows.length} rows in Google Sheet`)

  let queued = 0
  let delivered = 0
  let skipped = 0
  let unmatched = 0

  for (const row of rows) {
    const email = row.email || row.contact_email || row.recipient_email || ''
    const firstName = row.first_name || ''
    const lastName = row.last_name || ''
    const companyName = row.company || row.company_name || ''
    const subject = row.subject || row.subject_line || ''
    const body = row.body || row.body_text || ''
    const scheduledDate = row.scheduled_date || row.send_date || ''
    const rowStatus = (row.status || '').toLowerCase()
    const sentDate = row.sent_date || row.sent_at || ''

    if (!email) {
      skipped++
      continue
    }

    // Match to existing OrbitABM contact
    const { contactId, companyId } = await matchContact(orgId, email, firstName, lastName, companyName)

    if (!contactId) {
      unmatched++
      if (!dryRun) {
        console.log(`    No match for: ${firstName} ${lastName} <${email}> (${companyName})`)
      }
    }

    // Determine status
    let status: string
    let sentAt: string | null = null
    let scheduledAt: string

    if (rowStatus === 'sent' || rowStatus === 'delivered' || sentDate) {
      status = 'delivered'
      sentAt = sentDate ? new Date(sentDate).toISOString() : new Date().toISOString()
      scheduledAt = sentAt
      delivered++
    } else if (rowStatus === 'failed' || rowStatus === 'error') {
      skipped++
      continue
    } else {
      status = 'queued'
      scheduledAt = scheduledDate
        ? new Date(scheduledDate).toISOString()
        : new Date().toISOString()
      queued++
    }

    if (dryRun) continue

    // Create activity
    let activityId: string | null = null
    if (contactId) {
      const { data: activity } = await supabase
        .from('activities')
        .insert({
          organization_id: orgId,
          campaign_id: campaignId,
          contact_id: contactId,
          company_id: companyId,
          type: 'email_sent',
          status: status === 'delivered' ? 'completed' : 'scheduled',
          subject: subject || `Email to ${firstName || email}`,
          scheduled_date: scheduledAt,
          completed_at: sentAt,
        })
        .select('id')
        .single()

      activityId = activity?.id || null
    }

    // Create email_sends row
    const { error } = await supabase
      .from('email_sends')
      .insert({
        organization_id: orgId,
        campaign_id: campaignId,
        contact_id: contactId,
        activity_id: activityId,
        recipient_email: email.toLowerCase(),
        from_email: BLUEPOINT_CONFIG.ses_from_email,
        subject_line: subject,
        body_plain: body || null,
        body_html: null, // Will be rendered at send time for queued emails
        status,
        scheduled_at: scheduledAt,
        sent_at: sentAt,
      })

    if (error) {
      console.error(`    Failed to insert email_send for ${email}: ${error.message}`)
    }
  }

  console.log(`  Results: ${queued} queued, ${delivered} delivered, ${skipped} skipped, ${unmatched} unmatched contacts`)
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(`\nBluePoint ATM Email Migration ${dryRun ? '(DRY RUN)' : '(LIVE)'}\n`)

  // Step 1: Find BluePoint org
  console.log('1. Finding BluePoint organization...')
  const orgId = await findBluepointOrg()
  if (!orgId) {
    console.error('   Could not find BluePoint organization in OrbitABM')
    console.error('   Make sure the organization exists with "BluePoint" in the name')
    process.exit(1)
  }
  console.log(`   Found org: ${orgId}`)

  // Step 2: Create email settings
  console.log('2. Creating email settings...')
  await createEmailSettings(orgId, dryRun)

  // Step 3: Find or create campaign
  console.log('3. Finding/creating ABM campaign...')
  let campaignId: string
  if (dryRun) {
    campaignId = 'dry-run-campaign-id'
    console.log('   [DRY RUN] Would find or create ABM campaign')
  } else {
    campaignId = await findOrCreateCampaign(orgId)
    console.log(`   Campaign: ${campaignId}`)
  }

  // Step 4: Migrate emails from Google Sheet
  console.log('4. Migrating emails from Google Sheet...')
  await migrateEmails(orgId, campaignId, dryRun)

  // Step 5: Summary
  console.log('\n5. Migration complete!')
  if (!dryRun) {
    console.log('   IMPORTANT: sending_enabled is set to FALSE')
    console.log('   Verify the data in OrbitABM, then enable sending via Settings > Email')
  }
  console.log('')
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
