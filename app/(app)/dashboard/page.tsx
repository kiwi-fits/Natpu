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

  // Fetch data in parallel for maximum speed on Cloudflare D1
  // All queries scoped to user's group
  const [
    allNotifications,
    totalExpenseAgg,
    lastMeetingWithExpenses,
    allMembers,
    calculatedMeetings,
  ] = await Promise.all([
    prisma.notification.findMany({
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
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { meeting: { groupId: user.groupId } },
    }),
    prisma.meeting.findFirst({
      where: { groupId: user.groupId },
      orderBy: { createdAt: 'desc' },
      include: { expenses: true },
    }),
    prisma.user.findMany({
      where: { status: 'ACTIVE', groupId: user.groupId },
      select: { id: true, name: true, role: true, avatarUrl: true },
    }),
    prisma.meeting.findMany({
      where: { status: { in: ['CALCULATED', 'SETTLED'] }, groupId: user.groupId },
      include: {
        attendees: true,
        expenses: true,
        settlements: true,
      },
    }),
  ])

  const unreadCount = allNotifications.filter(n => !n.read).length
  const totalMeetingSpend = totalExpenseAgg._sum.amount ? parseFloat(totalExpenseAgg._sum.amount.toString()) : 0
  const lastMeetingSpend = lastMeetingWithExpenses
    ? lastMeetingWithExpenses.expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
    : 0

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
      {/* ─── Navigation & User Greeting ─── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
            {getGreeting(user.name.split(' ')[0])}
          </h1>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center bg-blue-50 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-blue-100">
              Admin
            </span>
            <span className="inline-flex items-center bg-purple-50 text-purple-700 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-purple-100">
              {user.groupName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <NotificationBell count={unreadCount} notifications={JSON.parse(JSON.stringify(allNotifications))} userId={user.id} />
          <LogoutButton />
        </div>
      </div>

      {/* ─── Group Overview Card ─── */}
      <div className="mb-6 animate-fade-in">
        <div className="gradient-header rounded-3xl p-5 shadow-lg">
          <p className="text-white/60 text-[11px] font-bold uppercase tracking-wider mb-3">Group Spend Overview</p>
          <div className="grid grid-cols-2 gap-4 items-baseline">
            <div className="min-w-0">
              <p className="text-white/60 text-[11px] font-medium uppercase tracking-wide mb-1 truncate">Total Spent</p>
              <p className="text-white font-bold text-lg sm:text-2xl tabular-nums truncate">
                {formatCurrencyDisplay(totalMeetingSpend)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-white/60 text-[11px] font-medium uppercase tracking-wide mb-1 truncate">Latest Meeting</p>
              <p className="text-white font-bold text-lg sm:text-2xl tabular-nums truncate">
                {formatCurrencyDisplay(lastMeetingSpend)}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Link
              href="/meetings/new"
              className="flex-1 h-12 flex items-center justify-center gap-2 bg-white text-gray-900 hover:bg-gray-50 rounded-[14px] font-bold text-sm transition-all active:scale-[0.97] shadow-sm"
              id="new-meeting-btn"
            >
              <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
              New Meeting
            </Link>
            <WhatsAppShareButton
              totalSpend={totalMeetingSpend}
              lastUpdatedDate={lastMeetingWithExpenses ? new Date(lastMeetingWithExpenses.date || lastMeetingWithExpenses.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined}
              memberBalances={memberBalances.map(m => ({ name: m.name, netBalance: m.netBalance, pendingToPay: m.pendingToPay }))}
              groupSlug={user.groupSlug}
            />
          </div>
        </div>
      </div>

      {/* ─── Member Balances — Interactive iOS Grouped List ─── */}
      {memberBalances.length > 0 && (
        <DashboardMemberBalances memberBalances={memberBalances} />
      )}
    </div>
  )
}
