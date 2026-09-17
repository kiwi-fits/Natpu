import { cache } from 'react'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { Role } from '@/lib/types/database'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: Role
}

export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  try {
    const cookieStore = await cookies()

    const isLoggedOut = cookieStore.get('logged_out')?.value === 'true'
    if (isLoggedOut) {
      return null
    }

    const sessionUserId = cookieStore.get('auth_user_id')?.value

    if (sessionUserId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: sessionUserId, status: 'ACTIVE' },
        select: { id: true, name: true, email: true, role: true },
      })
      if (dbUser) return { ...dbUser, role: dbUser.role as Role }
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
