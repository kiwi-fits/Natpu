'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { createNotification } from '@/lib/audit'
import type { ActionResult } from './meetings'

export async function submitEnquiry({
  meetingId,
  memberId,
  memberName,
  queryText,
}: {
  meetingId: string
  memberId: string
  memberName: string
  queryText: string
}): Promise<ActionResult> {
  try {
    if (!meetingId || !queryText.trim()) {
      return { success: false, error: 'Please enter an enquiry question.' }
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        expenses: true,
        attendees: {
          include: {
            user: { select: { name: true } },
          },
        },
        settlements: true,
      },
    })

    if (!meeting) {
      return { success: false, error: 'Meeting not found.' }
    }

    // Find all active Admin users to send notifications to
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    })

    if (admins.length === 0) {
      return { success: false, error: 'No admin found to receive enquiry.' }
    }

    const trimmedQuery = queryText.trim()
    const meetingDateFormatted = new Date(meeting.date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

    const totalExpense = meeting.expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
    const attendeeCount = meeting.attendees.length
    const attendeeNames = meeting.attendees.map(a => a.user.name).join(', ')
    const fairShare = attendeeCount > 0 ? totalExpense / attendeeCount : 0

    const memberExpense = meeting.expenses.find(e => e.userId === memberId)
    const memberSpent = memberExpense ? parseFloat(memberExpense.amount.toString()) : 0

    const settlement = meeting.settlements.find(s => s.userId === memberId)
    let settledPaid = 0
    let settledRefunded = 0
    if (settlement && settlement.status === 'SETTLED') {
      const actual = settlement.actualAmount ? parseFloat(settlement.actualAmount.toString()) : parseFloat(settlement.expectedAmount.toString())
      if (settlement.note === 'ADMIN_TO_MEMBER') {
        settledRefunded = actual
      } else {
        settledPaid = actual
      }
    }

    const meetingNet = (memberSpent + settledPaid) - (fairShare + settledRefunded)

    const formattedMessage = [
      `Member: ${memberName}`,
      `Meeting: ${meeting.title} (${meetingDateFormatted})`,
      `Total Spend: Rs. ${totalExpense.toFixed(2)}`,
      `Attendees (${attendeeCount}): ${attendeeNames || 'None'}`,
      `Fair Share: Rs. ${fairShare.toFixed(2)}`,
      `Member Paid: Rs. ${(memberSpent + settledPaid).toFixed(2)}`,
      settledRefunded > 0 ? `Admin Refund: −Rs. ${settledRefunded.toFixed(2)}` : null,
      `Meeting Net: ${meetingNet > 0 ? '+' : ''}Rs. ${meetingNet.toFixed(2)}`,
      ``,
      `Question: "${trimmedQuery}"`,
    ].filter(Boolean).join('\n')

    // Send notification to each admin
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        meetingId: meeting.id,
        type: 'ENQUIRY',
        title: `Enquiry: "${meeting.title}"`,
        message: formattedMessage,
      })
    }

    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    console.error('submitEnquiry error:', err)
    return { success: false, error: 'Failed to send enquiry.' }
  }
}
