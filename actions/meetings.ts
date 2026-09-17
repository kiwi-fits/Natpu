'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin, requireAuth } from '@/lib/auth/helpers'
import { createAuditLog, createNotification } from '@/lib/audit'
import { createMeetingSchema, updateMeetingSchema, updateAttendanceSchema } from '@/lib/validation/schemas'
import { calculateSettlements } from '@/lib/calculations/meeting'
import Decimal from 'decimal.js'

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function createMeeting(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireAdmin()

    const raw = {
      title: formData.get('title') as string,
      date: formData.get('date') as string,
      location: formData.get('location') as string || undefined,
      notes: formData.get('notes') as string || undefined,
      attendeeIds: formData.getAll('attendeeIds') as string[],
    }

    const parsed = createMeetingSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { title, date, location, notes, attendeeIds } = parsed.data

    // Validate all attendeeIds are active users
    const users = await prisma.user.findMany({
      where: { id: { in: attendeeIds }, status: 'ACTIVE' },
    })
    if (users.length !== attendeeIds.length) {
      return { success: false, error: 'One or more selected attendees are invalid.' }
    }

    const meeting = await prisma.$transaction(async (tx) => {
      const m = await tx.meeting.create({
        data: {
          title,
          date: new Date(date),
          location,
          notes,
          status: 'OPEN',
          createdBy: admin.id,
        },
      })

      // Create attendees
      await tx.meetingAttendee.createMany({
        data: attendeeIds.map(userId => ({ meetingId: m.id, userId })),
      })

      // Create expense records (starting at 0) for all attendees
      await tx.expense.createMany({
        data: attendeeIds.map(userId => ({ meetingId: m.id, userId, amount: 0 })),
      })

      return m
    })

    await createAuditLog({
      userId: admin.id,
      action: 'CREATE_MEETING',
      meetingId: meeting.id,
      newValue: title,
    })

    revalidatePath('/dashboard')
    revalidatePath('/meetings')
    return { success: true, data: { id: meeting.id } }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can create meetings.' }
    }
    console.error('createMeeting error:', err)
    return { success: false, error: 'Failed to create meeting. Please try again.' }
  }
}

export async function updateMeeting(formData: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    const raw = {
      id: formData.get('id') as string,
      title: formData.get('title') as string,
      date: formData.get('date') as string,
      location: formData.get('location') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    }

    const parsed = updateMeetingSchema.safeParse(raw)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const meeting = await prisma.meeting.findUnique({ where: { id: parsed.data.id } })
    if (!meeting) return { success: false, error: 'Meeting not found.' }
    if (meeting.status === 'SETTLED') return { success: false, error: 'Cannot edit a settled meeting.' }

    await prisma.meeting.update({
      where: { id: parsed.data.id },
      data: {
        title: parsed.data.title,
        date: new Date(parsed.data.date),
        location: parsed.data.location,
        notes: parsed.data.notes,
      },
    })

    await createAuditLog({ userId: admin.id, action: 'UPDATE_MEETING', meetingId: parsed.data.id })
    revalidatePath(`/meetings/${parsed.data.id}`)
    revalidatePath('/meetings')
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can edit meetings.' }
    }
    return { success: false, error: 'Failed to update meeting.' }
  }
}

export async function deleteMeeting(meetingId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()
    await prisma.meeting.delete({ where: { id: meetingId } })
    await createAuditLog({ userId: admin.id, action: 'DELETE_MEETING', meetingId })
    revalidatePath('/meetings')
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can delete meetings.' }
    }
    return { success: false, error: 'Failed to delete meeting.' }
  }
}

export async function updateAttendance(formData: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    const raw = {
      meetingId: formData.get('meetingId') as string,
      attendeeIds: formData.getAll('attendeeIds') as string[],
    }

    const parsed = updateAttendanceSchema.safeParse(raw)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const { meetingId, attendeeIds } = parsed.data

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { expenses: true },
    })
    if (!meeting) return { success: false, error: 'Meeting not found.' }
    if (meeting.status === 'SETTLED') return { success: false, error: 'Cannot edit a settled meeting.' }

    // Warn if expenses exist (via client - server just proceeds)
    await prisma.$transaction(async (tx) => {
      // Remove all attendees
      await tx.meetingAttendee.deleteMany({ where: { meetingId } })
      // Remove all expenses
      await tx.expense.deleteMany({ where: { meetingId } })
      // Remove settlements
      await tx.settlement.deleteMany({ where: { meetingId } })
      // Re-add attendees
      await tx.meetingAttendee.createMany({
        data: attendeeIds.map(userId => ({ meetingId, userId })),
      })
      // Re-create expense records at 0
      await tx.expense.createMany({
        data: attendeeIds.map(userId => ({ meetingId, userId, amount: 0 })),
      })
      // Reset meeting to OPEN
      await tx.meeting.update({
        where: { id: meetingId },
        data: { status: 'OPEN' },
      })
    })

    await createAuditLog({ userId: admin.id, action: 'UPDATE_ATTENDANCE', meetingId })
    revalidatePath(`/meetings/${meetingId}`)
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can edit attendance.' }
    }
    return { success: false, error: 'Failed to update attendance.' }
  }
}

export async function finalizeMeeting(meetingId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        attendees: true,
        expenses: true,
      },
    })

    if (!meeting) return { success: false, error: 'Meeting not found.' }
    if (meeting.status !== 'OPEN') return { success: false, error: 'Meeting is not in OPEN status.' }
    if (meeting.attendees.length === 0) return { success: false, error: 'No attendees found.' }

    // Calculate settlements
    const expenseInputs = meeting.expenses.map(e => ({
      userId: e.userId,
      amount: e.amount.toString(),
    }))

    const settlements = calculateSettlements(expenseInputs)

    await prisma.$transaction(async (tx) => {
      // Remove existing settlement records
      await tx.settlement.deleteMany({ where: { meetingId } })

      // Create settlement records for payers only
      for (const s of settlements) {
        await tx.settlement.create({
          data: {
            meetingId,
            userId: s.userId,
            expectedAmount: s.amountOwed.toNumber(),
            status: 'PENDING',
          },
        })
      }

      await tx.meeting.update({
        where: { id: meetingId },
        data: { status: 'CALCULATED' },
      })
    })

    // Send notifications to people who owe money
    const attendeesWhoOwe = await prisma.user.findMany({
      where: { id: { in: settlements.map(s => s.userId) } },
    })

    for (const user of attendeesWhoOwe) {
      const settlement = settlements.find(s => s.userId === user.id)
      if (settlement) {
        await createNotification({
          userId: user.id,
          meetingId,
          type: 'PAYMENT_DUE',
          title: 'Payment Required',
          message: `You need to pay Rs. ${settlement.amountOwed.toFixed(2)} for "${meeting.title}". Please transfer to the admin bank account.`,
        })
      }
    }

    await createAuditLog({ userId: admin.id, action: 'FINALIZE_MEETING', meetingId })
    revalidatePath(`/meetings/${meetingId}`)
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can finalize meetings.' }
    }
    console.error('finalizeMeeting error:', err)
    return { success: false, error: 'Failed to finalize meeting.' }
  }
}

export async function reopenMeeting(meetingId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    await prisma.$transaction(async (tx) => {
      await tx.settlement.deleteMany({ where: { meetingId } })
      await tx.meeting.update({
        where: { id: meetingId },
        data: { status: 'OPEN' },
      })
    })

    await createAuditLog({ userId: admin.id, action: 'REOPEN_MEETING', meetingId })
    revalidatePath(`/meetings/${meetingId}`)
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can reopen meetings.' }
    }
    return { success: false, error: 'Failed to reopen meeting.' }
  }
}

export async function completeMeeting(meetingId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    // Check all settlements are done
    const pendingSettlements = await prisma.settlement.count({
      where: { meetingId, status: { in: ['PENDING', 'SUBMITTED'] } },
    })

    // Allow completing even with pending (admin's choice), but show warning on frontend
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'SETTLED' },
    })

    await createAuditLog({
      userId: admin.id,
      action: 'COMPLETE_MEETING',
      meetingId,
      newValue: pendingSettlements > 0 ? `${pendingSettlements} settlements still pending` : 'all settled',
    })

    revalidatePath(`/meetings/${meetingId}`)
    revalidatePath('/dashboard')
    revalidatePath('/meetings')
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can complete meetings.' }
    }
    return { success: false, error: 'Failed to complete meeting.' }
  }
}
