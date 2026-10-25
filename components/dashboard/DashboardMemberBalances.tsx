'use client'

import { useState, useTransition } from 'react'
import { ArrowUpRight, ArrowDownRight, ChevronRight, X, Check, Users, ArrowRight } from 'lucide-react'
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
  const [targetMemberId, setTargetMemberId] = useState<string>('')
  const [action, setAction] = useState<'GIVE' | 'BORROW'>('GIVE')
  const [settleAmount, setSettleAmount] = useState('')
  const [isPending, startTransition] = useTransition()

  // Find target member object
  const targetMember = memberBalances.find(m => m.id === targetMemberId) || null

  function handleOpenModal(member: MemberBalance) {
    setSelectedMember(member)
    // Find first other member as default counterparty
    const otherMembers = memberBalances.filter(m => m.id !== member.id)
    if (otherMembers.length > 0) {
      // Prefer member with opposite balance if available
      const counterparty = (member.netBalance < 0
        ? otherMembers.find(m => m.netBalance > 0)
        : otherMembers.find(m => m.netBalance < 0)) || otherMembers[0]
      setTargetMemberId(counterparty.id)
    } else {
      setTargetMemberId('')
    }

    // Default action: if selectedMember owes money (negative), default to GIVE (they give to clear debt)
    setAction(member.netBalance < 0 ? 'GIVE' : 'BORROW')
    setSettleAmount('')
  }

  function handleSettle(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMember) return
    if (!targetMemberId) {
      toast.error('Please select a member to settle with.')
      return
    }

    const amount = parseFloat(settleAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
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
          toast.success(`${fromName} gave Rs. ${amount.toFixed(2)} to ${toName}!`)
        } else {
          toast.success(`${fromName} borrowed Rs. ${amount.toFixed(2)} from ${toName}!`)
        }
        setSelectedMember(null)
      } else {
        toast.error(result.error)
      }
    })
  }

  // Calculate live preview of balance changes
  const parsedAmount = parseFloat(settleAmount) || 0
  const selectedBefore = selectedMember?.netBalance ?? 0
  const targetBefore = targetMember?.netBalance ?? 0

  // If GIVE: selectedMember gives to targetMember -> selectedMember balance +amount, targetMember -amount
  // If BORROW: selectedMember borrows from targetMember -> selectedMember balance -amount, targetMember +amount
  const selectedDelta = action === 'GIVE' ? parsedAmount : -parsedAmount
  const targetDelta = action === 'GIVE' ? -parsedAmount : parsedAmount

  const selectedAfter = selectedBefore + selectedDelta
  const targetAfter = targetBefore + targetDelta

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
                {member.pendingToPay !== undefined && member.pendingToPay > 0 && (
                  <p className="text-[11px] text-ios-gray mt-0.5">
                    Owes {formatCurrencyDisplay(member.pendingToPay)}
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-ios-gray/40 flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>

      {/* ─── Member-to-Member Settlement Modal ─── */}
      {selectedMember && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setSelectedMember(null)}
        >
          <div className="modal-content animate-slide-up max-w-[420px] w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-primary text-lg">Settle Balance</h3>
                <p className="text-xs text-ios-gray">Member-to-member payment</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="w-8 h-8 rounded-full bg-ios-lightGray text-ios-gray flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSettle} className="space-y-4">
              {/* Member 1 (Primary) */}
              <div>
                <label className="label">1st Member</label>
                <div className="p-3 bg-[#F2F2F7] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-ios-blue text-white flex items-center justify-center font-bold text-xs">
                      {selectedMember.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-primary text-sm">{selectedMember.name}</p>
                      <p className="text-[11px] text-ios-gray">
                        Current: {selectedMember.netBalance >= 0 ? '+' : ''}
                        {formatCurrencyDisplay(selectedMember.netBalance)}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-ios-blue bg-ios-blue/10 px-2 py-0.5 rounded-md">
                    Selected
                  </span>
                </div>
              </div>

              {/* Action / Payment Direction: Give vs Borrow */}
              <div>
                <label className="label">Action</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#F2F2F7] rounded-2xl border border-black/[0.04]">
                  <button
                    type="button"
                    onClick={() => setAction('GIVE')}
                    className={`py-2.5 px-3 rounded-[12px] text-ios-caption1 transition-all flex flex-col items-center justify-center text-center gap-0.5 ${
                      action === 'GIVE'
                        ? 'bg-white text-green-600 shadow-sm border border-black/[0.06]'
                        : 'text-ios-gray hover:text-primary'
                    }`}
                  >
                    <span className="flex items-center gap-1 font-bold text-xs">
                      <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                      Give
                    </span>
                    <span className="text-[10px] text-ios-gray font-normal">
                      {selectedMember.name} gives money
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAction('BORROW')}
                    className={`py-2.5 px-3 rounded-[12px] text-ios-caption1 transition-all flex flex-col items-center justify-center text-center gap-0.5 ${
                      action === 'BORROW'
                        ? 'bg-white text-red-600 shadow-sm border border-black/[0.06]'
                        : 'text-ios-gray hover:text-primary'
                    }`}
                  >
                    <span className="flex items-center gap-1 font-bold text-xs">
                      <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                      Borrow
                    </span>
                    <span className="text-[10px] text-ios-gray font-normal">
                      {selectedMember.name} receives money
                    </span>
                  </button>
                </div>
              </div>

              {/* 2nd Member Selection (Counterparty) */}
              <div>
                <label className="label">
                  {action === 'GIVE' ? 'Give to (2nd Member)' : 'Borrow from (2nd Member)'}
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
                          {m.name} ({m.netBalance >= 0 ? '+' : ''}
                          {formatCurrencyDisplay(m.netBalance)})
                        </option>
                      ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-ios-gray">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="label">Amount</label>
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
                    className="input pl-11 font-mono text-base font-semibold"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Transaction Summary & Balance Preview */}
              {targetMember && parsedAmount > 0 && (
                <div className="bg-[#F2F2F7] rounded-xl p-3 border border-black/[0.04] space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-primary border-b border-black/[0.06] pb-1.5">
                    <span>Transaction</span>
                    <span className="text-ios-blue flex items-center gap-1">
                      {action === 'GIVE'
                        ? `${selectedMember.name} → ${targetMember.name}`
                        : `${targetMember.name} → ${selectedMember.name}`}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-ios-gray">
                      <span>{selectedMember.name}:</span>
                      <span className="font-mono font-medium">
                        {formatCurrencyDisplay(selectedBefore)} ➔{' '}
                        <strong
                          className={
                            selectedAfter > 0
                              ? 'text-green-600'
                              : selectedAfter < 0
                              ? 'text-red-600'
                              : 'text-primary'
                          }
                        >
                          {selectedAfter >= 0 ? '+' : ''}
                          {formatCurrencyDisplay(selectedAfter)}
                        </strong>{' '}
                        ({selectedDelta > 0 ? '+' : ''}
                        {formatCurrencyDisplay(selectedDelta)})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-ios-gray">
                      <span>{targetMember.name}:</span>
                      <span className="font-mono font-medium">
                        {formatCurrencyDisplay(targetBefore)} ➔{' '}
                        <strong
                          className={
                            targetAfter > 0
                              ? 'text-green-600'
                              : targetAfter < 0
                              ? 'text-red-600'
                              : 'text-primary'
                          }
                        >
                          {targetAfter >= 0 ? '+' : ''}
                          {formatCurrencyDisplay(targetAfter)}
                        </strong>{' '}
                        ({targetDelta > 0 ? '+' : ''}
                        {formatCurrencyDisplay(targetDelta)})
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
                  className="btn-secondary flex-1 py-3 rounded-[14px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !targetMemberId}
                  className="btn-primary flex-1 py-3 rounded-[14px] flex items-center justify-center gap-2"
                  id="settle-member-submit"
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Confirm Settlement'
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
