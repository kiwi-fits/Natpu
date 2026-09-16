'use client'

import { useState, useTransition } from 'react'
import { upsertExpense, adminUpdateExpense } from '@/actions/expenses'
import { toast } from 'sonner'
import { Edit2, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SpendingModal({
  meetingId,
  currentAmount,
  meetingTitle,
  isAdmin,
  userId,
  memberName,
  compact = false,
}: {
  meetingId: string
  currentAmount: string
  meetingTitle: string
  isAdmin: boolean
  userId: string
  memberName?: string
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(currentAmount === '0' ? '' : currentAmount)
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setAmount(currentAmount === '0' ? '' : currentAmount)
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const val = amount === '' ? '0' : amount
    const num = parseFloat(val)

    if (isNaN(num) || !isFinite(num) || num < 0) {
      toast.error('Please enter a valid non-negative amount.')
      return
    }

    startTransition(async () => {
      let result

      if (isAdmin && memberName) {
        // Admin editing another member's expense
        result = await adminUpdateExpense(meetingId, userId, val)
      } else {
        const formData = new FormData()
        formData.append('meetingId', meetingId)
        formData.append('amount', val)
        result = await upsertExpense(formData)
      }

      if (result.success) {
        toast.success(`Spending saved: Rs. ${parseFloat(val).toFixed(2)}`)
        setOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      {compact ? (
        <button
          onClick={handleOpen}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-accent hover:bg-accent-light transition-colors"
          aria-label={`Edit ${memberName}'s spending`}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          onClick={handleOpen}
          className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5"
          id="edit-spending-btn"
        >
          <Edit2 className="w-3.5 h-3.5" />
          {currentAmount === '0' ? 'Add Spending' : 'Edit'}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-4"
          onClick={e => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-md bg-white rounded-t-[28px] sm:rounded-3xl px-6 pt-6 pb-9 sm:pb-6 shadow-2xl animate-slide-up">
            {/* Grab handle for mobile */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-ios-title3 font-bold text-primary tracking-tight">
                  {memberName ? `${memberName}'s Spending` : 'Add Spending'}
                </h3>
                <p className="text-ios-footnote text-ios-gray mt-0.5">{meetingTitle}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-ios-lightGray text-ios-gray flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Amount Input Section */}
              <div>
                <label className="label">
                  HOW MUCH DID {memberName ? memberName.toUpperCase() : 'YOU'} SPEND?
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-ios-gray font-bold text-base">
                    Rs.
                  </div>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="input pl-14 text-2xl font-bold font-mono h-14"
                    autoFocus
                    id="spending-amount-input"
                  />
                </div>
                <p className="text-[12px] text-ios-gray mt-1.5 px-1">
                  Enter 0 if {memberName ?? 'you'} didn't pay anything.
                </p>
              </div>

              {/* Quick Amounts Section */}
              <div>
                <p className="label mb-2">QUICK AMOUNTS</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {['500', '1000', '1500', '2000', '2500', '3000'].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAmount(q)}
                      className={cn(
                        'py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center',
                        amount === q
                          ? 'bg-ios-blue text-white border-ios-blue shadow-sm'
                          : 'bg-ios-lightGray text-primary border-transparent hover:bg-gray-200'
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary flex-1 py-3.5 rounded-[14px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary flex-1 py-3.5 rounded-[14px] flex items-center justify-center gap-2"
                  id="save-spending-btn"
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
