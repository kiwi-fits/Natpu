'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/helpers'
import { createAuditLog } from '@/lib/audit'
import { updateMemberSchema } from '@/lib/validation/schemas'
import { createClient } from '@supabase/supabase-js'
import type { ActionResult } from './meetings'

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function createMember(formData: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    const name = (formData.get('name') as string || '').trim()
    if (!name) {
      return { success: false, error: 'Name is required.' }
    }

    const previousAmountRaw = formData.get('previousAmount') as string
    const previousAmount = previousAmountRaw ? parseFloat(previousAmountRaw) : 0

    if (isNaN(previousAmount) || previousAmount < 0) {
      return { success: false, error: 'Previous amount must be a valid positive number.' }
    }

    // Generate safe email for DB unique constraint
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'member'
    const uniqueSlug = Math.random().toString(36).substring(2, 7)
    const email = `${cleanName}.${uniqueSlug}@splitmeet.local`

    // Create user in DB
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    })

    // If previous amount has to be paid, create an opening balance meeting & settlement
    if (previousAmount > 0) {
      await prisma.$transaction(async (tx) => {
        const meeting = await tx.meeting.create({
          data: {
            title: 'Previous Balance',
            date: new Date(),
            status: 'CALCULATED',
            createdBy: admin.id,
            notes: `Initial pending balance for ${name}`,
          },
        })

        // Add member as attendee
        await tx.meetingAttendee.create({
          data: {
            meetingId: meeting.id,
            userId: newUser.id,
          },
        })

        // Expense paid by admin
        await tx.expense.create({
          data: {
            meetingId: meeting.id,
            userId: admin.id,
            amount: previousAmount,
          },
        })

        // Settlement for member to pay
        await tx.settlement.create({
          data: {
            meetingId: meeting.id,
            userId: newUser.id,
            expectedAmount: previousAmount,
            status: 'PENDING',
            note: 'Previous pending balance',
          },
        })
      })
    }

    await createAuditLog({
      userId: admin.id,
      action: 'CREATE_MEMBER',
      targetUserId: newUser.id,
      newValue: name,
    })

    revalidatePath('/members')
    revalidatePath('/dashboard')
    revalidatePath('/share/balances')
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can add members.' }
    }
    console.error('createMember error:', err)
    return { success: false, error: 'Failed to create member.' }
  }
}

export async function createMembersBulk(
  membersList: Array<{ name: string; previousAmount?: number }>
): Promise<ActionResult<{ count: number }>> {
  try {
    const admin = await requireAdmin()

    if (!Array.isArray(membersList) || membersList.length === 0) {
      return { success: false, error: 'Please provide at least one valid member.' }
    }

    const validMembers = membersList
      .map(m => ({
        name: (m.name || '').trim(),
        previousAmount: typeof m.previousAmount === 'number' && !isNaN(m.previousAmount) && m.previousAmount >= 0 ? m.previousAmount : 0,
      }))
      .filter(m => m.name.length > 0)

    if (validMembers.length === 0) {
      return { success: false, error: 'No valid member names found.' }
    }

    let createdCount = 0

    for (const item of validMembers) {
      const cleanName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'member'
      const uniqueSlug = Math.random().toString(36).substring(2, 7)
      const email = `${cleanName}.${uniqueSlug}@splitmeet.local`

      const newUser = await prisma.user.create({
        data: {
          name: item.name,
          email,
          role: 'MEMBER',
          status: 'ACTIVE',
        },
      })

      if (item.previousAmount > 0) {
        await prisma.$transaction(async (tx) => {
          const meeting = await tx.meeting.create({
            data: {
              title: 'Previous Balance',
              date: new Date(),
              status: 'CALCULATED',
              createdBy: admin.id,
              notes: `Initial pending balance for ${item.name}`,
            },
          })

          await tx.meetingAttendee.create({
            data: {
              meetingId: meeting.id,
              userId: newUser.id,
            },
          })

          await tx.expense.create({
            data: {
              meetingId: meeting.id,
              userId: admin.id,
              amount: item.previousAmount,
            },
          })

          await tx.settlement.create({
            data: {
              meetingId: meeting.id,
              userId: newUser.id,
              expectedAmount: item.previousAmount,
              status: 'PENDING',
              note: 'Previous pending balance',
            },
          })
        })
      }

      await createAuditLog({
        userId: admin.id,
        action: 'CREATE_MEMBER_BULK',
        targetUserId: newUser.id,
        newValue: item.name,
      })

      createdCount++
    }

    revalidatePath('/members')
    revalidatePath('/dashboard')
    revalidatePath('/share/balances')

    return { success: true, data: { count: createdCount } }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can add members.' }
    }
    console.error('createMembersBulk error:', err)
    return { success: false, error: 'Failed to bulk add members.' }
  }
}

export async function updateMember(formData: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    const raw = {
      id: formData.get('id') as string,
      name: (formData.get('name') as string || '').trim(),
      phone: formData.get('phone') as string || undefined,
    }

    const parsed = updateMemberSchema.safeParse(raw)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    await prisma.user.update({
      where: { id: parsed.data.id },
      data: { name: parsed.data.name, phone: parsed.data.phone },
    })

    await createAuditLog({
      userId: admin.id,
      action: 'UPDATE_MEMBER',
      targetUserId: parsed.data.id,
      newValue: parsed.data.name,
    })

    revalidatePath('/members')
    revalidatePath('/dashboard')
    revalidatePath('/share/balances')
    revalidatePath('/meetings')
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can edit members.' }
    }
    return { success: false, error: 'Failed to update member.' }
  }
}

export async function deactivateMember(userId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    if (userId === admin.id) {
      return { success: false, error: 'You cannot deactivate yourself.' }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'INACTIVE' },
    })

    // Also disable in Supabase Auth if user exists in Supabase
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const adminSupabase = getAdminSupabase()
        await adminSupabase.auth.admin.updateUserById(userId, { ban_duration: 'none' })
      }
    } catch {
      // Ignore if user is only in Prisma database
    }

    await createAuditLog({
      userId: admin.id,
      action: 'DEACTIVATE_MEMBER',
      targetUserId: userId,
    })

    revalidatePath('/members')
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can deactivate members.' }
    }
    return { success: false, error: 'Failed to deactivate member.' }
  }
}

export async function reactivateMember(userId: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    })

    revalidatePath('/members')
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can reactivate members.' }
    }
    return { success: false, error: 'Failed to reactivate member.' }
  }
}
