'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import type { ActionResult } from './meetings'

export async function loginAction(formData: FormData): Promise<ActionResult> {
  try {
    const identifier = (formData.get('username') as string || '').trim()
    const password = (formData.get('password') as string || '').trim()

    if (!identifier || !password) {
      return { success: false, error: 'Please enter both username and password.' }
    }

    const isTargetAdminUsername = identifier.toLowerCase() === 'admin' || identifier.toLowerCase() === 'admin@splitmeet.local'
    const isTargetAdminPassword = password === '123456789Natpu'

    if (isTargetAdminUsername && isTargetAdminPassword) {
      // Find Admin user in DB
      let adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN', status: 'ACTIVE' },
      })

      if (!adminUser) {
        adminUser = await prisma.user.create({
          data: {
            name: 'Admin',
            email: 'admin@splitmeet.local',
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        })
      }

      // Delete logged_out flag & set session cookie ONLY on valid credentials
      const cookieStore = await cookies()
      cookieStore.delete('logged_out')
      cookieStore.set('auth_user_id', adminUser.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      })

      return { success: true, data: undefined }
    }

    // Check member user in DB
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { equals: identifier, mode: 'insensitive' } },
          { email: { equals: identifier, mode: 'insensitive' } },
        ],
        status: 'ACTIVE',
      },
    })

    if (!user) {
      return { success: false, error: 'Invalid username or password.' }
    }

    // Strict password validation
    if (password === '123456789Natpu') {
      const cookieStore = await cookies()
      cookieStore.delete('logged_out')
      cookieStore.set('auth_user_id', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      })
      return { success: true, data: undefined }
    }

    return { success: false, error: 'Invalid password. Please check your credentials.' }
  } catch (err) {
    console.error('loginAction error:', err)
    return { success: false, error: 'Login failed. Please try again.' }
  }
}

export async function logoutAction(): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('auth_user_id')
    cookieStore.set('logged_out', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to log out.' }
  }
}
