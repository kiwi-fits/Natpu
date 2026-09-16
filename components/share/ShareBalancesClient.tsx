'use client'

import { useState, useTransition } from 'react'
import {
  ArrowUpRight, ArrowDownRight, ChevronRight,
  X, Receipt, Info, Check, Copy, Building2, HelpCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { submitEnquiry } from '@/actions/enquiry'

export type MemberMeetingBreakdown = {
  meetingId: string
  meetingTitle: string
  date: string
  totalExpense: number
  attendeeCount: number
  fairShare: number
  memberSpent: number
  settledPaidAmount?: number
  settledRefundedAmount?: number
  meetingNetBalance: number
  settlementStatus?: string
  expectedSettlementAmount?: number
}

export type MemberBalanceData = {
  id: string
  name: string
  role?: string
  netBalance: number
  pendingToPay: number
  totalSpent: number
  settledPaid?: number
  settledRefunded?: number
  totalFairShare: number
  meetings: MemberMeetingBreakdown[]
}

export type BankDetailsData = {
  bankName: string
  accountName: string
  accountNumber: string
  branch?: string | null
  upiId?: string | null
}

const avatarColors = [
  'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-violet-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-orange-600', 'bg-indigo-600',
  'bg-teal-600', 'bg-fuchsia-600', 'bg-sky-600',
]

export default function ShareBalancesClient({
  memberBalances,
  bankDetails,
  updatedAtFormatted,
}: {
  memberBalances: MemberBalanceData[]
  bankDetails: BankDetailsData
  updatedAtFormatted: string
}) {
  const [selectedMember, setSelectedMember] = useState<MemberBalanceData | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [enquiryMeeting, setEnquiryMeeting] = useState<MemberMeetingBreakdown | null>(null)
  const [queryText, setQueryText] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleOpenEnquiry(m: MemberMeetingBreakdown) {
    setEnquiryMeeting(m)
    setQueryText('')
  }

  function handleSubmitEnquiry(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMember || !enquiryMeeting) return
    if (!queryText.trim()) {
      toast.error('Please enter your enquiry question')
      return
    }

    startTransition(async () => {
      const result = await submitEnquiry({
        meetingId: enquiryMeeting.meetingId,
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        queryText: queryText.trim(),
      })

      if (result.success) {
        toast.success(`Enquiry sent to Admin for "${enquiryMeeting.meetingTitle}"!`)
        setEnquiryMeeting(null)
        setQueryText('')
      } else {
        toast.error(result.error)
      }
    })
  }

  function formatCurrency(amount: number): string {
    return `Rs. ${Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  }

  function handleCopy(text: string, fieldName: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E] font-outfit selection:bg-ios-blue selection:text-white">
      <div className="max-w-[428px] mx-auto bg-[#F2F2F7] flex flex-col pb-6">

        {/* ─── Minimalist Top Nav Header ─── */}
        <header className="bg-white border-b border-black/[0.08] sticky top-0 z-30 px-5 py-3.5 flex items-center justify-between shadow-xs">
          <span className="font-extrabold text-[22px] tracking-wider text-black font-outfit uppercase">
            NATPU
          </span>
        </header>

        {/* ─── Main Content Container ─── */}
        <div className="px-4 pt-4">

        {/* ─── Admin Payment & Bank Details Card (Copyable) ─── */}
        <div className="mb-6 animate-fade-in">
          <div className="gradient-header rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-ios-blue" />
                <p className="text-white/60 text-ios-caption2 font-semibold uppercase tracking-widest">
                  Admin Payment Details
                </p>
              </div>
              <span className="text-[10px] bg-white/10 text-white/80 px-2 py-0.5 rounded-full font-medium">
                Tap to copy
              </span>
            </div>

            <div className="space-y-3">
              {/* Account Holder */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div>
                  <p className="text-white/50 text-[11px]">Account Name</p>
                  <p className="text-white font-semibold text-ios-subhead">{bankDetails.accountName}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-[11px]">Bank</p>
                  <p className="text-white font-bold text-base text-white/95 tracking-wide">{bankDetails.bankName}</p>
                </div>
              </div>

              {/* Account Number (Copyable) */}
              <div className="flex items-center justify-between bg-white/10 hover:bg-white/15 active:bg-white/20 transition-all rounded-xl p-3 border border-white/10">
                <div>
                  <p className="text-white/50 text-[10px] uppercase font-semibold tracking-wider">Account Number</p>
                  <p className="text-white font-bold text-ios-body tracking-wider tabular-nums font-mono mt-0.5">
                    {bankDetails.accountNumber}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(bankDetails.accountNumber, 'account')}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all active:scale-95"
                >
                  {copiedField === 'account' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* UPI / Branch if present */}
              {bankDetails.branch && (
                <div className="flex items-center justify-between text-xs text-white/60 pt-1">
                  <span>IFSC / Branch:</span>
                  <span className="font-mono text-white/90 font-medium">{bankDetails.branch}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Member Balances (Same as Admin grouped list) ─── */}
        <div className="animate-slide-up mb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="section-header !mb-0">Member Balances</p>
            <span className="text-ios-caption2 text-ios-gray">Tap name for breakdown</span>
          </div>

          <div className="ios-list">
            {memberBalances.map((member, index) => (
              <button
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className={`w-full text-left px-4 py-3.5 flex items-center justify-between active:bg-black/5 transition-colors ${
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
                      <Info className="w-3 h-3 text-ios-gray/60" />
                    </div>
                    {member.netBalance > 0 ? (
                      <p className="text-ios-caption1 text-green-500 flex items-center gap-0.5 mt-0.5">
                        <ArrowUpRight className="w-3 h-3" />
                        Give
                      </p>
                    ) : member.netBalance < 0 ? (
                      <p className="text-ios-caption1 text-red-500 flex items-center gap-0.5 mt-0.5">
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
                      {formatCurrency(member.netBalance)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ios-gray/50" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-ios-gray text-ios-caption2 mt-3 mb-3">
          Powered by <strong className="font-semibold text-primary">Natpu</strong> • iOS Settlement Engine
        </p>

        {/* ─── iOS Floating Calculation Breakdown Bottom Sheet ─── */}
        {selectedMember && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center animate-fade-in"
            onClick={() => setSelectedMember(null)}
          >
            <div
              className="w-full max-w-[428px] bg-white rounded-t-[28px] p-6 max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up"
              onClick={e => e.stopPropagation()}
            >
              {/* Grab Handle */}
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

              {/* Modal Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white ${
                      avatarColors[memberBalances.findIndex(m => m.id === selectedMember.id) % avatarColors.length]
                    }`}
                  >
                    {selectedMember.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-ios-title2 font-bold text-primary">
                        {selectedMember.name}
                      </h3>
                      {selectedMember.role === 'ADMIN' && (
                        <span className="inline-flex items-center bg-ios-blue/10 text-ios-blue text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-ios-footnote text-ios-gray">Calculation Breakdown</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMember(null)}
                  className="w-8 h-8 rounded-full bg-ios-lightGray text-ios-gray flex items-center justify-center transition-colors hover:bg-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary Net Card */}
              <div className="bg-[#F2F2F7] rounded-2xl p-4 mb-5 border border-black/[0.04]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-ios-caption1 text-ios-gray font-medium">Final Net Balance</span>
                  <span
                    className={`text-ios-caption2 px-2.5 py-0.5 rounded-full font-semibold ${
                      selectedMember.netBalance > 0
                        ? 'bg-green-100 text-green-700'
                        : selectedMember.netBalance < 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {selectedMember.netBalance > 0
                      ? 'Give'
                      : selectedMember.netBalance < 0
                      ? 'Borrow'
                      : 'Settled'}
                  </span>
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
                  {formatCurrency(selectedMember.netBalance)}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-black/[0.06] text-ios-footnote">
                  <div>
                    <span className="text-ios-gray block text-ios-caption1">Total Paid / Spent</span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(selectedMember.totalSpent + (selectedMember.settledPaid || 0))}
                    </span>
                  </div>
                  <div>
                    <span className="text-ios-gray block text-ios-caption1">Total Fair Share</span>
                    <span className="font-semibold text-primary">{formatCurrency(selectedMember.totalFairShare)}</span>
                  </div>
                  {selectedMember.settledRefunded && selectedMember.settledRefunded > 0 ? (
                    <div className="col-span-2 pt-2 border-t border-black/[0.04] flex items-center justify-between">
                      <span className="text-ios-gray text-ios-caption1">Refunded by Admin</span>
                      <span className="font-semibold text-red-500">−{formatCurrency(selectedMember.settledRefunded)}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Formula info banner */}
              <div className="bg-ios-blue/10 rounded-xl p-3 mb-5 flex items-start gap-2.5 text-ios-caption1 text-ios-blue">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  <strong>Formula:</strong> Net Balance = (Spent + Payments) − (Fair Share + Refunds).
                </p>
              </div>

              {/* Meetings Breakdown */}
              <div className="flex items-center gap-1.5 mb-3">
                <Receipt className="w-4 h-4 text-ios-blue" />
                <h4 className="text-ios-subhead font-semibold text-primary">
                  Meetings Breakdown ({selectedMember.meetings.length})
                </h4>
              </div>

              <div className="space-y-3">
                {selectedMember.meetings.length === 0 ? (
                  <p className="text-ios-footnote text-ios-gray text-center py-4">No meetings recorded yet.</p>
                ) : (
                  selectedMember.meetings.map((m, idx) => (
                    <div
                      key={m.meetingId || idx}
                      className="bg-white border border-black/[0.08] rounded-2xl p-4 space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-black/[0.06] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ios-subhead text-primary">{m.meetingTitle}</span>
                          <button
                            onClick={() => handleOpenEnquiry(m)}
                            className="inline-flex items-center gap-1 bg-ios-blue/10 text-ios-blue text-[11px] font-semibold px-2 py-0.5 rounded-full hover:bg-ios-blue/20 transition-colors"
                          >
                            <HelpCircle className="w-3 h-3" />
                            Enquire
                          </button>
                        </div>
                        <span className="text-ios-caption2 text-ios-gray">{m.date}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-y-1 text-ios-footnote text-primary">
                        <div>
                          <span className="text-ios-gray text-ios-caption1 block">Total Spend</span>
                          <span className="font-medium">{formatCurrency(m.totalExpense)}</span>
                        </div>
                        <div>
                          <span className="text-ios-gray text-ios-caption1 block">Attendees</span>
                          <span className="font-medium">{m.attendeeCount} members</span>
                        </div>
                        <div>
                          <span className="text-ios-gray text-ios-caption1 block">Fair Share</span>
                          <span className="font-medium">{formatCurrency(m.fairShare)}</span>
                        </div>
                        <div>
                          {m.settledRefundedAmount && m.settledRefundedAmount > 0 ? (
                            <>
                              <span className="text-ios-gray text-ios-caption1 block">Admin Refund</span>
                              <span className="font-semibold text-red-500">−{formatCurrency(m.settledRefundedAmount)}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-ios-gray text-ios-caption1 block">Member Paid</span>
                              <span className="font-semibold text-green-600">{formatCurrency(m.memberSpent)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] text-ios-subhead">
                        <span className="text-ios-gray text-ios-caption1">Meeting Net:</span>
                        <span
                          className={`font-bold ${
                            m.meetingNetBalance > 0
                              ? 'text-green-500'
                              : m.meetingNetBalance < 0
                              ? 'text-red-500'
                              : 'text-ios-gray'
                          }`}
                        >
                          {m.meetingNetBalance > 0 ? '+' : m.meetingNetBalance < 0 ? '-' : ''}
                          {formatCurrency(m.meetingNetBalance)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setSelectedMember(null)}
                className="w-full mt-6 py-3.5 rounded-2xl bg-ios-blue text-white font-semibold text-ios-body hover:bg-blue-600 transition-colors active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* ─── iOS Floating Enquiry Modal ─── */}
        {enquiryMeeting && selectedMember && (
          <div
            className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-4 font-outfit"
            onClick={e => e.target === e.currentTarget && setEnquiryMeeting(null)}
          >
            <div className="w-full max-w-md bg-white rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl animate-slide-up">
              {/* Grab handle */}
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-ios-title3 font-bold text-primary">Meeting Enquiry</h3>
                  <p className="text-ios-caption1 text-ios-gray mt-0.5">
                    {enquiryMeeting.meetingTitle} ({enquiryMeeting.date})
                  </p>
                </div>
                <button
                  onClick={() => setEnquiryMeeting(null)}
                  className="w-8 h-8 rounded-full bg-ios-lightGray text-ios-gray flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitEnquiry} className="space-y-4">
                <div className="bg-[#F2F2F7] rounded-xl p-3 border border-black/[0.04] text-ios-caption1">
                  <span className="text-ios-gray">Member: </span>
                  <strong className="text-primary font-semibold">{selectedMember.name}</strong>
                </div>

                <div>
                  <label className="label">Your Question / Inquiry</label>
                  <textarea
                    rows={3}
                    value={queryText}
                    onChange={e => setQueryText(e.target.value)}
                    placeholder="Ask Admin about this meeting calculation..."
                    className="input py-2.5 text-ios-subhead resize-none"
                    required
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEnquiryMeeting(null)}
                    className="btn-secondary flex-1 py-3 rounded-[14px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary flex-1 py-3 rounded-[14px] flex items-center justify-center gap-2"
                    id="submit-enquiry-btn"
                  >
                    {isPending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
