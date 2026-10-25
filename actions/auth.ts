'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import type { ActionResult } from './meetings'


export async function loginAction(formData: FormData): Promise<ActionResult> {
  try {
    const identifier = (formData.get('username') as string || '').trim().toLowerCase()
    const password = (formData.get('password') as string || '').trim()

    if (!identifier || !password) {
      return { success: false, error: 'Please enter both username and password.' }
    }

    // 1. Find group by slug or group name matching username
    const normalizedHyphen = identifier.replace(/[\s_]+/g, '-')
    const normalizedClean = identifier.replace(/[^a-z0-9]/g, '')
    let group = await prisma.group.findFirst({
      where: {
        OR: [
          { slug: identifier },
          { slug: normalizedHyphen },
          { slug: normalizedClean },
          { name: { equals: identifier } },
        ],
      },
    })

    // 2. If not found by slug, search admin user by email/name
    let adminUser = null
    if (!group) {
      adminUser = await prisma.user.findFirst({
        where: {
          role: 'ADMIN',
          status: 'ACTIVE',
          OR: [
            { email: identifier },
            { email: `${identifier}@splitmeet.local` },
            { name: { equals: identifier } },
          ],
        },
        include: { group: true },
      })
      if (adminUser?.group) {
        group = adminUser.group
      }
    }

    // 3. Fallback for default Natpu group if logging in with 'admin' or 'admin@splitmeet.local'
    if (!group && (identifier === 'admin' || identifier === 'admin@splitmeet.local')) {
      group = await prisma.group.findUnique({
        where: { slug: 'natpu' },
      })
    }

    if (!group) {
      return { success: false, error: 'Invalid username or password.' }
    }

    // Verify password against the matched group's password
    if (group.password !== password) {
      return { success: false, error: 'Invalid username or password.' }
    }

    // Find or create Admin user for this group
    if (!adminUser) {
      adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN', status: 'ACTIVE', groupId: group.id },
      })
    }

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          name: 'Admin',
          email: `${group.slug}@splitmeet.local`,
          role: 'ADMIN',
          status: 'ACTIVE',
          groupId: group.id,
        },
      })
    }

    // Set session cookies for Admin
    const cookieStore = await cookies()
    cookieStore.delete('logged_out')
    cookieStore.set('auth_user_id', adminUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    cookieStore.set('auth_group_id', group.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return { success: true, data: undefined }
  } catch (err: any) {
    console.error('loginAction error:', err?.message || err, err?.stack)
    return { success: false, error: err?.message || 'Login failed. Please try again.' }
  }
}

export async function logoutAction(): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('auth_user_id')
    cookieStore.delete('auth_group_id')
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

/**
 * Create a new group with admin credentials.
 * Enforces a maximum of 10 groups.
 */
export async function createGroupAction(formData: FormData): Promise<ActionResult<{ username: string }>> {
  try {
    const name = (formData.get('name') as string || '').trim()
    const username = (formData.get('username') as string || formData.get('slug') as string || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    const password = (formData.get('password') as string || '').trim()

    if (!name || name.length < 2) {
      return { success: false, error: 'Group name must be at least 2 characters.' }
    }
    if (!username || username.length < 2) {
      return { success: false, error: 'Admin username must be at least 2 characters (letters, numbers, hyphens/underscores only).' }
    }
    if (username === 'admin') {
      return { success: false, error: 'Username "admin" is reserved for the primary group. Please choose another username.' }
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' }
    }

    // Enforce max 10 groups
    const groupCount = await prisma.group.count()
    if (groupCount >= 10) {
      return { success: false, error: 'Maximum of 10 groups reached. Cannot create more groups.' }
    }

    // Check username uniqueness
    const existingGroup = await prisma.group.findUnique({ where: { slug: username } })
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          { email: `${username}@splitmeet.local` },
        ],
      },
    })
    if (existingGroup || existingUser) {
      return { success: false, error: 'This username is already taken. Please choose another username.' }
    }

    const group = await prisma.group.create({
      data: {
        name,
        slug: username,
        password,
      },
    })

    // Create admin user for the new group
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: `${username}@splitmeet.local`,
        role: 'ADMIN',
        status: 'ACTIVE',
        groupId: group.id,
      },
    })

    return { success: true, data: { username } }
  } catch (err: any) {
    console.error('createGroupAction error:', err?.message || err)
    return { success: false, error: err?.message || 'Failed to create group.' }
  }
}
