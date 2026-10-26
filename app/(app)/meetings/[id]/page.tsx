import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db'
import { formatDate, formatCurrencyDisplay, getInitials } from '@/lib/utils'
import { calculateMeetingSummary } from '@/lib/calculations/meeting'
import Link from 'next/link'
import {
  ArrowLeft, MapPin, Calendar, Users, ChevronRight,
  TrendingDown, TrendingUp, Minus, Receipt
} from 'lucide-react'
import MeetingStatusBadge from '@/components/meetings/MeetingStatusBadge'
import SpendingModal from '@/components/meetings/SpendingModal'
import AdminMeetingControls from '@/components/meetings/AdminMeetingControls'
import { MeetingStatus } from '@/lib/types/database'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      attendees: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      expenses: {
        include: { user: { select: { id: true, name: true } } },
      },
      settlements: {
        include: { user: { select: { id: true, name: true } } },
      },
      creator: { select: { name: true } },
    },
  })

  if (!meeting || meeting.groupId !== user.groupId) notFound()

  const isAdmin = user.role === 'ADMIN'

  // Build expense inputs for calculation
  const expenseInputs = meeting.expenses.map(e => ({
    userId: e.userId,
    amount: e.amount.toString(),
  }))

  const summary = calculateMeetingSummary(expenseInputs)

  const isPayment = meeting.title.startsWith('Payment:') || meeting.expenses.length === 0
  const payeeSettlement = meeting.settlements.find(s => s.note === 'ADMIN_TO_MEMBER')
  const payerSettlement = meeting.settlements.find(s => s.note?.startsWith('GAVE_TO_'))
  const paymentAmount = isPayment
    ? parseFloat((payeeSettlement?.actualAmount ?? payeeSettlement?.expectedAmount ?? meeting.settlements[0]?.actualAmount ?? meeting.settlements[0]?.expectedAmount ?? 0).toString())
    : 0

  const totalExpense = isPayment
    ? paymentAmount
    : meeting.expenses.reduce(
        (sum, e) => sum + parseFloat(e.amount.toString()),
        0
      )

  const attendeeCount = meeting.attendees.length
  const fairSharePerPerson = attendeeCount > 0 ? totalExpense / attendeeCount : 0
  const payerId = payerSettlement?.userId || (meeting.attendees[0]?.userId !== payeeSettlement?.userId ? meeting.attendees[0]?.userId : meeting.attendees[1]?.userId)

  return (
    <div className="page-container pt-4 pb-20">
      {/* Back + Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/meetings"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Back to meetings"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold text-gray-900 leading-tight truncate">
            {meeting.title}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{formatDate(meeting.date)}</p>
        </div>
        <MeetingStatusBadge status={meeting.status as MeetingStatus} />
      </div>

      {/* Bill & Fair Share Overview */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card p-4">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            {isPayment ? 'Payment Amount' : 'Total Bill'}
          </p>
          <p className="text-xl font-extrabold text-gray-900 tabular-nums">
            {formatCurrencyDisplay(totalExpense)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {isPayment ? 'direct transfer' : `${attendeeCount} friends`}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            {isPayment ? 'Status' : 'Per Person'}
          </p>
          <p className="text-xl font-extrabold text-blue-600 tabular-nums">
            {isPayment ? 'Settled' : formatCurrencyDisplay(fairSharePerPerson)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {isPayment ? 'confirmed by admin' : 'equal split'}
          </p>
        </div>
      </div>

      {/* Settlement Statement Quick Link (if calculated or settled) */}
      {(meeting.status === 'CALCULATED' || meeting.status === 'SETTLED') && (
        <Link
          href={`/meetings/${meeting.id}/settlement`}
          className="card p-3.5 mb-5 flex items-center justify-between hover:border-blue-300 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                View Settlement Statement
              </p>
              <p className="text-xs text-gray-500">Who owes who in this meeting</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </Link>
      )}

      {/* Attendees & Spending */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">
            {isPayment ? 'Transfer Details' : 'Who Paid What'}
          </p>
          {meeting.status === 'OPEN' && (
            <span className="text-[11px] text-gray-400">Tap pencil to edit</span>
          )}
        </div>

        <div className="ios-list shadow-sm">
          {meeting.attendees.map((attendee, index) => {
            const expense = meeting.expenses.find(e => e.userId === attendee.userId)
            const spent = isPayment
              ? (attendee.userId === payerId ? paymentAmount : 0)
              : (expense ? parseFloat(expense.amount.toString()) : 0)
            const isPayer = isPayment && attendee.userId === payerId
            const isPayee = isPayment && attendee.userId === payeeSettlement?.userId
            const diff = spent - fairSharePerPerson

            return (
              <div
                key={attendee.userId}
                className={`p-4 flex items-center justify-between ${
                  index !== 0 ? 'border-t border-black/[0.05]' : ''
                }`}
              >
                {/* Left: Avatar & Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-700 flex-shrink-0">
                    {getInitials(attendee.user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {attendee.user.name}
                      {attendee.userId === user.id && (
                        <span className="text-[11px] font-normal text-gray-400 ml-1">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isPayment ? (
                        isPayer ? (
                          <span className="font-bold text-gray-900">Paid: {formatCurrencyDisplay(paymentAmount)}</span>
                        ) : isPayee ? (
                          <span className="font-bold text-emerald-600">Received: {formatCurrencyDisplay(paymentAmount)}</span>
                        ) : (
                          <span className="text-gray-400">Participant</span>
                        )
                      ) : (
                        <>Paid: <span className={spent > 0 ? 'font-bold text-gray-900' : 'text-gray-400'}>{formatCurrencyDisplay(spent)}</span></>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: Net Difference or Edit Button */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {isPayment ? (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      Settled ✓
                    </span>
                  ) : meeting.status !== 'OPEN' ? (
                    <div className="text-right">
                      {diff > 0.01 ? (
                        <p className="text-xs font-bold text-emerald-600">
                          + Gets back {formatCurrencyDisplay(diff)}
                        </p>
                      ) : diff < -0.01 ? (
                        <p className="text-xs font-bold text-rose-600">
                          - Owes {formatCurrencyDisplay(Math.abs(diff))}
                        </p>
                      ) : (
                        <p className="text-xs font-medium text-gray-400">Settled</p>
                      )}
                    </div>
                  ) : null}

                  {(isAdmin || attendee.userId === user.id) && meeting.status === 'OPEN' && (
                    <SpendingModal
                      meetingId={meeting.id}
                      currentAmount={spent.toString()}
                      meetingTitle={meeting.title}
                      isAdmin={isAdmin}
                      userId={attendee.userId}
                      memberName={attendee.user.name}
                      compact
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <AdminMeetingControls
          meeting={{
            id: meeting.id,
            status: meeting.status as MeetingStatus,
            title: meeting.title,
            attendeeCount: meeting.attendees.length,
            expenseCount: meeting.expenses.filter(e => parseFloat(e.amount.toString()) >= 0).length,
            pendingSettlements: meeting.settlements.filter(s => s.status !== 'SETTLED').length,
          }}
        />
      )}
    </div>
  )
}
