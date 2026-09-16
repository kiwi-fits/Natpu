'use client'

import { useState, useTransition } from 'react'
import { updateBankDetails } from '@/actions/settings'
import { toast } from 'sonner'
import { Save, Building2 } from 'lucide-react'

type BankDetails = {
  bankName: string
  accountName: string
  accountNumber: string
  branch: string | null
} | null

export default function SettingsClient({
  initialData,
}: {
  initialData: BankDetails
}) {
  const [isPending, startTransition] = useTransition()
  
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

  return (
    <div className="page-container pt-6">
      <div className="mb-6">
        <h1 className="text-ios-title2 text-primary">Settings</h1>
        <p className="text-ios-footnote text-gray-500 mt-0.5">Manage group configurations</p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-primary mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-accent" />
          Admin Bank Details
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          These details will be shown to members when they need to settle their payments. All payments are collected here.
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
              placeholder="e.g. Friend Group" 
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
              placeholder="e.g. Jaffna" 
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
