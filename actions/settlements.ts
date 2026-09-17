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
    })
    if (!settlement) return { success: false, error: 'Settlement not found.' }
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
  userId,
  amount,
  direction = 'MEMBER_TO_ADMIN',
}: {
  userId: string
  amount: number
  direction?: 'MEMBER_TO_ADMIN' | 'ADMIN_TO_MEMBER'
}): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Please enter a valid positive amount.' }
    }

    if (direction === 'MEMBER_TO_ADMIN') {
      // Member pays Admin (clearing pending dues)
      const pendingSettlements = await prisma.settlement.findMany({
        where: {
          userId,
          status: { in: ['PENDING', 'SUBMITTED'] },
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
            // Partial settlement: update current to settled amount and create pending for remaining
            await prisma.settlement.update({
              where: { id: settlement.id },
              data: {
                expectedAmount: settleAmt.toNumber(),
                actualAmount: settleAmt.toNumber(),
                status: 'SETTLED',
                settledAt: new Date(),
                settledBy: admin.id,
                note: 'MEMBER_TO_ADMIN',
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
                note: 'MEMBER_TO_ADMIN',
              },
            })
          }

          remainingToSettle = remainingToSettle.minus(settleAmt)
        }
      } else {
        // Create direct payment received record
        const meeting = await prisma.meeting.create({
          data: {
            title: 'Payment Received',
            date: new Date(),
            status: 'SETTLED',
            createdBy: admin.id,
            notes: 'Payment received directly from member',
          },
        })

        await prisma.meetingAttendee.create({
          data: {
            meetingId: meeting.id,
            userId,
          },
        })

        await prisma.settlement.create({
          data: {
            meetingId: meeting.id,
            userId,
            expectedAmount: amount,
            actualAmount: amount,
            status: 'SETTLED',
            settledAt: new Date(),
            settledBy: admin.id,
            note: 'MEMBER_TO_ADMIN',
          },
        })
      }
    } else {
      // ADMIN_TO_MEMBER (Admin pays refund / returns money to member)
      const meeting = await prisma.meeting.create({
        data: {
          title: 'Refund Paid',
          date: new Date(),
          status: 'SETTLED',
          createdBy: admin.id,
          notes: 'Refund paid by admin to member',
        },
      })

      await prisma.meetingAttendee.create({
        data: {
          meetingId: meeting.id,
          userId,
        },
      })

      await prisma.settlement.create({
        data: {
          meetingId: meeting.id,
          userId,
          expectedAmount: amount,
          actualAmount: amount,
          status: 'SETTLED',
          settledAt: new Date(),
          settledBy: admin.id,
          note: 'ADMIN_TO_MEMBER',
        },
      })
    }

    await createAuditLog({
      userId: admin.id,
      action: 'SETTLE_MEMBER_BALANCE',
      targetUserId: userId,
      newValue: `${direction}: ${amount}`,
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
