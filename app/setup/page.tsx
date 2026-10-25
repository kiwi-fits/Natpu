'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createGroupAction, loginAction } from '@/actions/auth'
import { toast } from 'sonner'
import { Lock, Eye, EyeOff, Sparkles, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function SetupGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [usernameEdited, setUsernameEdited] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleNameChange(val: string) {
    setName(val)
    if (!usernameEdited) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim()
      setUsername(generated)
    }
  }

  function handleUsernameChange(val: string) {
    setUsernameEdited(true)
    setUsername(val.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || name.trim().length < 2) {
      toast.error('Group name must be at least 2 characters.')
      return
    }
    if (!username.trim() || username.trim().length < 2) {
      toast.error('Admin username must be at least 2 characters.')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    const formData = new FormData()
    formData.append('name', name.trim())
    formData.append('username', username.trim().toLowerCase())
    formData.append('password', password)

    startTransition(async () => {
      const result = await createGroupAction(formData)
      if (result.success) {
        toast.success(`Group "${name.trim()}" created successfully! Signing in...`)
        
        // Auto-login to new group with the chosen username & password
        const loginFormData = new FormData()
        loginFormData.append('username', username.trim().toLowerCase())
        loginFormData.append('password', password)

        const loginRes = await loginAction(loginFormData)
        if (loginRes.success) {
          window.location.href = '/dashboard'
        } else {
          router.push('/login')
        }
      } else {
        toast.error(result.error || 'Failed to create group.')
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F7] px-4 py-12 font-outfit selection:bg-ios-blue selection:text-white">
      <div className="w-full max-w-[440px]">
        {/* Navigation back to login */}
        <div className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-ios-footnote font-semibold text-ios-gray hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>

        {/* Brand Header */}
        <div className="mb-6 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-black/[0.08] shadow-xs text-xs font-semibold text-ios-blue mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Independent Group Space</span>
          </div>
          <h1 className="font-extrabold text-[30px] tracking-tight text-black font-outfit">
            Create a New Group
          </h1>
          <p className="text-ios-gray text-ios-footnote font-medium mt-1">
            Setup an isolated group with its own admin credentials
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-[28px] shadow-2xl p-7 border border-black/[0.06] animate-slide-up">
          <form onSubmit={handleCreateGroup} className="space-y-4">
            {/* Group Name */}
            <div>
              <label htmlFor="group-name" className="label">
                Group Name
              </label>
              <input
                id="group-name"
                type="text"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Office Lunch Squad"
                className="input"
                required
                autoFocus
              />
              <p className="text-ios-caption2 text-ios-gray mt-1">
                Display name for your team or friends group
              </p>
            </div>

            {/* Admin Username */}
            <div>
              <label htmlFor="admin-username" className="label">
                Admin Username
              </label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={e => handleUsernameChange(e.target.value)}
                placeholder="officelunch"
                className="input font-mono lowercase"
                required
              />
              <p className="text-ios-caption2 text-ios-gray mt-1">
                Use this username to sign in directly to this group
              </p>
            </div>

            {/* Admin Password */}
            <div>
              <label htmlFor="admin-password" className="label">
                Admin Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="input pr-12 font-mono"
                  required
                  minLength={6}
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="label">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="input font-mono"
                required
                minLength={6}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full py-3.5 rounded-[16px] text-ios-body font-semibold flex items-center justify-center gap-2 mt-5 disabled:opacity-50"
              id="create-group-submit"
            >
              {isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Create Group & Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-ios-gray text-ios-caption2 mt-6">
          Each group is completely isolated. Your credentials connect only to this group.
        </p>
      </div>
    </div>
  )
}
