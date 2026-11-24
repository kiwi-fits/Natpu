import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true })
    response.cookies.delete('auth_session')
    response.cookies.delete('auth_user_id')
    response.cookies.delete('auth_group_id')
    response.cookies.delete('logged_out')
    response.cookies.set('auth_session', '', { path: '/', maxAge: 0, expires: new Date(0) })
    response.cookies.set('auth_user_id', '', { path: '/', maxAge: 0, expires: new Date(0) })
    response.cookies.set('auth_group_id', '', { path: '/', maxAge: 0, expires: new Date(0) })
    return response
  } catch (err: any) {
    console.error('API logout error:', err?.message || err)
    return NextResponse.json({ success: false, error: 'Failed to log out.' }, { status: 500 })
  }
}
