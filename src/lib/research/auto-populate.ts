import type { CompanyWithRelations, CompetitorWithSnapshot, ContactWithCompany } from './types'
import type { DigitalSnapshotRow } from '@/lib/types/database'

function formatCurrency(value: number | null): string {
  if (!value) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number | null): string {
  if (!value) return 'N/A'
  return new Intl.NumberFormat('en-US').format(value)
}

function formatOwnership(type: string): string {
  const map: Record<string, string> = {
    independent: 'Independent',
    pe_backed: 'PE-Backed',
    franchise: 'Franchise',
    corporate: 'Corporate',
  }
  return map[type] || type
}

export function generateCompanyOverview(company: CompanyWithRelations): string {
  const location = [company.city, company.state].filter(Boolean).join(', ') || 'N/A'
  const rows = [
    ['Name', company.name],
    ['Website', company.website || 'N/A'],
    ['HQ', location],
    ['Founded', company.year_founded?.toString() || 'N/A'],
    ['Revenue', formatCurrency(company.estimated_revenue)],
    ['Employees', formatNumber(company.employee_count)],
    ['Vertical', company.verticals?.name || 'N/A'],
    ['Market', company.markets?.name || 'N/A'],
    ['Status', company.status || 'N/A'],
    ['Ownership', formatOwnership(company.ownership_type)],
  ]

  const lines = [
    '| Field | Value |',
    '|-------|-------|',
    ...rows.map(([field, value]) => `| ${field} | ${value} |`),
  ]
  return lines.join('\n')
}

export function generateCompetitiveLandscape(
  competitors: CompetitorWithSnapshot[],
  snapshots: Map<string, DigitalSnapshotRow>
): string {
  if (competitors.length === 0) {
    return '_No competitors found in the same market and vertical._'
  }

  const header = '| Company | Revenue | Employees | Ownership | Google Rating | Reviews |'
  const separator = '|---------|---------|-----------|-----------|--------------|---------|'
  const rows = competitors.map((c) => {
    const snap = snapshots.get(c.id)
    return `| ${c.name} | ${formatCurrency(c.estimated_revenue)} | ${formatNumber(c.employee_count)} | ${formatOwnership(c.ownership_type)} | ${snap?.google_rating ?? 'N/A'} | ${formatNumber(snap?.google_review_count ?? null)} |`
  })

  return [header, separator, ...rows].join('\n')
}

export function generateDMUContacts(contacts: ContactWithCompany[]): string {
  if (contacts.length === 0) {
    return '_No contacts on file. Add contacts to populate this section._'
  }

  const header = '| Name | Title | DMU Role | Email | Verified |'
  const separator = '|------|-------|----------|-------|----------|'
  const rows = contacts.map((c) => {
    const name = `${c.first_name} ${c.last_name}`
    const role = c.dmu_role ? c.dmu_role.replace(/_/g, ' ') : 'Unknown'
    const verified = c.email_verified ? 'Yes' : 'No'
    return `| ${name} | ${c.title || 'N/A'} | ${role} | ${c.email || 'N/A'} | ${verified} |`
  })

  return [header, separator, ...rows].join('\n')
}
