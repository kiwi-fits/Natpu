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

    let sessionUserId = cookieStore.get('auth_user_id')?.value
    let sessionGroupId = cookieStore.get('auth_group_id')?.value
    const sessionToken = cookieStore.get('auth_session')?.value

    // If individual cookies are absent or dropped, unpack from combined auth_session
    if ((!sessionUserId || !sessionGroupId) && sessionToken && sessionToken.includes(':')) {
      const parts = sessionToken.split(':')
      sessionUserId = sessionUserId || parts[0]
      sessionGroupId = sessionGroupId || parts[1]
    }

    if (sessionUserId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          groupId: true,
          group: { select: { name: true, slug: true } },
        },
      })

      if (
        dbUser &&
        dbUser.status === 'ACTIVE' &&
        (!sessionGroupId || dbUser.groupId === sessionGroupId)
      ) {
        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role as Role,
          groupId: dbUser.groupId,
          groupName: dbUser.group.name,
          groupSlug: dbUser.group.slug,
        }
      }
    }
  } catch (err) {
    console.error('getAuthUser error:', err)
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
