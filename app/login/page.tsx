'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/actions/auth'
import { toast } from 'sonner'
import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [isPending, startTransition] = useTransition()

  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Sync autofill or external DOM value changes into state
  const syncAutofill = () => {
    if (usernameRef.current && usernameRef.current.value !== username) {
      setUsername(usernameRef.current.value)
    }
    if (passwordRef.current && passwordRef.current.value !== password) {
      setPassword(passwordRef.current.value)
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Read directly from DOM refs / form elements to ensure iOS Safari autofill is captured
    const form = e.currentTarget
    const formElements = form.elements as typeof form.elements & {
      username?: HTMLInputElement
      password?: HTMLInputElement
    }
    const finalUsername = (usernameRef.current?.value || formElements.username?.value || username).trim()
    const finalPassword = passwordRef.current?.value || formElements.password?.value || password

    if (!finalUsername || !finalPassword) {
      toast.error('Please enter your username and password.')
      return
    }

    const formData = new FormData()
    formData.append('username', finalUsername)
    formData.append('password', finalPassword)

    startTransition(async () => {
      try {
        // Direct Route Handler sets standard HTTP Set-Cookie headers directly (crucial for iOS Safari WebKit)
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: finalUsername,
            password: finalPassword,
          }),
          credentials: 'include',
        })

        const data = await res.json().catch(() => null)
        if (res.ok && data?.success) {
          setIsNavigating(true)
          toast.success('Welcome back, Admin!')
          router.refresh()
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 150)
          return
        } else if (data?.error) {
          toast.error(data.error)
          return
        }
      } catch (err) {
        console.warn('API login failed, falling back to Server Action:', err)
      }

      // Fallback to Server Action
      const result = await loginAction(formData)
      if (result.success) {
        setIsNavigating(true)
        toast.success('Welcome back, Admin!')
        // Allow iOS Safari / WebKit time to persist cookies in the jar before navigation
        router.refresh()
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 150)
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
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="label">Username</label>
              <input
                ref={usernameRef}
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onBlur={syncAutofill}
                onAnimationStart={syncAutofill}
                placeholder="Username"
                className="input"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                autoFocus
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={syncAutofill}
                  onAnimationStart={syncAutofill}
                  placeholder="••••••••••••"
                  className="input pr-12 font-mono"
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
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
              disabled={isPending || isNavigating}
              className="btn-primary w-full py-3.5 rounded-[16px] text-ios-body font-semibold flex items-center justify-center gap-2 mt-4"
              id="login-submit"
            >
              {isPending || isNavigating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign in
                </>
              )}
            </button>
          </form>

          {/* Group setup link */}
          <div className="mt-5 pt-4 border-t border-black/[0.06] text-center">
            <p className="text-ios-footnote text-ios-gray">
              Need a separate group?{' '}
              <Link href="/setup" className="font-semibold text-ios-blue hover:underline">
                Create Group
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-6">
          Simple & Private Group Expenses
        </p>
      </div>
    </div>
  )
}
