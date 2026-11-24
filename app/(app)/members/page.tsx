import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db'
import MembersClient from '@/components/members/MembersClient'

import { Role, UserStatus } from '@/lib/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Members' }

export default async function MembersPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const [members, calculatedMeetings] = await Promise.all([
    prisma.user.findMany({
      where: { groupId: user.groupId },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { meetingAttendees: true },
        },
      },
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

  const membersWithBalance = members.map(m => {
    let totalSpent = 0
    let totalFairShare = 0
    let settledPaid = 0
    let settledRefunded = 0
    let pendingToPay = 0
    let pendingToReceive = 0

    for (const meeting of calculatedMeetings) {
      const isAttendee = meeting.attendees.some(a => a.userId === m.id)
      if (!isAttendee) continue

      const memberExpense = meeting.expenses.find(e => e.userId === m.id)
      const spent = memberExpense ? parseFloat(memberExpense.amount.toString()) : 0
      const totalMeetingExpense = meeting.expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
      const attendeeCount = meeting.attendees.length
      const fairShare = attendeeCount > 0 ? totalMeetingExpense / attendeeCount : 0

      totalSpent += spent
      totalFairShare += fairShare

      const settlement = meeting.settlements.find(s => s.userId === m.id)
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

    let netBalance = (totalSpent + settledPaid) - (totalFairShare + settledRefunded)



    return {
      ...m,
      role: m.role as Role,
      status: m.status as UserStatus,
      netBalance,
      pendingToPay,
      pendingToReceive,
    }
  })

  return <MembersClient members={membersWithBalance} currentUserId={user.id} />
}
