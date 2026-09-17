import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db'
import { formatDate, formatDateTime, formatCurrencyDisplay, getInitials } from '@/lib/utils'
import { calculateMeetingSummary } from '@/lib/calculations/meeting'
import Decimal from 'decimal.js'
import Link from 'next/link'
import {
  ArrowLeft, MapPin, Calendar, Users, ChevronRight,
  TrendingDown, TrendingUp, Minus, Receipt
} from 'lucide-react'
import MeetingStatusBadge from '@/components/meetings/MeetingStatusBadge'
import SpendingModal from '@/components/meetings/SpendingModal'
import AdminMeetingControls from '@/components/meetings/AdminMeetingControls'
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

  if (!meeting) notFound()

  const isAttendee = meeting.attendees.some(a => a.userId === user.id)
  const isAdmin = user.role === 'ADMIN'
  const myExpense = meeting.expenses.find(e => e.userId === user.id)
  const mySettlement = meeting.settlements.find(s => s.userId === user.id)

  // Build expense inputs for calculation
  const expenseInputs = meeting.expenses.map(e => ({
    userId: e.userId,
    amount: e.amount.toString(),
  }))

  const summary = calculateMeetingSummary(expenseInputs)

  const totalExpense = meeting.expenses.reduce(
    (sum, e) => sum + parseFloat(e.amount.toString()),
    0
  )

  const attendeesWithNoExpense = meeting.attendees.filter(
    a => !meeting.expenses.find(e => e.userId === a.userId)
  ).length
  const attendeesEnteredExpense = meeting.attendees.length - attendeesWithNoExpense

  // Bank details for payment info
  const bankDetails = await prisma.bankDetails.findFirst()

  return (
    <div className="page-container pt-4">
      {/* Back + Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/meetings"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-primary leading-tight truncate">{meeting.title}</h1>
        </div>
        <MeetingStatusBadge status={meeting.status} />
      </div>

      {/* Meeting Info Card */}
      <div className="card p-4 mb-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>{formatDate(meeting.date)}</span>
        </div>
        {meeting.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{meeting.location}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4 text-gray-400" />
          <span>{meeting.attendees.length} attendees</span>
        </div>
        {meeting.notes && (
          <p className="text-sm text-gray-500 pt-1 border-t border-border">{meeting.notes}</p>
        )}
      </div>





      {/* Participant Cards */}
      <div className="mb-4">
        <p className="section-header">Participants</p>
        <div className="space-y-2">
          {meeting.attendees.map(attendee => {
            const expense = meeting.expenses.find(e => e.userId === attendee.userId)
            const participantSummary = summary.participants.find(p => p.userId === attendee.userId)
            const settlement = meeting.settlements.find(s => s.userId === attendee.userId)

            return (
              <div key={attendee.userId} className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                    {getInitials(attendee.user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary text-sm">
                      {attendee.user.name}
                      {attendee.userId === user.id && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                    </p>
                  </div>
                  {(isAdmin || attendee.userId === user.id) && meeting.status === 'OPEN' && (
                    <SpendingModal
                      meetingId={meeting.id}
                      currentAmount={expense?.amount?.toString() ?? '0'}
                      meetingTitle={meeting.title}
                      isAdmin={isAdmin}
                      userId={attendee.userId}
                      memberName={attendee.user.name}
                      compact
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className={cn(
                      "font-semibold",
                      expense && parseFloat(expense.amount.toString()) > 0 ? "text-green-600 font-bold" : "text-primary"
                    )}>
                      {formatCurrencyDisplay(expense?.amount?.toString() ?? '0')}
                    </p>
                  </div>
                  {participantSummary && (
                    <div>
                      <p className="text-xs text-gray-500">Share</p>
                      <p className="font-semibold text-primary">
                        {formatCurrencyDisplay(participantSummary.equalShare.toString())}
                      </p>
                    </div>
                  )}
                </div>

                {participantSummary && (meeting.status === 'CALCULATED' || meeting.status === 'SETTLED') && (
                  <div className={cn(
                    'mt-3 pt-3 border-t border-border flex items-center justify-between',
                  )}>
                    {participantSummary.status === 'RECEIVER' && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-success" />
                        <div>
                          <p className="text-xs text-gray-500">Receives</p>
                          <p className="font-bold text-success">
                            {formatCurrencyDisplay(participantSummary.difference.toString())}
                          </p>
                        </div>
                      </div>
                    )}
                    {participantSummary.status === 'PAYER' && (
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-danger" />
                        <div>
                          <p className="text-xs text-gray-500">Pays</p>
                          <p className="font-bold text-danger">
                            {formatCurrencyDisplay(participantSummary.difference.abs().toString())}
                          </p>
                        </div>
                      </div>
                    )}
                    {participantSummary.status === 'SETTLED' && (
                      <div className="flex items-center gap-2">
                        <Minus className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Status</p>
                          <p className="font-bold text-gray-500">Settled</p>
                        </div>
                      </div>
                    )}
                    {settlement && (
                      <span className={cn(
                        'badge',
                        settlement.status === 'SETTLED' ? 'badge-settled' :
                        settlement.status === 'SUBMITTED' ? 'badge-submitted' :
                        'badge-pending'
                      )}>
                        {settlement.status}
                      </span>
                    )}
                  </div>
                )}
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
            status: meeting.status,
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
