import { MeetingStatus } from '@/lib/types/database'
import { cn } from '@/lib/utils'

const statusConfig = {
  OPEN: { label: 'Open', className: 'badge-open' },
  CALCULATED: { label: 'Calculated', className: 'badge-calculated' },
  SETTLED: { label: 'Settled', className: 'badge-settled' },
}

export default function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const config = statusConfig[status]
  return (
    <span className={cn('badge', config.className)}>
      {config.label}
    </span>
  )
}
