/**
 * HubSpot API integration for syncing email engagements and timeline notes.
 * All calls are fire-and-forget — failures log but never block sending or event processing.
 */

import { decrypt } from './crypto'

const HUBSPOT_API = 'https://api.hubapi.com'

// Association type IDs
const ASSOC_EMAIL_TO_CONTACT = 198
const ASSOC_EMAIL_TO_COMPANY = 186
const ASSOC_NOTE_TO_CONTACT = 202
const ASSOC_NOTE_TO_COMPANY = 190

interface EngagementOpts {
  subject: string
  bodyPlain: string
  fromEmail: string
  fromName: string
  hubspotOwnerId?: string | null
  contactHsId: string
  companyHsId?: string | null
}

interface TimelineNoteOpts {
  eventType: 'Open' | 'Click' | 'Bounce' | 'Complaint'
  contactHsId: string
  companyHsId?: string | null
  subject: string
  timestamp: string
  link?: string
  bounceType?: string
}

async function hsFetch(token: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${HUBSPOT_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HubSpot API ${res.status}: ${text}`)
  }
  return res.json()
}

async function associateObject(
  token: string,
  fromType: string,
  fromId: string,
  toType: string,
  toId: string,
  associationTypeId: number,
) {
  await hsFetch(
    token,
    `/crm/v3/objects/${fromType}/${fromId}/associations/${toType}/${toId}/${associationTypeId}`,
    { method: 'PUT' },
  )
}

/**
 * Create an email engagement in HubSpot and associate it with a contact (and optionally company).
 * Returns the engagement ID or null on failure.
 */
export async function createEmailEngagement(
  token: string,
  opts: EngagementOpts,
): Promise<string | null> {
  try {
    const properties: Record<string, string> = {
      hs_timestamp: new Date().toISOString(),
      hs_email_direction: 'EMAIL',
      hs_email_status: 'SENT',
      hs_email_subject: opts.subject,
      hs_email_text: opts.bodyPlain.slice(0, 2000),
      hs_email_sender_email: opts.fromEmail,
    }

    // Parse first/last name from fromName
    const nameParts = opts.fromName.trim().split(/\s+/)
    if (nameParts.length > 0) {
      properties.hs_email_sender_firstname = nameParts[0]
      properties.hs_email_sender_lastname = nameParts.slice(1).join(' ')
    }

    if (opts.hubspotOwnerId) {
      properties.hubspot_owner_id = opts.hubspotOwnerId
    }

    const engagement = await hsFetch(token, '/crm/v3/objects/emails', {
      method: 'POST',
      body: JSON.stringify({ properties }),
    })

    const engagementId = engagement.id as string

    // Associate with contact
    await associateObject(token, 'emails', engagementId, 'contacts', opts.contactHsId, ASSOC_EMAIL_TO_CONTACT)

    // Associate with company if available
    if (opts.companyHsId) {
      await associateObject(token, 'emails', engagementId, 'companies', opts.companyHsId, ASSOC_EMAIL_TO_COMPANY)
    }

    return engagementId
  } catch (err) {
    console.error('[hubspot] Failed to create email engagement:', err)
    return null
  }
}

/**
 * Create a timeline note in HubSpot for an email event (open/click/bounce/complaint).
 */
export async function createTimelineNote(
  token: string,
  opts: TimelineNoteOpts,
): Promise<void> {
  try {
    let body: string
    switch (opts.eventType) {
      case 'Open':
        body = `ABM Email Opened\n\nSubject: ${opts.subject}\nOpened: ${opts.timestamp}`
        break
      case 'Click':
        body = `ABM Email Link Clicked\n\nSubject: ${opts.subject}\nLink: ${opts.link || 'unknown'}`
        break
      case 'Bounce':
        body = `ABM Email Bounced\n\nSubject: ${opts.subject}\nBounce Type: ${opts.bounceType || 'Permanent'}`
        break
      case 'Complaint':
        body = `ABM Email Complaint\n\nSubject: ${opts.subject}\nRecipient marked as spam.`
        break
    }

    const note = await hsFetch(token, '/crm/v3/objects/notes', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          hs_timestamp: opts.timestamp || new Date().toISOString(),
          hs_note_body: body,
        },
      }),
    })

    const noteId = note.id as string

    // Associate with contact
    await associateObject(token, 'notes', noteId, 'contacts', opts.contactHsId, ASSOC_NOTE_TO_CONTACT)

    // Associate with company if available
    if (opts.companyHsId) {
      await associateObject(token, 'notes', noteId, 'companies', opts.companyHsId, ASSOC_NOTE_TO_COMPANY)
    }
  } catch (err) {
    console.error('[hubspot] Failed to create timeline note:', err)
  }
}

/**
 * Decrypt a HubSpot token stored in the database.
 */
export function decryptHubSpotToken(encrypted: string): string {
  return decrypt(encrypted)
}
