import { prisma } from '@/lib/db'
import ShareBalancesClient, { MemberBalanceData, MemberMeetingBreakdown, BankDetailsData } from '@/components/share/ShareBalancesClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Natpu — Member Balances',
  description: 'See member balances and exact calculation breakdown',
}

export default async function ShareBalancesPage() {
  // Fetch bank details & active members & calculated meetings
  const [dbBankDetails, allMembers, calculatedMeetings] = await Promise.all([
    prisma.bankDetails.findFirst(),
    prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, role: true },
    }),
    prisma.meeting.findMany({
      where: { status: { in: ['CALCULATED', 'SETTLED'] } },
      include: {
        attendees: true,
        expenses: true,
        settlements: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const bankDetails: BankDetailsData = {
    bankName: dbBankDetails?.bankName || 'HDFC Bank',
    accountName: dbBankDetails?.accountName || 'Natpu Admin',
    accountNumber: dbBankDetails?.accountNumber || '9876543210987654',
    branch: dbBankDetails?.branch || 'HDFC0001234',
  }

  // Calculate detailed balances per member
  const memberBalances: MemberBalanceData[] = allMembers.map(member => {
    let totalSpent = 0
    let totalFairShare = 0
    let settledPaid = 0
    let settledRefunded = 0
    let pendingToPay = 0
    const meetings: MemberMeetingBreakdown[] = []

    for (const meeting of calculatedMeetings) {
      const isAttendee = meeting.attendees.some(a => a.userId === member.id)
      if (!isAttendee) continue

      const memberExpense = meeting.expenses.find(e => e.userId === member.id)
      const memberSpent = memberExpense ? parseFloat(memberExpense.amount.toString()) : 0
      const totalExpense = meeting.expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
      const attendeeCount = meeting.attendees.length
      const fairShare = attendeeCount > 0 ? totalExpense / attendeeCount : 0

      const settlement = meeting.settlements.find(s => s.userId === member.id)
      let settledPaidForMeeting = 0
      let settledRefundedForMeeting = 0
      if (settlement) {
        if (settlement.status !== 'SETTLED') {
          pendingToPay += parseFloat(settlement.expectedAmount.toString())
        } else {
          const actual = settlement.actualAmount ? parseFloat(settlement.actualAmount.toString()) : parseFloat(settlement.expectedAmount.toString())
          if (settlement.note === 'ADMIN_TO_MEMBER') {
            settledRefundedForMeeting = actual
          } else {
            settledPaidForMeeting = actual
          }
        }
      }

      totalSpent += memberSpent
      totalFairShare += fairShare
      settledPaid += settledPaidForMeeting
      settledRefunded += settledRefundedForMeeting

      const meetingNetBalance = (memberSpent + settledPaidForMeeting) - (fairShare + settledRefundedForMeeting)

      meetings.push({
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        date: new Date(meeting.createdAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        totalExpense,
        attendeeCount,
        fairShare,
        memberSpent: memberSpent + settledPaidForMeeting,
        settledPaidAmount: settledPaidForMeeting,
        settledRefundedAmount: settledRefundedForMeeting,
        meetingNetBalance,
        settlementStatus: settlement?.status,
        expectedSettlementAmount: settlement ? parseFloat(settlement.expectedAmount.toString()) : 0,
      })
    }

    const netBalance = (totalSpent + settledPaid) - (totalFairShare + settledRefunded)

    return {
      id: member.id,
      name: member.name,
      role: member.role,
      netBalance,
      pendingToPay,
      totalSpent,
      settledPaid,
      settledRefunded,
      totalFairShare,
      meetings,
    }
  }).sort((a, b) => a.netBalance - b.netBalance) // People who owe money first

  const now = new Date()
  const updatedAtFormatted = `${now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} at ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`

  return (
    <ShareBalancesClient
      memberBalances={memberBalances}
      bankDetails={bankDetails}
      updatedAtFormatted={updatedAtFormatted}
    />
  )
}
