export interface ReadinessCriterion {
  id: string
  label: string
  points: number
  category: string
}

export const READINESS_CRITERIA: ReadinessCriterion[] = [
  {
    id: 'company_data_complete',
    label: 'Company profile data is complete (revenue, employees, website)',
    points: 2,
    category: 'Data Quality',
  },
  {
    id: 'digital_snapshot_exists',
    label: 'At least one digital snapshot has been captured',
    points: 2,
    category: 'Data Quality',
  },
  {
    id: 'dmu_identified',
    label: 'Decision-making unit contacts identified (2+ contacts)',
    points: 3,
    category: 'Contacts',
  },
  {
    id: 'primary_contact_verified',
    label: 'Primary contact email is verified',
    points: 2,
    category: 'Contacts',
  },
  {
    id: 'value_prop_defined',
    label: 'Value proposition and engagement strategy are authored',
    points: 1,
    category: 'Strategy',
  },
]

export const MAX_READINESS_SCORE = READINESS_CRITERIA.reduce((sum, c) => sum + c.points, 0)

export function calculateReadinessScore(checks: Record<string, boolean>): number {
  return READINESS_CRITERIA.reduce((score, criterion) => {
    return score + (checks[criterion.id] ? criterion.points : 0)
  }, 0)
}

export function getScoreColor(score: number): string {
  if (score >= 7) return 'text-emerald-600'
  if (score >= 4) return 'text-amber-600'
  return 'text-red-600'
}

export function getScoreBgColor(score: number): string {
  if (score >= 7) return 'bg-emerald-100 text-emerald-800'
  if (score >= 4) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}
