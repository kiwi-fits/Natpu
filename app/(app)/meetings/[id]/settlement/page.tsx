import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db'
import { formatCurrencyDisplay, formatDateTime, getInitials } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Clock, CreditCard, Copy, AlertCircle } from 'lucide-react'
import CopyButton from '@/components/common/CopyButton'
import SettlementCard from '@/components/settlement/SettlementCard'
import { PaymentStatus } from '@/lib/types/database'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function SettlementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      settlements: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      expenses: true,
      attendees: true,
    },
  })

  if (!meeting || meeting.groupId !== user.groupId) notFound()
  if (meeting.status === 'OPEN') redirect(`/meetings/${id}`)

  const bankDetails = await prisma.bankDetails.findFirst({
    where: { groupId: user.groupId },
  })

  const isPayment = meeting.title.startsWith('Payment:') || meeting.expenses.length === 0
  const payeeSettlement = meeting.settlements.find(s => s.note === 'ADMIN_TO_MEMBER')
  const paymentAmount = isPayment
    ? parseFloat((payeeSettlement?.actualAmount ?? payeeSettlement?.expectedAmount ?? meeting.settlements[0]?.actualAmount ?? meeting.settlements[0]?.expectedAmount ?? 0).toString())
    : 0

  const totalExpected = isPayment
    ? paymentAmount
    : meeting.settlements.reduce(
        (sum, s) => sum + parseFloat(s.expectedAmount.toString()), 0
      )
  const totalSettled = isPayment
    ? paymentAmount
    : meeting.settlements
        .filter(s => s.status === 'SETTLED')
        .reduce((sum, s) => sum + parseFloat((s.actualAmount ?? s.expectedAmount ?? 0).toString()), 0)
  const totalPending = isPayment
    ? 0
    : meeting.settlements
        .filter(s => s.status !== 'SETTLED')
        .reduce((sum, s) => sum + parseFloat(s.expectedAmount.toString()), 0)

  const pendingCount = meeting.settlements.filter(s => s.status !== 'SETTLED').length
  const settledCount = meeting.settlements.filter(s => s.status === 'SETTLED').length

  return (
    <div className="page-container pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href={`/meetings/${id}`}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-primary">Settlement</h1>
          <p className="text-sm text-gray-500 truncate max-w-[200px]">{meeting.title}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="card p-5 mb-5 shadow-xs">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Total Due</p>
            <p className="font-extrabold text-gray-900 text-sm sm:text-base">{formatCurrencyDisplay(totalExpected)}</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Collected</p>
            <p className="font-extrabold text-emerald-600 text-sm sm:text-base">{formatCurrencyDisplay(totalSettled)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Still Pending</p>
            <p className={cn('font-extrabold text-sm sm:text-base', totalPending > 0 ? 'text-rose-600' : 'text-emerald-600')}>
              {formatCurrencyDisplay(totalPending)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              settledCount === meeting.settlements.length ? 'bg-emerald-500' : 'bg-blue-600'
            )}
            style={{ width: `${meeting.settlements.length > 0 ? (settledCount / meeting.settlements.length) * 100 : 0}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-2 text-center font-medium">
          {settledCount} of {meeting.settlements.length} payments confirmed
        </p>
      </div>

      {/* Bank Details */}
      {bankDetails && (
        <div className="card p-5 mb-5">
          <p className="section-header">Payment Account</p>
          <div className="space-y-1">
            <p className="font-bold text-primary">{bankDetails.bankName}</p>
            <p className="text-gray-600">{bankDetails.accountName}</p>
            <div className="flex items-center justify-between py-2 border-y border-border my-2">
              <div>
                <p className="text-xs text-gray-500">Account Number</p>
                <p className="font-mono font-semibold text-primary text-lg tracking-wider">
                  {bankDetails.accountNumber}
                </p>
              </div>
              <CopyButton
                text={bankDetails.accountNumber}
                className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
              />
            </div>
            {bankDetails.branch && (
              <p className="text-sm text-gray-500">{bankDetails.branch} Branch</p>
            )}
          </div>
        </div>
      )}

      {/* Settlement Cards */}
      {meeting.settlements.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
          <p className="font-semibold text-gray-700">Everyone is settled!</p>
          <p className="text-sm text-gray-400 mt-1">No outstanding payments for this meeting.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="section-header">Payment Status</p>
          {meeting.settlements.map(settlement => (
            <SettlementCard
              key={settlement.id}
              settlement={{
                id: settlement.id,
                userId: settlement.userId,
                userName: settlement.user.name,
                expectedAmount: settlement.expectedAmount.toString(),
                actualAmount: settlement.actualAmount?.toString() ?? null,
                status: settlement.status as PaymentStatus,
                submittedAt: settlement.submittedAt?.toISOString() ?? null,
                settledAt: settlement.settledAt?.toISOString() ?? null,
                note: settlement.note ?? null,
              }}
              isAdmin={user.role === 'ADMIN'}
              currentUserId={user.id}
              meetingId={id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
