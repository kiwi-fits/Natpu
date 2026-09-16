'use client'

import { useState, useTransition } from 'react'
import { submitPayment, markSettled } from '@/actions/settlements'
import { toast } from 'sonner'
import { CheckCircle, Clock, CreditCard, X, AlertCircle } from 'lucide-react'
import { formatCurrencyDisplay, formatDateTime, getInitials } from '@/lib/utils'
import { PaymentStatus } from '@prisma/client'
import { cn } from '@/lib/utils'

type Settlement = {
  id: string
  userId: string
  userName: string
  expectedAmount: string
  actualAmount: string | null
  status: PaymentStatus
  submittedAt: string | null
  settledAt: string | null
  note: string | null
}

export default function SettlementCard({
  settlement,
  isAdmin,
  currentUserId,
  meetingId,
}: {
  settlement: Settlement
  isAdmin: boolean
  currentUserId: string
  meetingId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [actualAmount, setActualAmount] = useState(settlement.expectedAmount)
  const [note, setNote] = useState('')

  const isOwn = settlement.userId === currentUserId
  const expected = parseFloat(settlement.expectedAmount)
  const actual = settlement.actualAmount ? parseFloat(settlement.actualAmount) : null
  const difference = actual !== null ? actual - expected : null

  async function handleSubmitPayment() {
    startTransition(async () => {
      const result = await submitPayment(settlement.id)
      if (result.success) toast.success('Payment marked as submitted!')
      else toast.error(result.error)
    })
  }

  async function handleMarkSettled(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const formData = new FormData()
      formData.append('settlementId', settlement.id)
      formData.append('actualAmount', actualAmount)
      formData.append('note', note)
      const result = await markSettled(formData)
      if (result.success) {
        toast.success('Payment confirmed!')
        setShowSettleModal(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  const statusColors = {
    PENDING: 'border-gray-200',
    SUBMITTED: 'border-accent/40 bg-accent-light/20',
    SETTLED: 'border-success/40 bg-success-light/30',
  }

  return (
    <>
      <div className={cn('card p-4 border-2 transition-all', statusColors[settlement.status])}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0',
            settlement.status === 'SETTLED' ? 'bg-success text-white' :
            settlement.status === 'SUBMITTED' ? 'bg-accent text-white' :
            'bg-gray-100 text-gray-600'
          )}>
            {settlement.status === 'SETTLED' ? <CheckCircle className="w-4 h-4" /> : getInitials(settlement.userName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-primary text-sm">
              {settlement.userName}
              {isOwn && <span className="text-xs text-gray-400 ml-1">(you)</span>}
            </p>
            <div className={cn(
              'badge mt-0.5',
              settlement.status === 'SETTLED' ? 'badge-settled' :
              settlement.status === 'SUBMITTED' ? 'badge-submitted' :
              'badge-pending'
            )}>
              {settlement.status === 'PENDING' && <Clock className="w-3 h-3" />}
              {settlement.status === 'SUBMITTED' && <CreditCard className="w-3 h-3" />}
              {settlement.status === 'SETTLED' && <CheckCircle className="w-3 h-3" />}
              {settlement.status}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Owes</p>
            <p className="font-bold text-danger text-lg">{formatCurrencyDisplay(expected)}</p>
          </div>
        </div>

        {/* Settled details */}
        {settlement.status === 'SETTLED' && settlement.actualAmount && (
          <div className="bg-white rounded-xl p-3 mb-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Expected</span>
              <span className="font-medium">{formatCurrencyDisplay(expected)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Received</span>
              <span className="font-semibold text-success">{formatCurrencyDisplay(settlement.actualAmount)}</span>
            </div>
            {difference !== null && difference !== 0 && (
              <div className="flex items-center justify-between text-sm border-t border-border pt-1">
                <span className="text-gray-500">
                  {difference > 0 ? 'Extra Given (To Receive)' : 'Shortage'}
                </span>
                <span className={cn('font-semibold', difference < 0 ? 'text-danger' : 'text-success')}>
                  {difference > 0 ? '+' : ''}{formatCurrencyDisplay(difference)}
                </span>
              </div>
            )}
            {settlement.settledAt && (
              <p className="text-xs text-gray-400">{formatDateTime(settlement.settledAt)}</p>
            )}
            {settlement.note && (
              <p className="text-xs text-gray-500 italic">"{settlement.note}"</p>
            )}
          </div>
        )}

        {/* Submitted details */}
        {settlement.status === 'SUBMITTED' && settlement.submittedAt && (
          <p className="text-xs text-accent mb-3">
            Submitted {formatDateTime(settlement.submittedAt)}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isOwn && settlement.status === 'PENDING' && (
            <button
              onClick={handleSubmitPayment}
              disabled={isPending}
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              id={`submit-payment-${settlement.id}`}
            >
              {isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-3.5 h-3.5" />
                  Mark as Transferred
                </>
              )}
            </button>
          )}

          {isAdmin && settlement.status !== 'SETTLED' && (
            <button
              onClick={() => setShowSettleModal(true)}
              disabled={isPending}
              className="btn-success flex-1 text-sm flex items-center justify-center gap-2"
              id={`mark-settled-${settlement.id}`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Mark Settled
            </button>
          )}
        </div>
      </div>

      {/* Admin Mark Settled Modal */}
      {showSettleModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSettleModal(false)}>
          <div className="modal-content">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-primary text-lg">Confirm Settlement</h3>
                <p className="text-sm text-gray-500">{settlement.userName}</p>
              </div>
              <button onClick={() => setShowSettleModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-warning-light rounded-xl p-3 mb-4 flex gap-2">
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-warning-foreground">
                Have you confirmed this amount has arrived in the group bank account?
              </p>
            </div>

            <form onSubmit={handleMarkSettled} className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Expected amount</p>
                <p className="font-bold text-primary text-xl">{formatCurrencyDisplay(expected)}</p>
              </div>

              <div>
                <label className="label">Actual received amount *</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">Rs.</div>
                  <input
                    type="number"
                    value={actualAmount}
                    onChange={e => setActualAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="input pl-12 font-semibold"
                    required
                    id="actual-amount-input"
                  />
                </div>
                {parseFloat(actualAmount) > expected && (
                  <p className="text-xs font-semibold text-green-600 mt-1.5 px-1 flex items-center gap-1">
                    ✓ Extra given: +{formatCurrencyDisplay(parseFloat(actualAmount) - expected)} (will be credited as To Receive)
                  </p>
                )}
              </div>

              <div>
                <label className="label">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Received via bank transfer"
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowSettleModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-success flex-1 flex items-center justify-center gap-2"
                  id="confirm-settlement-btn"
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirm Settlement
                    </>
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
