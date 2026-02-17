/**
 * HTML email builder.
 * Converts plain text body + signature into a styled HTML email
 * that looks like a personal message (not a marketing template).
 * Ported from sender.mjs.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function textToHtml(text: string): string {
  let html = escapeHtml(text)
  // Convert URLs to clickable links
  html = html.replace(
    /(https?:\/\/[^\s<>&]+)/g,
    '<a href="$1" style="color:#1a73e8;">$1</a>',
  )
  // Convert newlines to <br>
  html = html.replace(/\n/g, '<br>\n')
  return html
}

/**
 * Clean up markdown artifacts from template body text.
 */
export function formatBodyText(body: string): string {
  let text = body
  // Remove bold markers
  text = text.replace(/\*\*/g, '')
  // Remove italic markers (single asterisks not next to another)
  text = text.replace(/(?<!\*)\*(?!\*)/g, '')
  // Clean up excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

/**
 * Build a full HTML email from body text + optional signature HTML.
 */
export function buildHtmlEmail(bodyText: string, signatureHtml?: string | null): string {
  const bodyHtml = textToHtml(bodyText)
  const sig = signatureHtml ? `\n${signatureHtml}` : ''
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222222;">
${bodyHtml}
${sig}
</body>
</html>`
}

/**
 * Build plain text email from body + optional signature.
 */
export function buildPlainEmail(bodyText: string, signaturePlain?: string | null): string {
  const sig = signaturePlain ? `\n\n${signaturePlain}` : ''
  return `${bodyText}${sig}`
}

/**
 * Build the CAN-SPAM unsubscribe footer HTML.
 */
export function buildUnsubscribeFooter(unsubscribeUrl: string, senderAddress?: string | null): string {
  const address = senderAddress ? `<br>${escapeHtml(senderAddress)}` : ''
  return `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #eee;font-size:11px;color:#999999;font-family:Arial,Helvetica,sans-serif;">
  If you no longer wish to receive these emails,
  <a href="${escapeHtml(unsubscribeUrl)}" style="color:#999999;">click here to unsubscribe</a>.
  ${address}
</div>`
}
