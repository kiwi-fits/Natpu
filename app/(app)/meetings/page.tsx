import { getAuthUser } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db'
import { formatDate, formatCurrencyDisplay } from '@/lib/utils'
import Link from 'next/link'
import { Plus, ChevronRight, Users } from 'lucide-react'
import MeetingStatusBadge from '@/components/meetings/MeetingStatusBadge'

export const dynamic = 'force-dynamic'

export default async function MeetingsPage() {
  const user = await getAuthUser()
  if (!user) return null

  const meetings = await prisma.meeting.findMany({
    include: {
      attendees: { include: { user: { select: { name: true } } } },
      expenses: true,
      settlements: true,
      _count: { select: { attendees: true } },
    },
    orderBy: { date: 'desc' },
  })

  const grouped = {
    open: meetings.filter(m => m.status === 'OPEN' || m.status === 'CALCULATED'),
    settled: meetings.filter(m => m.status === 'SETTLED'),
  }

  return (
    <div className="page-container pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-ios-title2 text-primary">Meetings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{meetings.length} total meetings</p>
        </div>
        {user.role === 'ADMIN' && (
          <Link href="/meetings/new" id="meetings-new-btn" className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2.5">
            <Plus className="w-4 h-4" /> New
          </Link>
        )}
      </div>

      {meetings.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🍽️</span>
          </div>
          <h3 className="font-semibold text-gray-700 text-lg">No meetings yet</h3>
          <p className="text-gray-400 text-sm mt-1 mb-4">Create your first group expense meeting.</p>
          {user.role === 'ADMIN' && (
            <Link href="/meetings/new" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Meeting
            </Link>
          )}
        </div>
      )}

      {/* Open Meetings */}
      {grouped.open.length > 0 && (
        <section className="mb-6">
          <p className="section-header">Open & Active</p>
          <div className="space-y-3">
            {grouped.open.map(meeting => {
              const totalExpense = meeting.expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
              const settledCount = meeting.settlements.filter(s => s.status === 'SETTLED').length
              const pendingCount = meeting.settlements.filter(s => s.status !== 'SETTLED').length
              const isAttendee = meeting.attendees.some(a => a.userId === user.id)

              return (
                <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="block">
                  <div className="card p-4 transition-all hover:shadow-card-hover hover:-translate-y-0.5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-primary">{meeting.title}</h3>
                          {!isAttendee && user.role === 'MEMBER' && (
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">not attending</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{formatDate(meeting.date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <MeetingStatusBadge status={meeting.status} />
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {meeting._count.attendees} attendees
                      </span>
                      {totalExpense > 0 && (
                        <span className="font-medium text-primary">
                          {formatCurrencyDisplay(totalExpense)} total
                        </span>
                      )}
                      {meeting.status === 'CALCULATED' && (
                        <span className={pendingCount > 0 ? 'text-warning-foreground' : 'text-success'}>
                          {settledCount}/{meeting.settlements.length} settled
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* History */}
      {grouped.settled.length > 0 && (
        <section>
          <p className="section-header">History</p>
          <div className="space-y-2">
            {grouped.settled.map(meeting => (
              <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="block">
                <div className="card p-4 flex items-center justify-between hover:shadow-card-hover transition-all">
                  <div>
                    <h3 className="font-medium text-primary text-sm">{meeting.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(meeting.date)} · {meeting._count.attendees} attendees
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-settled">Settled</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
