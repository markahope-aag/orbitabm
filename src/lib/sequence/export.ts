import type { CampaignWithRelations, EmailDraft, SequenceNotes } from './types'
import type { ContactRow } from '@/lib/types/database'

export function exportSequenceMarkdown(
  campaign: CampaignWithRelations,
  drafts: EmailDraft[],
  contacts: ContactRow[],
  notes: SequenceNotes
): string {
  const lines: string[] = []

  // Header
  lines.push(`# Campaign Sequence: ${campaign.name}`)
  lines.push(`**Target:** ${campaign.companies?.name || 'N/A'}`)
  lines.push('')

  // Brief
  lines.push('## Campaign Brief')
  lines.push('')
  lines.push(`| Field | Value |`)
  lines.push(`|-------|-------|`)
  lines.push(`| Value Proposition | ${campaign.value_proposition || 'N/A'} |`)
  lines.push(`| Primary Wedge | ${campaign.primary_wedge || 'N/A'} |`)
  lines.push(`| Backup Trigger | ${campaign.backup_trigger || 'N/A'} |`)
  lines.push(`| Success Criteria | ${campaign.success_criteria || 'N/A'} |`)
  lines.push('')

  // Emails
  lines.push('## Email Sequence')
  lines.push('')
  for (const draft of drafts) {
    const contact = contacts.find((c) => c.id === draft.targetContactId)
    const contactName = contact ? `${contact.first_name} ${contact.last_name}` : 'N/A'

    lines.push(`### Step — ${draft.subjectLine || '(No subject)'}`)
    lines.push(`- **To:** ${contactName}`)
    if (draft.subjectLineAlt) lines.push(`- **A/B Alt:** ${draft.subjectLineAlt}`)
    lines.push('')
    lines.push(draft.body || '_No body content._')
    if (draft.notes) {
      lines.push('')
      lines.push(`> **Notes:** ${draft.notes}`)
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  // Operational notes
  lines.push('## Operational Notes')
  lines.push('')
  lines.push('### If They Respond')
  lines.push(notes.if_respond || '_No notes._')
  lines.push('')
  lines.push('### If No Response')
  lines.push(notes.if_no_response || '_No notes._')
  lines.push('')

  lines.push(`_Exported ${new Date().toLocaleDateString()}_`)

  return lines.join('\n')
}

export function downloadSequenceMarkdown(
  campaign: CampaignWithRelations,
  drafts: EmailDraft[],
  contacts: ContactRow[],
  notes: SequenceNotes
): void {
  const md = exportSequenceMarkdown(campaign, drafts, contacts, notes)
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${campaign.name.replace(/[^a-zA-Z0-9]/g, '_')}_sequence.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
