'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/helpers'
import { createAuditLog } from '@/lib/audit'
import { bankDetailsSchema } from '@/lib/validation/schemas'
import type { ActionResult } from './meetings'

export async function updateBankDetails(formData: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    const raw = {
      bankName: formData.get('bankName') as string,
      accountName: formData.get('accountName') as string,
      accountNumber: formData.get('accountNumber') as string,
      branch: formData.get('branch') as string || undefined,
    }

    const parsed = bankDetailsSchema.safeParse(raw)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const { bankName, accountName, accountNumber, branch } = parsed.data

    // Upsert bank details (only one record)
    const existing = await prisma.bankDetails.findFirst()
    if (existing) {
      await prisma.bankDetails.update({
        where: { id: existing.id },
        data: { bankName, accountName, accountNumber, branch },
      })
    } else {
      await prisma.bankDetails.create({
        data: { bankName, accountName, accountNumber, branch },
      })
    }

    await createAuditLog({
      userId: admin.id,
      action: 'UPDATE_BANK_DETAILS',
    })

    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return { success: false, error: 'You must be logged in.' }
      if (err.message === 'FORBIDDEN') return { success: false, error: 'Only admins can edit bank details.' }
    }
    return { success: false, error: 'Failed to update bank details.' }
  }
}

export async function markNotificationsRead(userId: string): Promise<ActionResult> {
  try {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to mark notifications as read.' }
  }
}
