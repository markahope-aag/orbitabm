/**
 * SES client factory. Creates a configured SESv2Client per org
 * using decrypted credentials from email_settings.
 */

import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { decrypt } from './crypto'

interface EmailSettings {
  ses_region: string
  ses_from_name: string | null
  ses_from_email: string | null
  ses_reply_to: string | null
  ses_config_set: string | null
  aws_access_key_id_encrypted: string | null
  aws_secret_key_encrypted: string | null
  signature_html: string | null
  signature_plain: string | null
}

interface SendParams {
  to: string
  subject: string
  bodyHtml: string
  bodyPlain: string
  tags?: Record<string, string>
}

/**
 * Create an SES client from org email settings.
 */
export function createSesClient(settings: EmailSettings): SESv2Client {
  if (!settings.aws_access_key_id_encrypted || !settings.aws_secret_key_encrypted) {
    throw new Error('AWS credentials not configured for this organization')
  }
  return new SESv2Client({
    region: settings.ses_region,
    credentials: {
      accessKeyId: decrypt(settings.aws_access_key_id_encrypted),
      secretAccessKey: decrypt(settings.aws_secret_key_encrypted),
    },
  })
}

/**
 * Send an email via SES. Returns the SES MessageId.
 */
export async function sendViaSes(
  client: SESv2Client,
  settings: EmailSettings,
  params: SendParams,
): Promise<string> {
  const fromAddr = settings.ses_from_name
    ? `${settings.ses_from_name} <${settings.ses_from_email}>`
    : settings.ses_from_email!

  const sanitizeTag = (v: string) =>
    String(v || 'unknown')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9_\-.@]/g, '')
      .substring(0, 256)

  const command = new SendEmailCommand({
    FromEmailAddress: fromAddr,
    Destination: { ToAddresses: [params.to] },
    ReplyToAddresses: settings.ses_reply_to ? [settings.ses_reply_to] : undefined,
    Content: {
      Simple: {
        Subject: { Data: params.subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: params.bodyPlain, Charset: 'UTF-8' },
          Html: { Data: params.bodyHtml, Charset: 'UTF-8' },
        },
      },
    },
    ConfigurationSetName: settings.ses_config_set || undefined,
    EmailTags: params.tags
      ? Object.entries(params.tags).map(([Name, Value]) => ({
          Name: sanitizeTag(Name),
          Value: sanitizeTag(Value),
        }))
      : undefined,
  })

  const result = await client.send(command)
  return result.MessageId || ''
}
