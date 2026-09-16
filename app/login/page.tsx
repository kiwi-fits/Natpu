'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/actions/auth'
import { toast } from 'sonner'
import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) {
      toast.error('Please enter your username and password.')
      return
    }

    const formData = new FormData()
    formData.append('username', username.trim())
    formData.append('password', password)

    startTransition(async () => {
      const result = await loginAction(formData)
      if (result.success) {
        toast.success('Welcome back, Admin!')
        window.location.href = '/dashboard'
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F7] px-4 py-12 font-outfit selection:bg-ios-blue selection:text-white">
      <div className="w-full max-w-[428px]">
        {/* Brand Header */}
        <div className="mb-8 text-center animate-fade-in">
          <span className="font-extrabold text-[32px] tracking-widest text-black uppercase font-outfit block">
            NATPU
          </span>
          <p className="text-ios-gray text-ios-footnote font-medium mt-1">
            Admin & Group Settlement Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[28px] shadow-2xl p-7 border border-black/[0.06] animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-ios-title2 font-bold text-primary tracking-tight">Admin Sign In</h2>
              <p className="text-ios-footnote text-ios-gray mt-0.5">Enter your credentials to continue</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-ios-blue/10 flex items-center justify-center text-ios-blue shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username / Email Field */}
            <div>
              <label htmlFor="username" className="label">Username or Email</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                className="input"
                required
                autoFocus
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input pr-12 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ios-gray hover:text-primary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full py-3.5 rounded-[16px] text-ios-body font-semibold flex items-center justify-center gap-2 mt-4"
              id="login-submit"
            >
              {isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign in
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-ios-gray text-ios-caption2 mt-6">
          Powered by <strong className="font-semibold text-primary">Natpu</strong> • iOS Settlement Engine
        </p>
      </div>
    </div>
  )
}
