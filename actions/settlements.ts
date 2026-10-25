'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth/helpers'
import { createAuditLog, createNotification } from '@/lib/audit'
import { markSettledSchema } from '@/lib/validation/schemas'
import Decimal from 'decimal.js'
import type { ActionResult } from './meetings'

export async function submitPayment(settlementId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth()

    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { meeting: true },
    })

    if (!settlement) return { success: false, error: 'Settlement not found.' }
    if (settlement.meeting.groupId !== user.groupId) return { success: false, error: 'Settlement not found.' }
    if (settlement.userId !== user.id) {
      return { success: false, error: 'You can only submit your own payment.' }
    }
    if (settlement.status === 'SETTLED') {
      return { success: false, error: 'This payment has already been settled.' }
    }

    await prisma.settlement.update({
      where: { id: settlementId },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    })

    await createAuditLog({
      userId: user.id,
      action: 'SUBMIT_PAYMENT',
      meetingId: settlement.meetingId,
      groupId: user.groupId,
    })

    revalidatePath(`/meetings/${settlement.meetingId}`)
    revalidatePath(`/meetings/${settlement.meetingId}/settlement`)
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return { success: false, error: 'You must be logged in.' }
    }
    return { success: false, error: 'Failed to submit payment.' }
  }
}

export async function markSettled(formData: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    const raw = {
      settlementId: formData.get('settlementId') as string,
      actualAmount: formData.get('actualAmount') as string,
      note: formData.get('note') as string || undefined,
    }

    const parsed = markSettledSchema.safeParse(raw)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const { settlementId, actualAmount, note } = parsed.data

    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { meeting: true, user: true },
    })

    if (!settlement) return { success: false, error: 'Settlement not found.' }
    if (settlement.meeting.groupId !== admin.groupId) return { success: false, error: 'Settlement not found.' }
    if (settlement.status === 'SETTLED') return { success: false, error: 'Already settled.' }

    await prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: 'SETTLED',
        actualAmount: parseFloat(actualAmount),
        settledAt: new Date(),
        settledBy: admin.id,
        note: note || null,
      },
    })

    // Notify the user
    await createNotification({
      userId: settlement.userId,
      meetingId: settlement.meetingId,
      type: 'PAYMENT_SETTLED',
      title: 'Payment Confirmed',
      message: `Your payment of Rs. ${actualAmount} for "${settlement.meeting.title}" has been confirmed by the admin.`,
    })

    await createAuditLog({
      userId: admin.id,
      action: 'MARK_SETTLED',
      meetingId: settlement.meetingId,
      targetUserId: settlement.userId,
      oldValue: settlement.expectedAmount.toString(),
      newValue: actualAmount,
      groupId: admin.groupId,
    })

    revalidatePath(`/meetings/${settlement.meetingId}`)
    revalidatePath(`/meetings/${settlement.meetingId}/settlement`)
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can mark payments as settled.' }
    }
    return { success: false, error: 'Failed to mark as settled.' }
  }
}

export async function updateSettledAmount(
  settlementId: string,
  actualAmount: string
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    const parsed = markSettledSchema.safeParse({ settlementId, actualAmount })
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { meeting: true },
    })
    if (!settlement) return { success: false, error: 'Settlement not found.' }
    if (settlement.meeting.groupId !== admin.groupId) return { success: false, error: 'Settlement not found.' }
    if (settlement.status !== 'SETTLED') return { success: false, error: 'Settlement is not yet confirmed.' }

    await prisma.settlement.update({
      where: { id: settlementId },
      data: { actualAmount: parseFloat(parsed.data.actualAmount) },
    })

    await createAuditLog({
      userId: admin.id,
      action: 'UPDATE_SETTLED_AMOUNT',
      meetingId: settlement.meetingId,
      oldValue: settlement.actualAmount?.toString(),
      newValue: parsed.data.actualAmount,
      groupId: admin.groupId,
    })

    revalidatePath(`/meetings/${settlement.meetingId}/settlement`)
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can edit settled amounts.' }
    }
    return { success: false, error: 'Failed to update amount.' }
  }
}

export async function settleMemberBalance({
  fromUserId,
  toUserId,
  amount,
  action = 'GIVE',
  userId,
  direction,
}: {
  fromUserId?: string
  toUserId?: string
  amount: number
  action?: 'GIVE' | 'BORROW'
  userId?: string
  direction?: 'MEMBER_TO_ADMIN' | 'ADMIN_TO_MEMBER'
}): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Please enter a valid positive amount.' }
    }

    // Determine payer and payee:
    let payerId: string
    let payeeId: string

    if (fromUserId && toUserId) {
      if (action === 'BORROW') {
        // fromUser borrows from toUser -> toUser gives money to fromUser
        payerId = toUserId
        payeeId = fromUserId
      } else {
        // fromUser gives to toUser -> fromUser gives money to toUser
        payerId = fromUserId
        payeeId = toUserId
      }
    } else if (userId) {
      // Legacy direction format
      if (direction === 'ADMIN_TO_MEMBER') {
        payerId = admin.id
        payeeId = userId
      } else {
        payerId = userId
        payeeId = admin.id
      }
    } else {
      return { success: false, error: 'Please select both members.' }
    }

    if (payerId === payeeId) {
      return { success: false, error: 'Cannot settle payment between the same person.' }
    }

    // Verify both members belong to this group
    const [payer, payee] = await Promise.all([
      prisma.user.findUnique({ where: { id: payerId } }),
      prisma.user.findUnique({ where: { id: payeeId } }),
    ])

    if (!payer || payer.groupId !== admin.groupId) {
      return { success: false, error: 'Payer member not found in this group.' }
    }
    if (!payee || payee.groupId !== admin.groupId) {
      return { success: false, error: 'Payee member not found in this group.' }
    }

    // 1. Check if payer has pending settlements to clear
    const pendingSettlements = await prisma.settlement.findMany({
      where: {
        userId: payerId,
        status: { in: ['PENDING', 'SUBMITTED'] },
        meeting: { groupId: admin.groupId },
      },
      include: { meeting: true },
      orderBy: { createdAt: 'asc' },
    })

    let remainingToSettle = new Decimal(amount)

    if (pendingSettlements.length > 0) {
      for (const settlement of pendingSettlements) {
        if (remainingToSettle.lte(0)) break

        const expected = new Decimal(settlement.expectedAmount)
        const settleAmt = Decimal.min(remainingToSettle, expected)

        if (settleAmt.lt(expected)) {
          // Partial settlement
          await prisma.settlement.update({
            where: { id: settlement.id },
            data: {
              expectedAmount: settleAmt.toNumber(),
              actualAmount: settleAmt.toNumber(),
              status: 'SETTLED',
              settledAt: new Date(),
              settledBy: admin.id,
              note: `Paid to ${payee.name}`,
            },
          })

          const remainingExpected = expected.minus(settleAmt)
          await prisma.settlement.create({
            data: {
              meetingId: settlement.meetingId,
              userId: settlement.userId,
              expectedAmount: remainingExpected.toNumber(),
              status: 'PENDING',
              note: 'Remaining balance after partial settlement',
            },
          })
        } else {
          // Full settlement
          await prisma.settlement.update({
            where: { id: settlement.id },
            data: {
              status: 'SETTLED',
              actualAmount: settleAmt.toNumber(),
              settledAt: new Date(),
              settledBy: admin.id,
              note: `Paid to ${payee.name}`,
            },
          })
        }

        remainingToSettle = remainingToSettle.minus(settleAmt)
      }
    }

    // 2. Create Payment Meeting record
    const meeting = await prisma.meeting.create({
      data: {
        title: `Payment: ${payer.name} → ${payee.name}`,
        date: new Date(),
        status: 'SETTLED',
        createdBy: admin.id,
        groupId: admin.groupId,
        notes: `${payer.name} gave Rs. ${amount.toFixed(2)} to ${payee.name}`,
      },
    })

    await prisma.meetingAttendee.createMany({
      data: [
        { meetingId: meeting.id, userId: payerId },
        { meetingId: meeting.id, userId: payeeId },
      ],
    })

    // Payee settlement (note 'ADMIN_TO_MEMBER' debits payee's balance in netBalance formula)
    await prisma.settlement.create({
      data: {
        meetingId: meeting.id,
        userId: payeeId,
        expectedAmount: amount,
        actualAmount: amount,
        status: 'SETTLED',
        settledAt: new Date(),
        settledBy: admin.id,
        note: 'ADMIN_TO_MEMBER',
      },
    })

    // If payer had remaining amount not absorbed by prior pending settlements, credit payer
    if (remainingToSettle.gt(0)) {
      await prisma.settlement.create({
        data: {
          meetingId: meeting.id,
          userId: payerId,
          expectedAmount: remainingToSettle.toNumber(),
          actualAmount: remainingToSettle.toNumber(),
          status: 'SETTLED',
          settledAt: new Date(),
          settledBy: admin.id,
          note: `GAVE_TO_${payee.id}`,
        },
      })
    }

    // 3. Notifications & Audit
    await createNotification({
      userId: payerId,
      type: 'PAYMENT_SENT',
      title: 'Payment Recorded',
      message: `You gave Rs. ${amount.toFixed(2)} to ${payee.name}.`,
    })

    await createNotification({
      userId: payeeId,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      message: `You received Rs. ${amount.toFixed(2)} from ${payer.name}.`,
    })

    await createAuditLog({
      userId: admin.id,
      action: 'SETTLE_MEMBER_BALANCE',
      targetUserId: payerId,
      newValue: `${payer.name} gave Rs. ${amount.toFixed(2)} to ${payee.name}`,
      groupId: admin.groupId,
    })

    revalidatePath('/dashboard')
    revalidatePath('/share/balances')
    revalidatePath('/meetings')

    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can settle balances.' }
    }
    return { success: false, error: err instanceof Error ? err.message : 'Failed to settle balance.' }
  }
}
