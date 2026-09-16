'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/helpers'
import { createAuditLog } from '@/lib/audit'
import { upsertExpenseSchema } from '@/lib/validation/schemas'
import type { ActionResult } from './meetings'

export async function upsertExpense(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAuth()

    const raw = {
      meetingId: formData.get('meetingId') as string,
      amount: formData.get('amount') as string,
    }

    const parsed = upsertExpenseSchema.safeParse(raw)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const { meetingId, amount } = parsed.data

    // Check meeting exists and is OPEN
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        attendees: { where: { userId: user.id } },
      },
    })

    if (!meeting) return { success: false, error: 'Meeting not found.' }
    if (meeting.status !== 'OPEN') {
      return { success: false, error: 'This meeting has been finalized. Expenses can no longer be changed.' }
    }

    // Security: check user is an attendee
    const isAttendee = meeting.attendees.length > 0
    if (!isAttendee) {
      return { success: false, error: 'You cannot add spending because you did not attend this meeting.' }
    }

    // Get existing expense for audit
    const existingExpense = await prisma.expense.findUnique({
      where: { meetingId_userId: { meetingId, userId: user.id } },
    })

    await prisma.expense.upsert({
      where: { meetingId_userId: { meetingId, userId: user.id } },
      create: { meetingId, userId: user.id, amount },
      update: { amount },
    })

    await createAuditLog({
      userId: user.id,
      action: 'UPSERT_EXPENSE',
      meetingId,
      oldValue: existingExpense?.amount?.toString(),
      newValue: amount,
    })

    revalidatePath(`/meetings/${meetingId}`)
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return { success: false, error: 'You must be logged in.' }
    }
    console.error('upsertExpense error:', err)
    return { success: false, error: 'Failed to save expense.' }
  }
}

export async function adminUpdateExpense(
  meetingId: string,
  userId: string,
  amount: string
): Promise<ActionResult> {
  try {
    const { requireAdmin } = await import('@/lib/auth/helpers')
    const admin = await requireAdmin()

    const parsed = upsertExpenseSchema.safeParse({ meetingId, amount })
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } })
    if (!meeting) return { success: false, error: 'Meeting not found.' }
    if (meeting.status !== 'OPEN') {
      return { success: false, error: 'Meeting is finalized. Reopen it first.' }
    }

    // Verify userId is an attendee
    const attendee = await prisma.meetingAttendee.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
    })
    if (!attendee) return { success: false, error: 'User is not an attendee.' }

    const existing = await prisma.expense.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
    })

    await prisma.expense.upsert({
      where: { meetingId_userId: { meetingId, userId } },
      create: { meetingId, userId, amount: parsed.data.amount },
      update: { amount: parsed.data.amount },
    })

    await createAuditLog({
      userId: admin.id,
      action: 'ADMIN_UPDATE_EXPENSE',
      meetingId,
      targetUserId: userId,
      oldValue: existing?.amount?.toString(),
      newValue: parsed.data.amount,
    })

    revalidatePath(`/meetings/${meetingId}`)
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can edit other members\' expenses.' }
    }
    return { success: false, error: 'Failed to update expense.' }
  }
}
