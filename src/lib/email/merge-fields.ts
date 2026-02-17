/**
 * Template merge field rendering.
 * Replaces {{field_name}} tokens with contact/company data.
 */

interface MergeData {
  first_name?: string | null
  last_name?: string | null
  title?: string | null
  email?: string | null
  company_name?: string | null
  company_website?: string | null
  company_city?: string | null
  company_state?: string | null
}

const FIELD_MAP: Record<string, (d: MergeData) => string> = {
  first_name: (d) => d.first_name || '',
  last_name: (d) => d.last_name || '',
  full_name: (d) => [d.first_name, d.last_name].filter(Boolean).join(' '),
  title: (d) => d.title || '',
  email: (d) => d.email || '',
  company_name: (d) => d.company_name || '',
  company_website: (d) => d.company_website || '',
  company_city: (d) => d.company_city || '',
  company_state: (d) => d.company_state || '',
}

/**
 * Render merge fields in a template string.
 * Replaces `{{field_name}}` with the corresponding value from data.
 * Unknown fields are left as-is.
 */
export function renderMergeFields(template: string, data: MergeData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, field: string) => {
    const resolver = FIELD_MAP[field]
    return resolver ? resolver(data) : match
  })
}

/**
 * Build merge data from contact + company rows.
 */
export function buildMergeData(
  contact: { first_name?: string; last_name?: string; title?: string; email?: string },
  company?: { name?: string; website?: string; city?: string; state?: string } | null,
): MergeData {
  return {
    first_name: contact.first_name,
    last_name: contact.last_name,
    title: contact.title,
    email: contact.email,
    company_name: company?.name,
    company_website: company?.website,
    company_city: company?.city,
    company_state: company?.state,
  }
}
