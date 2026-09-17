import { prisma } from '@/lib/db'
import { Role } from '@/lib/types/database'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: Role
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()

    // If explicitly logged out, enforce logged-out state
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
    // Ignore cookie read error in non-request contexts
  }

  // Fallback: DEV_MODE
  if (process.env.DEV_MODE === 'true') {
    const devUser = await prisma.user.findFirst({
      where: { status: 'ACTIVE', role: 'ADMIN' },
      select: { id: true, name: true, email: true, role: true },
    })
    if (devUser) return { ...devUser, role: devUser.role as Role }
  }

  // Fallback: Supabase auth
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    if (supabase) {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (!error && user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id, status: 'ACTIVE' },
          select: { id: true, name: true, email: true, role: true },
        })
        if (dbUser) return { ...dbUser, role: dbUser.role as Role }
      }
    }
  } catch (err) {}

  return null
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.role !== 'ADMIN') {
    throw new Error('FORBIDDEN')
  }
  return user
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === 'ADMIN'
}
