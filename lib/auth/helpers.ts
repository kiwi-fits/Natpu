import { cache } from 'react'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { Role } from '@/lib/types/database'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: Role
  groupId: string
  groupName: string
  groupSlug: string
}

export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  try {
    const cookieStore = await cookies()

    const isLoggedOut = cookieStore.get('logged_out')?.value === 'true'
    if (isLoggedOut) {
      return null
    }

    const sessionUserId = cookieStore.get('auth_user_id')?.value
    const sessionGroupId = cookieStore.get('auth_group_id')?.value

    if (sessionUserId && sessionGroupId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: sessionUserId, status: 'ACTIVE', groupId: sessionGroupId },
        select: { id: true, name: true, email: true, role: true, groupId: true, group: { select: { name: true, slug: true } } },
      })
      if (dbUser) return { ...dbUser, role: dbUser.role as Role, groupName: dbUser.group.name, groupSlug: dbUser.group.slug }
    }
  } catch (err) {
    // Non-request context
  }

  return null
})

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  return user
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === 'ADMIN'
}

/**
 * Get the current group ID from the authenticated user.
 * Use this to scope all queries to the current group.
 */
export async function getGroupId(): Promise<string> {
  const user = await requireAuth()
  return user.groupId
}
