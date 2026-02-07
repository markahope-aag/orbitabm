import type { CompanyRow, ContactRow, CampaignRow } from '@/lib/types/database'

export interface MergeFieldDef {
  token: string
  label: string
  category: 'Company' | 'Contact' | 'Campaign'
}

export const MERGE_FIELDS: MergeFieldDef[] = [
  // Company
  { token: '{{company.name}}', label: 'Company Name', category: 'Company' },
  { token: '{{company.city}}', label: 'City', category: 'Company' },
  { token: '{{company.state}}', label: 'State', category: 'Company' },
  { token: '{{company.year_founded}}', label: 'Year Founded', category: 'Company' },
  { token: '{{company.estimated_revenue}}', label: 'Revenue', category: 'Company' },
  { token: '{{company.website}}', label: 'Website', category: 'Company' },
  // Contact
  { token: '{{contact.first_name}}', label: 'First Name', category: 'Contact' },
  { token: '{{contact.last_name}}', label: 'Last Name', category: 'Contact' },
  { token: '{{contact.title}}', label: 'Title', category: 'Contact' },
  // Campaign
  { token: '{{campaign.value_proposition}}', label: 'Value Proposition', category: 'Campaign' },
  { token: '{{campaign.primary_wedge}}', label: 'Primary Wedge', category: 'Campaign' },
]

export const MERGE_FIELD_CATEGORIES = ['Company', 'Contact', 'Campaign'] as const

function formatCurrency(value: number | null): string {
  if (!value) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/** Resolve all merge fields in a text string, returning [resolved, unresolvedTokens[]] */
export function resolveMergeFields(
  text: string,
  company: CompanyRow | null,
  contact: ContactRow | null,
  campaign: CampaignRow | null
): { resolved: string; unresolved: string[] } {
  const unresolved: string[] = []
  const valueMap: Record<string, string> = {
    '{{company.name}}': company?.name || '',
    '{{company.city}}': company?.city || '',
    '{{company.state}}': company?.state || '',
    '{{company.year_founded}}': company?.year_founded?.toString() || '',
    '{{company.estimated_revenue}}': formatCurrency(company?.estimated_revenue ?? null),
    '{{company.website}}': company?.website || '',
    '{{contact.first_name}}': contact?.first_name || '',
    '{{contact.last_name}}': contact?.last_name || '',
    '{{contact.title}}': contact?.title || '',
    '{{campaign.value_proposition}}': campaign?.value_proposition || '',
    '{{campaign.primary_wedge}}': campaign?.primary_wedge || '',
  }

  let resolved = text
  // Match all {{...}} tokens
  const tokenRegex = /\{\{[^}]+\}\}/g
  const tokens = text.match(tokenRegex) || []

  for (const token of tokens) {
    const value = valueMap[token]
    if (value !== undefined && value !== '') {
      resolved = resolved.replace(token, value)
    } else {
      if (!unresolved.includes(token)) unresolved.push(token)
    }
  }

  return { resolved, unresolved }
}
