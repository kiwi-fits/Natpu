import { getAuthUser } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db'
import { formatDate, formatCurrencyDisplay } from '@/lib/utils'
import Link from 'next/link'
import { Plus, ChevronRight, CalendarCheck, Clock, Receipt, Check, Utensils } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MeetingsPage() {
  const user = await getAuthUser()
  if (!user) return null

  const meetings = await prisma.meeting.findMany({
    where: { groupId: user.groupId },
    include: {
      attendees: { include: { user: { select: { name: true } } } },
      expenses: true,
      settlements: true,
      _count: { select: { attendees: true } },
    },
    orderBy: { date: 'desc' },
  })

  // A meeting is completed if status is SETTLED OR if all its settlements are confirmed SETTLED
  const isMeetingSettled = (m: typeof meetings[0]) => {
    if (m.status === 'SETTLED') return true
    if (m.status === 'CALCULATED' && m.settlements.length > 0) {
      return m.settlements.every(s => s.status === 'SETTLED')
    }
    return false
  }

  const activeMeetings = meetings.filter(m => !isMeetingSettled(m))
  const completedMeetings = meetings.filter(m => isMeetingSettled(m))

  return (
    <div className="page-container pt-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Meetings</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeMeetings.length} active • {completedMeetings.length} settled
          </p>
        </div>
        <Link
          href="/meetings/new"
          id="meetings-new-btn"
          className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2.5 h-10 shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          New Meeting
        </Link>
      </div>

      {/* Empty State */}
      {meetings.length === 0 && (
        <div className="card p-10 text-center border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Utensils className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">No meetings yet</h3>
          <p className="text-gray-500 text-sm mt-1 mb-5 max-w-xs mx-auto">
            Create a meeting to start tracking shared food, trips, or hangout expenses.
          </p>
          <Link href="/meetings/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Create First Meeting
          </Link>
        </div>
      )}

      {/* Active & In Progress Meetings */}
      {activeMeetings.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">
              Active & In Progress
            </p>
            <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {activeMeetings.length} ongoing
            </span>
          </div>

          <div className="space-y-3">
            {activeMeetings.map(meeting => {
              const totalExpense = meeting.expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
              const pendingCount = meeting.settlements.filter(s => s.status !== 'SETTLED').length
              const isCalculated = meeting.status === 'CALCULATED'

              return (
                <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="block group">
                  <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs hover:shadow-md hover:border-gray-300 transition-all duration-150 active:scale-[0.99]">
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Icon + Title + Subtitle */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          isCalculated ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {isCalculated ? (
                            <Clock className="w-5 h-5" />
                          ) : (
                            <Receipt className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 text-[15px] group-hover:text-blue-600 transition-colors truncate">
                            {meeting.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 truncate">
                            <span>{formatDate(meeting.date)}</span>
                            <span>•</span>
                            <span>{meeting._count.attendees} {meeting._count.attendees === 1 ? 'friend' : 'friends'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right: Amount + Status Badge */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-[16px] font-extrabold text-gray-900 tabular-nums">
                          {formatCurrencyDisplay(totalExpense)}
                        </p>
                        <div className="mt-1 flex items-center justify-end gap-1">
                          {isCalculated ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {pendingCount > 0 ? `${pendingCount} pending` : 'Ready to settle'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                              Active
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Completed & Settled Meetings */}
      {completedMeetings.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2.5 px-1">
            <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">
              Completed & Settled
            </p>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              {completedMeetings.length} settled
            </span>
          </div>

          <div className="space-y-2.5">
            {completedMeetings.map(meeting => {
              const isPayment = meeting.title.startsWith('Payment:') || meeting.expenses.length === 0
              let displayAmount = 0

              if (isPayment) {
                const payeeSettlement = meeting.settlements.find(s => s.note === 'ADMIN_TO_MEMBER')
                if (payeeSettlement) {
                  displayAmount = parseFloat((payeeSettlement.actualAmount ?? payeeSettlement.expectedAmount ?? 0).toString())
                } else if (meeting.settlements.length > 0) {
                  displayAmount = parseFloat((meeting.settlements[0].actualAmount ?? meeting.settlements[0].expectedAmount ?? 0).toString())
                }
              } else {
                const totalSettled = meeting.settlements
                  .filter(s => s.status === 'SETTLED')
                  .reduce((sum, s) => sum + parseFloat((s.actualAmount ?? s.expectedAmount ?? 0).toString()), 0)

                displayAmount = totalSettled > 0
                  ? totalSettled
                  : meeting.expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
              }

              return (
                <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="block group">
                  <div className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-xs hover:shadow-md hover:border-gray-300 transition-all duration-150 active:scale-[0.99]">
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Icon + Title + Subtitle */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                          <CalendarCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                            {meeting.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 truncate">
                            <span>{formatDate(meeting.date)}</span>
                            <span>•</span>
                            <span>{meeting._count.attendees} {meeting._count.attendees === 1 ? 'friend' : 'friends'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right: Amount + Settled Badge */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-[15px] font-bold text-gray-800 tabular-nums">
                          {formatCurrencyDisplay(displayAmount)}
                        </p>
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Settled
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
