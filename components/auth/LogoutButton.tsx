'use client'

import { logoutAction } from '@/actions/auth'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    if (loading) return
    setLoading(true)
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        if (supabase) {
          await supabase.auth.signOut()
        }
      }
    } catch {}
    await logoutAction()
    toast.success('Signed out successfully')
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleLogout}
      className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-danger hover:bg-danger/10 transition-all"
      aria-label="Sign out"
      id="logout-btn"
    >
      <LogOut className="w-4 h-4" />
    </button>
  )
}

