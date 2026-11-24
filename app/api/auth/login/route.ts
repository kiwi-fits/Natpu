import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    let rawIdentifier = ''
    let password = ''

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await request.json()
      rawIdentifier = (body.username as string || '').trim()
      password = (body.password as string || '').trim()
    } else {
      const formData = await request.formData()
      rawIdentifier = (formData.get('username') as string || '').trim()
      password = (formData.get('password') as string || '').trim()
    }

    const identifier = rawIdentifier.toLowerCase()

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Please enter both username and password.' },
        { status: 400 }
      )
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
          { name: { equals: rawIdentifier } },
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
            { email: rawIdentifier },
            { email: `${identifier}@splitmeet.local` },
            { name: { equals: identifier } },
            { name: { equals: rawIdentifier } },
          ],
        },
        include: { group: true },
      })
      if (adminUser?.group) {
        group = adminUser.group
      }
    }

    // 3. Fallback for default Natpu group if logging in with 'admin'
    if (!group && (identifier === 'admin' || identifier === 'admin@splitmeet.local')) {
      group = await prisma.group.findUnique({
        where: { slug: 'natpu' },
      })
    }

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password.' },
        { status: 401 }
      )
    }

    // Verify password against the matched group's password
    if (group.password !== password) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password.' },
        { status: 401 }
      )
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

    // Detect secure protocol (iOS Safari strictly requires 'Secure' flag on HTTPS)
    const forwardedProto = request.headers.get('x-forwarded-proto')
    const host = request.headers.get('host') || ''
    const isLocalhostOrIp =
      host.includes('localhost') ||
      host.includes('127.0.0.1') ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    const isSecure = forwardedProto === 'https' || (!isLocalhostOrIp && forwardedProto !== 'http')

    const cookieOpts = {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    }

    const response = NextResponse.json({ success: true })

    // Explicitly delete any legacy logged_out cookie
    response.cookies.delete('logged_out')

    // Set consolidated auth_session and individual cookies directly in HTTP response
    response.cookies.set('auth_session', `${adminUser.id}:${group.id}`, cookieOpts)
    response.cookies.set('auth_user_id', adminUser.id, cookieOpts)
    response.cookies.set('auth_group_id', group.id, cookieOpts)

    return response
  } catch (err: any) {
    console.error('API login error:', err?.message || err)
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
