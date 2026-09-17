import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public share pages — always allow
  if (pathname.startsWith('/share')) {
    return NextResponse.next({ request })
  }

  const isLoggedOutCookie = request.cookies.get('logged_out')?.value === 'true'
  const hasSessionCookie = Boolean(request.cookies.get('auth_user_id')?.value)

  const isAuthenticated = !isLoggedOutCookie && hasSessionCookie

  // Public Login Route
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next({ request })
  }

  // Root Route
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protected routes (/dashboard, /meetings, /members, /settings, etc.)
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
