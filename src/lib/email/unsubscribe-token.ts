/**
 * JWT-based unsubscribe tokens for CAN-SPAM compliance.
 * Tokens are signed with EMAIL_ENCRYPTION_KEY and expire in 90 days.
 */

import jwt from 'jsonwebtoken'

export interface UnsubscribePayload {
  org_id: string
  contact_id: string
  email_send_id: string
  email: string
}

function getSecret(): string {
  const key = process.env.EMAIL_ENCRYPTION_KEY
  if (!key) throw new Error('EMAIL_ENCRYPTION_KEY is required for unsubscribe tokens')
  return key
}

/**
 * Generate a signed unsubscribe token.
 */
export function signUnsubscribeToken(payload: UnsubscribePayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '90d' })
}

/**
 * Verify and decode an unsubscribe token.
 * Throws if expired or tampered.
 */
export function verifyUnsubscribeToken(token: string): UnsubscribePayload {
  return jwt.verify(token, getSecret()) as UnsubscribePayload
}
