import { Badge } from './Badge'

interface StatusBadgeProps {
  status: string
}

function getStatusColor(status: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' {
  const normalizedStatus = status.toLowerCase()

  // Green statuses - positive/active/top-tier states
  if (['active', 'active_campaign', 'client', 'completed', 'won', 'connected', 'approved', 'delivered', 'top'].includes(normalizedStatus)) {
    return 'green'
  }

  // Blue statuses - planned/in-progress/qualified states
  if (['planned', 'scheduled', 'prospect', 'target', 'identified', 'draft', 'qualified'].includes(normalizedStatus)) {
    return 'blue'
  }

  // Yellow statuses - caution/pending states
  if (['paused', 'borderline', 'overdue', 'in_review'].includes(normalizedStatus)) {
    return 'yellow'
  }

  // Red statuses - negative/failed states
  if (['lost', 'churned', 'excluded', 'declined', 'critical'].includes(normalizedStatus)) {
    return 'red'
  }

  // Purple statuses - special/PE states
  if (['pivoted', 'pe_backed'].includes(normalizedStatus)) {
    return 'purple'
  }

  // Ownership types
  if (['corporate'].includes(normalizedStatus)) {
    return 'blue'
  }
  if (['franchise'].includes(normalizedStatus)) {
    return 'yellow'
  }
  if (['independent'].includes(normalizedStatus)) {
    return 'green'
  }

  // Default to gray for unknown statuses
  return 'gray'
}

function formatLabel(status: string): string {
  return status.replace(/_/g, ' ')
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = getStatusColor(status)

  return <Badge label={formatLabel(status)} color={color} />
}