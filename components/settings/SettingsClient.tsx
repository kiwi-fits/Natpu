'use client'

import { useState, useTransition } from 'react'
import { updateBankDetails } from '@/actions/settings'
import { toast } from 'sonner'
import { Save, Building2, Users, ExternalLink, Copy, Check } from 'lucide-react'
import Link from 'next/link'

type BankDetails = {
  bankName: string
  accountName: string
  accountNumber: string
  branch: string | null
} | null

type GroupInfo = {
  id: string
  name: string
  slug: string
  createdAt?: Date
  _count?: {
    users: number
    meetings: number
  }
} | null

export default function SettingsClient({
  initialData,
  currentGroup,
  userRole,
}: {
  initialData: BankDetails
  currentGroup: GroupInfo
  userRole?: string
}) {
  const [isPending, startTransition] = useTransition()
  const [copiedLink, setCopiedLink] = useState(false)

  const [bankName, setBankName] = useState(initialData?.bankName ?? '')
  const [accountName, setAccountName] = useState(initialData?.accountName ?? '')
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber ?? '')
  const [branch, setBranch] = useState(initialData?.branch ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const formData = new FormData()
    formData.append('bankName', bankName)
    formData.append('accountName', accountName)
    formData.append('accountNumber', accountNumber)
    if (branch) formData.append('branch', branch)

    startTransition(async () => {
      const result = await updateBankDetails(formData)
      if (result.success) {
        toast.success('Bank details updated successfully!')
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleCopyShareLink() {
    if (!currentGroup) return
    const shareUrl = `${window.location.origin}/share/balances?group=${encodeURIComponent(currentGroup.slug)}`
    navigator.clipboard.writeText(shareUrl)
    setCopiedLink(true)
    toast.success('Share link copied to clipboard!')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="page-container pt-6 pb-20 space-y-6">
      <div>
        <h1 className="text-ios-title2 text-primary font-bold">Settings</h1>
        <p className="text-ios-footnote text-gray-500 mt-0.5">Manage group profile and configurations</p>
      </div>

      {/* ─── Current Group Profile Card ─── */}
      {currentGroup && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-ios-blue/10 flex items-center justify-center text-ios-blue">
                <Users className="w-4 h-4" />
              </span>
              <div>
                <h2 className="font-bold text-primary text-base">{currentGroup.name}</h2>
                <p className="text-xs text-ios-gray">Group Workspace</p>
              </div>
            </div>
            <span className="badge badge-settled font-semibold">Active Group</span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-3 p-3 bg-gray-50 rounded-xl text-center">
            <div>
              <p className="text-xs text-ios-gray">Members</p>
              <p className="text-base font-bold text-primary">{currentGroup._count?.users ?? 0}</p>
            </div>
            <div className="border-l border-gray-200">
              <p className="text-xs text-ios-gray">Meetings</p>
              <p className="text-base font-bold text-primary">{currentGroup._count?.meetings ?? 0}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCopyShareLink}
              className="flex-1 btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copied Link' : 'Copy Public Share Link'}
            </button>
            <Link
              href={`/share/balances?group=${encodeURIComponent(currentGroup.slug)}`}
              target="_blank"
              className="btn-secondary text-xs p-2.5 flex items-center justify-center text-ios-blue"
              title="Open Public Share Statement"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ─── Group Bank Details ─── */}
      <div className="card p-5">
        <h2 className="font-semibold text-primary mb-2 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-accent" />
          Group Bank Account
        </h2>
        <p className="text-xs text-gray-500 mb-5">
          These bank details belong exclusively to <strong className="text-primary">{currentGroup?.name || 'this group'}</strong>. Members use these details to settle payments.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Bank Name *</label>
            <input
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="e.g. Commercial Bank"
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Account Name *</label>
            <input
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              placeholder="e.g. Natpu Admin"
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Account Number *</label>
            <input
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              placeholder="e.g. 1234567890"
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Branch (Optional)</label>
            <input
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="e.g. Colombo Branch"
              className="input"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
              id="save-bank-settings-btn"
            >
              {isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Bank Details
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
