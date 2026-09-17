import { getAuthUser } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db'
import { getGreeting, formatCurrencyDisplay } from '@/lib/utils'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import LogoutButton from '@/components/auth/LogoutButton'
import NotificationBell from '@/components/layout/NotificationBell'
import WhatsAppShareButton from '@/components/share/WhatsAppShareButton'
import DashboardMemberBalances from '@/components/dashboard/DashboardMemberBalances'
import { Role } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getAuthUser()
  if (!user) return null

  // Fetch data
  const allNotifications = await prisma.notification.findMany({
    where: { userId: user.id },
    include: {
      meeting: {
        include: {
          expenses: true,
          attendees: {
            include: { user: { select: { id: true, name: true } } },
          },
          settlements: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const unreadCount = allNotifications.filter(n => !n.read).length

  // Stats for admin
  const totalExpenseAgg = await prisma.expense.aggregate({
    _sum: { amount: true },
  })
  const totalMeetingSpend = totalExpenseAgg._sum.amount ? parseFloat(totalExpenseAgg._sum.amount.toString()) : 0

  const lastMeetingWithExpenses = await prisma.meeting.findFirst({
    where: {
      expenses: {
        some: {
          amount: { gt: 0 },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    include: { expenses: true },
  }) || await prisma.meeting.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { expenses: true },
  })

  const lastMeetingSpend = lastMeetingWithExpenses
    ? lastMeetingWithExpenses.expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
    : 0

  // Member Balances (Includes Admin)
  const allMembers = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, role: true, avatarUrl: true },
  })

  const calculatedMeetings = await prisma.meeting.findMany({
    where: { status: { in: ['CALCULATED', 'SETTLED'] } },
    include: {
      attendees: true,
      expenses: true,
      settlements: true,
    },
  })

  const memberBalances = allMembers.map(member => {
    let totalSpent = 0
    let totalFairShare = 0
    let settledPaid = 0
    let settledRefunded = 0
    let pendingToPay = 0
    let pendingToReceive = 0

    for (const meeting of calculatedMeetings) {
      const isAttendee = meeting.attendees.some(a => a.userId === member.id)
      if (!isAttendee) continue

      const memberExpense = meeting.expenses.find(e => e.userId === member.id)
      const spent = memberExpense ? parseFloat(memberExpense.amount.toString()) : 0
      const totalMeetingExpense = meeting.expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
      const attendeeCount = meeting.attendees.length
      const fairShare = attendeeCount > 0 ? totalMeetingExpense / attendeeCount : 0

      totalSpent += spent
      totalFairShare += fairShare

      const settlement = meeting.settlements.find(s => s.userId === member.id)
      if (settlement) {
        const expected = parseFloat(settlement.expectedAmount.toString())
        if (settlement.status !== 'SETTLED') {
          pendingToPay += expected
        } else {
          const actual = settlement.actualAmount ? parseFloat(settlement.actualAmount.toString()) : expected
          if (settlement.note === 'ADMIN_TO_MEMBER') {
            settledRefunded += actual
          } else {
            settledPaid += actual
          }
        }
      }

      if (spent > fairShare) {
        const unsettledInMeeting = meeting.settlements.filter(s => s.status !== 'SETTLED')
        const unsettledAmount = unsettledInMeeting.reduce((sum, s) => sum + parseFloat(s.expectedAmount.toString()), 0)
        const totalOverpaid = meeting.expenses
          .filter(e => parseFloat(e.amount.toString()) > fairShare)
          .reduce((sum, e) => sum + (parseFloat(e.amount.toString()) - fairShare), 0)
        if (totalOverpaid > 0) {
          pendingToReceive += (spent - fairShare) / totalOverpaid * unsettledAmount
        }
      }
    }

    const netBalance = (totalSpent + settledPaid) - (totalFairShare + settledRefunded)

    return {
      id: member.id,
      name: member.name,
      role: member.role as Role,
      avatarUrl: member.avatarUrl,
      totalSpent,
      totalFairShare,
      netBalance,
      pendingToPay,
      pendingToReceive,
    }
  }).sort((a, b) => b.netBalance - a.netBalance)

  return (
    <div className="page-container pt-6 pb-2">

      {/* ─── iOS Navigation Bar ─── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-ios-title2 text-primary">
            {getGreeting(user.name.split(' ')[0])}
          </h1>
          {user.role === 'ADMIN' && (
            <div className="mt-1">
              <span className="inline-flex items-center bg-ios-blue/10 text-ios-blue text-[11px] font-semibold px-2 py-0.5 rounded-full">
                Admin
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell count={unreadCount} notifications={JSON.parse(JSON.stringify(allNotifications))} userId={user.id} />
          <LogoutButton />
        </div>
      </div>

      {/* ─── Admin Stats — iOS Card Style ─── */}
      {user.role === 'ADMIN' && (
        <div className="mb-6 animate-fade-in">
          <div className="gradient-header rounded-2xl p-5">
            <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wider mb-3">Meeting Overview</p>
            <div className="grid grid-cols-2 gap-4 items-baseline">
              <div className="min-w-0">
                <p className="text-white/50 text-[11px] font-medium uppercase tracking-wide mb-1 truncate">Total Spend</p>
                <p className="text-white font-bold text-base sm:text-xl tabular-nums truncate">
                  {formatCurrencyDisplay(totalMeetingSpend)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-white/50 text-[11px] font-medium uppercase tracking-wide mb-1 truncate">Last Spend</p>
                <p className="text-white font-bold text-base sm:text-xl tabular-nums truncate">
                  {formatCurrencyDisplay(lastMeetingSpend)}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Link
                href="/meetings/new"
                className="flex-1 h-12 flex items-center justify-center gap-2 bg-white text-primary rounded-[14px] font-bold text-sm transition-all active:scale-[0.97]"
                id="new-meeting-btn"
              >
                <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
                New
              </Link>
              <WhatsAppShareButton memberBalances={memberBalances.map(m => ({ name: m.name, netBalance: m.netBalance, pendingToPay: m.pendingToPay }))} />
            </div>
          </div>
        </div>
      )}

      {/* ─── Member Balances — Interactive iOS Grouped List ─── */}
      {memberBalances.length > 0 && (
        <DashboardMemberBalances memberBalances={memberBalances} />
      )}
    </div>
  )
}
