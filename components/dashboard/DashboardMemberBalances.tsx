'use client'

import { useState, useTransition } from 'react'
import { ArrowUpRight, ArrowDownRight, ChevronRight, X, Users, CheckCircle2, ArrowRight } from 'lucide-react'
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

const avatarGradients = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-violet-700',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-fuchsia-500 to-purple-600',
  'from-teal-500 to-emerald-700',
]

export default function DashboardMemberBalances({
  memberBalances = [],
}: {
  memberBalances?: MemberBalance[]
}) {
  const [selectedMember, setSelectedMember] = useState<MemberBalance | null>(null)
  const [targetMemberId, setTargetMemberId] = useState<string>('')
  const [action, setAction] = useState<'GIVE' | 'BORROW'>('GIVE')
  const [settleAmount, setSettleAmount] = useState('')
  const [isPending, startTransition] = useTransition()

  const targetMember = memberBalances.find(m => m.id === targetMemberId) || null

  function handleOpenModal(member: MemberBalance) {
    setSelectedMember(member)
    const otherMembers = memberBalances.filter(m => m.id !== member.id)
    if (otherMembers.length > 0) {
      const counterparty = (member.netBalance < 0
        ? otherMembers.find(m => m.netBalance > 0)
        : otherMembers.find(m => m.netBalance < 0)) || otherMembers[0]
      setTargetMemberId(counterparty.id)
    } else {
      setTargetMemberId('')
    }

    setAction(member.netBalance < 0 ? 'GIVE' : 'BORROW')
    setSettleAmount('')
  }

  function handleQuickAmount(amount: number) {
    if (amount > 0) {
      setSettleAmount(amount.toFixed(2).replace(/\.00$/, ''))
    }
  }

  function handleSettle(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMember) return
    if (!targetMemberId) {
      toast.error('Please select who to settle with.')
      return
    }

    const amount = parseFloat(settleAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount.')
      return
    }

    startTransition(async () => {
      const result = await settleMemberBalance({
        fromUserId: selectedMember.id,
        toUserId: targetMemberId,
        amount,
        action,
      })

      if (result.success) {
        const fromName = selectedMember.name
        const toName = targetMember?.name || 'Member'
        if (action === 'GIVE') {
          toast.success(`Payment recorded: ${fromName} paid ${formatCurrencyDisplay(amount)} to ${toName}!`)
        } else {
          toast.success(`Payment recorded: ${fromName} received ${formatCurrencyDisplay(amount)} from ${toName}!`)
        }
        setSelectedMember(null)
      } else {
        toast.error(result.error)
      }
    })
  }

  const parsedAmount = parseFloat(settleAmount) || 0
  const selectedBefore = selectedMember?.netBalance ?? 0
  const targetBefore = targetMember?.netBalance ?? 0

  const selectedDelta = action === 'GIVE' ? parsedAmount : -parsedAmount
  const targetDelta = action === 'GIVE' ? -parsedAmount : parsedAmount

  const selectedAfter = selectedBefore + selectedDelta
  const targetAfter = targetBefore + targetDelta

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <p className="text-[13px] font-bold text-gray-500 uppercase tracking-wider">Member Balances</p>
        <span className="text-[11px] font-medium text-ios-blue bg-ios-blue/10 px-2 py-0.5 rounded-full">
          Tap to settle up
        </span>
      </div>

      <div className="ios-list shadow-sm overflow-hidden">
        {memberBalances.map((member, index) => {
          const isPositive = member.netBalance > 0.009
          const isNegative = member.netBalance < -0.009
          const isZero = !isPositive && !isNegative

          return (
            <button
              key={member.id}
              onClick={() => handleOpenModal(member)}
              className={`w-full text-left px-4 py-3.5 flex items-center justify-between hover:bg-black/[0.02] active:bg-black/5 transition-all ${
                index !== 0 ? 'border-t border-black/[0.05]' : ''
              }`}
            >
              {/* Left: Avatar & Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-xs bg-gradient-to-br ${
                    avatarGradients[index % avatarGradients.length]
                  }`}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[15px] font-semibold text-gray-900 truncate">{member.name}</p>
                    {member.role === 'ADMIN' && (
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">
                        Admin
                      </span>
                    )}
                  </div>
                  {isPositive && (
                    <p className="text-[12px] font-medium text-emerald-600 flex items-center gap-0.5 mt-0.5">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Gets back {formatCurrencyDisplay(member.netBalance)}
                    </p>
                  )}
                  {isNegative && (
                    <p className="text-[12px] font-medium text-rose-600 flex items-center gap-0.5 mt-0.5">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      Owes {formatCurrencyDisplay(Math.abs(member.netBalance))}
                    </p>
                  )}
                  {isZero && (
                    <p className="text-[12px] font-medium text-gray-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      All settled
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Net Balance Status */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <div className="text-right">
                  <p
                    className={`text-[16px] font-bold tabular-nums ${
                      isPositive
                        ? 'text-emerald-600'
                        : isNegative
                        ? 'text-rose-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {isPositive ? '+' : isNegative ? '-' : ''}
                    {formatCurrencyDisplay(Math.abs(member.netBalance))}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>
          )
        })}
      </div>

      {/* ─── Settle Up Modal ─── */}
      {selectedMember && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setSelectedMember(null)}
        >
          <div className="modal-content animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Settle Up</h3>
                <p className="text-xs text-gray-500 mt-0.5">Record a payment between group members</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSettle} className="space-y-4">
              {/* Member 1 (The selected friend) */}
              <div>
                <label className="label">1st Person</label>
                <div className="p-3 bg-gray-50 border border-gray-200/70 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      {selectedMember.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{selectedMember.name}</p>
                      <p className="text-xs text-gray-500">
                        Balance:{' '}
                        <span className={selectedMember.netBalance > 0 ? 'text-emerald-600 font-semibold' : selectedMember.netBalance < 0 ? 'text-rose-600 font-semibold' : 'text-gray-500'}>
                          {selectedMember.netBalance > 0 ? `Gets back ${formatCurrencyDisplay(selectedMember.netBalance)}` : selectedMember.netBalance < 0 ? `Owes ${formatCurrencyDisplay(Math.abs(selectedMember.netBalance))}` : 'Settled'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Direction */}
              <div>
                <label className="label">Direction</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setAction('GIVE')}
                    className={`py-2.5 px-3 rounded-[12px] transition-all flex flex-col items-center justify-center text-center ${
                      action === 'GIVE'
                        ? 'bg-white text-emerald-700 shadow-sm font-bold'
                        : 'text-gray-600 hover:text-gray-900 font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-1 text-xs">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                      Pays to
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal mt-0.5">
                      {selectedMember.name} gives
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAction('BORROW')}
                    className={`py-2.5 px-3 rounded-[12px] transition-all flex flex-col items-center justify-center text-center ${
                      action === 'BORROW'
                        ? 'bg-white text-rose-700 shadow-sm font-bold'
                        : 'text-gray-600 hover:text-gray-900 font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-1 text-xs">
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                      Receives from
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal mt-0.5">
                      {selectedMember.name} receives
                    </span>
                  </button>
                </div>
              </div>

              {/* Member 2 (Counterparty) */}
              <div>
                <label className="label">
                  {action === 'GIVE' ? 'Paying to (2nd Person)' : 'Receiving from (2nd Person)'}
                </label>
                <div className="relative">
                  <select
                    value={targetMemberId}
                    onChange={e => setTargetMemberId(e.target.value)}
                    className="input appearance-none pr-10 cursor-pointer font-medium"
                    required
                  >
                    {memberBalances
                      .filter(m => m.id !== selectedMember.id)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.netBalance > 0 ? `Gets +${formatCurrencyDisplay(m.netBalance)}` : m.netBalance < 0 ? `Owes -${formatCurrencyDisplay(Math.abs(m.netBalance))}` : 'Settled'})
                        </option>
                      ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <label className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide">
                    Amount (₹)
                  </label>
                  {selectedMember.netBalance < 0 && action === 'GIVE' && (
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(Math.abs(selectedMember.netBalance))}
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      Pay full debt ({formatCurrencyDisplay(Math.abs(selectedMember.netBalance))})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-semibold text-base">
                    ₹
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={settleAmount}
                    onChange={e => setSettleAmount(e.target.value)}
                    placeholder="0.00"
                    className="input pl-8 font-mono text-base font-semibold"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Live Preview Summary */}
              {targetMember && parsedAmount > 0 && (
                <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    <span>Summary</span>
                    <span className="text-blue-600 font-bold flex items-center gap-1">
                      {action === 'GIVE'
                        ? `${selectedMember.name} ➔ ${targetMember.name}`
                        : `${targetMember.name} ➔ ${selectedMember.name}`}
                    </span>
                  </div>

                  <div className="space-y-1 pt-0.5">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>{selectedMember.name}:</span>
                      <span className="font-mono">
                        {formatCurrencyDisplay(selectedBefore)} ➔{' '}
                        <strong className={selectedAfter > 0 ? 'text-emerald-600' : selectedAfter < 0 ? 'text-rose-600' : 'text-gray-900'}>
                          {selectedAfter >= 0 ? '+' : ''}{formatCurrencyDisplay(selectedAfter)}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-gray-600">
                      <span>{targetMember.name}:</span>
                      <span className="font-mono">
                        {formatCurrencyDisplay(targetBefore)} ➔{' '}
                        <strong className={targetAfter > 0 ? 'text-emerald-600' : targetAfter < 0 ? 'text-rose-600' : 'text-gray-900'}>
                          {targetAfter >= 0 ? '+' : ''}{formatCurrencyDisplay(targetAfter)}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="btn-secondary flex-1 py-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !targetMemberId}
                  className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                  id="settle-member-submit"
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Record Payment'
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
