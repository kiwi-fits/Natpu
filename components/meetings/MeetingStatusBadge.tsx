import { MeetingStatus } from '@/lib/types/database'
import { cn } from '@/lib/utils'

const statusConfig = {
  OPEN: { label: 'Active', className: 'bg-blue-50 text-blue-700 border border-blue-200/60' },
  CALCULATED: { label: 'Ready to Settle', className: 'bg-amber-50 text-amber-700 border border-amber-200/60' },
  SETTLED: { label: 'Settled', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' },
}

export default function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide', config.className)}>
      {config.label}
    </span>
  )
}
