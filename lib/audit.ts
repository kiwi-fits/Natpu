import { prisma } from '@/lib/db'

export async function createAuditLog({
  userId,
  action,
  meetingId,
  targetUserId,
  oldValue,
  newValue,
}: {
  userId: string
  action: string
  meetingId?: string
  targetUserId?: string
  oldValue?: string
  newValue?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        meetingId,
        targetUserId,
        oldValue,
        newValue,
      },
    })
  } catch (err) {
    // Non-critical: log but don't throw
    console.error('Audit log failed:', err)
  }
}

export async function createNotification({
  userId,
  meetingId,
  type,
  title,
  message,
}: {
  userId: string
  meetingId?: string
  type: string
  title: string
  message: string
}) {
  try {
    await prisma.notification.create({
      data: { userId, meetingId, type, title, message },
    })
  } catch (err) {
    console.error('Notification creation failed:', err)
  }
}
