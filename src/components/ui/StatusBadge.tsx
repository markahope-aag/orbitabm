import { Badge } from './Badge'

interface StatusBadgeProps {
  status: string
}

function getStatusColor(status: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' {
  const normalizedStatus = status.toLowerCase()

  // Green statuses - positive/active states
  if (['active', 'client', 'completed', 'won', 'connected', 'approved', 'delivered'].includes(normalizedStatus)) {
    return 'green'
  }

  // Blue statuses - planned/in-progress states
  if (['planned', 'scheduled', 'prospect', 'identified', 'draft'].includes(normalizedStatus)) {
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

  // Purple statuses - special states
  if (['pivoted'].includes(normalizedStatus)) {
    return 'purple'
  }

  // Default to gray for unknown statuses
  return 'gray'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = getStatusColor(status)
  
  return <Badge label={status} color={color} />
}