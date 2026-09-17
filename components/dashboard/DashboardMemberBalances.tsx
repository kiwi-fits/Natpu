'use client'

import { useState, useTransition } from 'react'
import { ArrowUpRight, ArrowDownRight, ChevronRight, X, Check } from 'lucide-react'
import { formatCurrencyDisplay } from '@/lib/utils'
import { settleMemberBalance } from '@/actions/settlements'
import { toast } from 'sonner'
import { Role } from '@/lib/types/database'

export type MemberBalance = {
  id: string
  name: string
  role: Role
  avatarUrl: string | null
  totalSpent: number
  totalFairShare: number
  netBalance: number
  pendingToPay: number
  pendingToReceive: number
}

const avatarColors = [
  'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-violet-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-orange-600', 'bg-indigo-600',
  'bg-teal-600', 'bg-fuchsia-600', 'bg-sky-600',
]

export default function DashboardMemberBalances({
  memberBalances = [],
}: {
  memberBalances?: MemberBalance[]
}) {
  const [selectedMember, setSelectedMember] = useState<MemberBalance | null>(null)
  const [direction, setDirection] = useState<'MEMBER_TO_ADMIN' | 'ADMIN_TO_MEMBER'>('MEMBER_TO_ADMIN')
  const [settleAmount, setSettleAmount] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleOpenModal(member: MemberBalance) {
    setSelectedMember(member)
    // Default direction based on net balance
    setDirection(member.netBalance < 0 ? 'MEMBER_TO_ADMIN' : 'ADMIN_TO_MEMBER')
    setSettleAmount('') // Blank by default
  }

  function handleSettle(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMember) return

    const amount = parseFloat(settleAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    startTransition(async () => {
      const result = await settleMemberBalance({
        userId: selectedMember.id,
        amount,
        direction,
      })

      if (result.success) {
        toast.success(`Settled Rs. ${amount.toFixed(2)} for ${selectedMember.name}!`)
        setSelectedMember(null)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="section-header !mb-0">Member Balances</p>
        <span className="text-ios-caption2 text-ios-gray">Tap to settle</span>
      </div>

      <div className="ios-list">
        {memberBalances.map((member, index) => (
          <button
            key={member.id}
            onClick={() => handleOpenModal(member)}
            className={`w-full text-left px-4 py-3.5 flex items-center justify-between active:bg-black/5 hover:bg-black/[0.02] transition-colors ${
              index !== 0 ? 'border-t border-black/[0.06]' : ''
            }`}
          >
            {/* Left — Avatar + Name */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-semibold text-white flex-shrink-0 ${
                  avatarColors[index % avatarColors.length]
                }`}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-ios-body font-medium text-primary truncate">{member.name}</p>
                  {member.role === 'ADMIN' && (
                    <span className="inline-flex items-center bg-ios-blue/10 text-ios-blue text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                      Admin
                    </span>
                  )}
                </div>
                {member.netBalance > 0 ? (
                  <p className="text-ios-caption1 text-green-500 flex items-center gap-0.5 mt-0.5 font-medium">
                    <ArrowUpRight className="w-3 h-3" />
                    Give
                  </p>
                ) : member.netBalance < 0 ? (
                  <p className="text-ios-caption1 text-red-500 flex items-center gap-0.5 mt-0.5 font-medium">
                    <ArrowDownRight className="w-3 h-3" />
                    Borrow
                  </p>
                ) : (
                  <p className="text-ios-caption1 text-ios-gray mt-0.5">Settled ✓</p>
                )}
              </div>
            </div>

            {/* Right — Amount */}
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
              <div className="text-right">
                <p
                  className={`text-ios-headline tabular-nums ${
                    member.netBalance > 0
                      ? 'text-green-500'
                      : member.netBalance < 0
                      ? 'text-red-500'
                      : 'text-ios-gray'
                  }`}
                >
                  {member.netBalance > 0 ? '+' : member.netBalance < 0 ? '-' : ''}
                  {formatCurrencyDisplay(Math.abs(member.netBalance))}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-ios-gray/50" />
            </div>
          </button>
        ))}
      </div>

      {/* ─── iOS Settle Balance Modal ─── */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-4 font-outfit"
          onClick={e => e.target === e.currentTarget && setSelectedMember(null)}
        >
          <div className="w-full max-w-md bg-white rounded-t-[28px] sm:rounded-3xl px-6 pt-6 pb-9 sm:pb-6 shadow-2xl animate-slide-up">
            {/* Grab Handle */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-base ${
                    avatarColors[memberBalances.findIndex(m => m.id === selectedMember.id) % avatarColors.length]
                  }`}
                >
                  {selectedMember.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-ios-title3 font-bold text-primary">
                      {selectedMember.name}
                    </h3>
                    {selectedMember.role === 'ADMIN' && (
                      <span className="inline-flex items-center bg-ios-blue/10 text-ios-blue text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-ios-caption1 text-ios-gray">Settle Member Balance</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMember(null)}
                className="w-8 h-8 rounded-full bg-ios-lightGray text-ios-gray flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Balance Summary Box */}
            <div className="bg-[#F2F2F7] rounded-2xl p-4 mb-5 border border-black/[0.04]">
              <div className="flex items-center justify-between text-ios-caption1 text-ios-gray mb-1">
                <span>Net Balance</span>
              </div>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  selectedMember.netBalance > 0
                    ? 'text-green-500'
                    : selectedMember.netBalance < 0
                    ? 'text-red-500'
                    : 'text-ios-gray'
                }`}
              >
                {selectedMember.netBalance > 0 ? '+' : selectedMember.netBalance < 0 ? '-' : ''}
                {formatCurrencyDisplay(Math.abs(selectedMember.netBalance))}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSettle} className="space-y-4">
              {/* Payment Direction Toggle */}
              <div>
                <label className="label">Payment Direction</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#F2F2F7] rounded-2xl border border-black/[0.04]">
                  <button
                    type="button"
                    onClick={() => setDirection('MEMBER_TO_ADMIN')}
                    className={`py-2.5 px-3 rounded-[12px] text-ios-caption1 transition-all flex flex-col items-center justify-center text-center gap-0.5 ${
                      direction === 'MEMBER_TO_ADMIN'
                        ? 'bg-white text-red-600 shadow-sm border border-black/[0.06]'
                        : 'text-ios-gray hover:text-primary'
                    }`}
                  >
                    <span className="flex items-center gap-1 font-bold text-xs">
                      <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                      Borrow
                    </span>
                    <span className="text-[10px] text-ios-gray font-normal">Member → Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDirection('ADMIN_TO_MEMBER')}
                    className={`py-2.5 px-3 rounded-[12px] text-ios-caption1 transition-all flex flex-col items-center justify-center text-center gap-0.5 ${
                      direction === 'ADMIN_TO_MEMBER'
                        ? 'bg-white text-green-600 shadow-sm border border-black/[0.06]'
                        : 'text-ios-gray hover:text-primary'
                    }`}
                  >
                    <span className="flex items-center gap-1 font-bold text-xs">
                      <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                      Give
                    </span>
                    <span className="text-[10px] text-ios-gray font-normal">Admin → Member</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Amount to Settle</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-semibold text-sm">
                    Rs.
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={settleAmount}
                    onChange={e => setSettleAmount(e.target.value)}
                    placeholder="0.00"
                    className="input pl-11 font-mono"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* 1-Word Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="btn-secondary flex-1 py-3 rounded-[14px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary flex-1 py-3 rounded-[14px] flex items-center justify-center gap-2"
                  id="settle-member-submit"
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Settle'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
