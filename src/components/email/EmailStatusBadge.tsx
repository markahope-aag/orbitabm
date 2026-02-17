import { Badge } from '@/components/ui/Badge'

interface EmailStatusBadgeProps {
  status: string
}

function getEmailStatusColor(status: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' {
  switch (status) {
    case 'delivered':
    case 'replied':
      return 'green'
    case 'opened':
    case 'clicked':
      return 'blue'
    case 'queued':
    case 'sending':
      return 'gray'
    case 'bounced':
    case 'complained':
    case 'failed':
      return 'red'
    case 'cancelled':
      return 'yellow'
    default:
      return 'gray'
  }
}

export function EmailStatusBadge({ status }: EmailStatusBadgeProps) {
  return <Badge label={status} color={getEmailStatusColor(status)} />
}
