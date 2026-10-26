'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { finalizeMeeting, deleteMeeting } from '@/actions/meetings'
import { toast } from 'sonner'
import { Calculator, CheckCircle2, Lock, Trash2, AlertCircle } from 'lucide-react'
import { MeetingStatus } from '@/lib/types/database'

type Props = {
  meeting: {
    id: string
    status: MeetingStatus
    title: string
    attendeeCount: number
    expenseCount: number
    pendingSettlements: number
  }
}

export default function AdminMeetingControls({ meeting }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isPayment = meeting.title.startsWith('Payment:')

  async function handleFinalize() {
    startTransition(async () => {
      const result = await finalizeMeeting(meeting.id)
      if (result.success) {
        toast.success('Meeting split calculated and locked successfully!')
        setShowFinalizeConfirm(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  async function handleDelete() {
    startTransition(async () => {
      const result = await deleteMeeting(meeting.id)
      if (result.success) {
        toast.success(isPayment ? 'Payment record deleted! Balances restored.' : 'Meeting deleted successfully.')
        setShowDeleteConfirm(false)
        router.push('/meetings')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="mb-4">
      <p className="section-header">Admin Actions</p>

      <div className="card p-4 border border-gray-200/80 shadow-xs space-y-3">
        {meeting.status === 'OPEN' ? (
          <>
            <div className="flex items-start gap-3 bg-blue-50/70 border border-blue-100 rounded-xl p-3">
              <Calculator className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800 leading-relaxed">
                When everyone is done entering spending, finalize to calculate everyone's fair share and settlement amounts.
              </p>
            </div>
            <button
              onClick={() => setShowFinalizeConfirm(true)}
              disabled={isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
              id="finalize-meeting-btn"
            >
              <Calculator className="w-4 h-4" />
              Calculate Split & Lock
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 justify-center py-2 text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <p className="font-semibold text-sm">
              {isPayment ? 'Payment confirmed & settled' : 'Meeting split calculated & finalized'}
            </p>
          </div>
        )}

        {/* Delete / Remove Meeting */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isPending}
          className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-1.5 transition-colors"
          id="delete-meeting-btn"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {isPayment ? 'Delete Payment Record' : 'Delete Meeting'}
        </button>
      </div>

      {/* Confirm Finalize Modal */}
      {showFinalizeConfirm && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setShowFinalizeConfirm(false)}
        >
          <div className="modal-content animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Calculator className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Calculate & Lock Split?</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                This will calculate each person's fair share for <strong>{meeting.title}</strong> and update their member balances.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinalizeConfirm(false)}
                className="btn-secondary flex-1 py-3"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                disabled={isPending}
                className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Confirm & Split'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setShowDeleteConfirm(false)}
        >
          <div className="modal-content animate-slide-up">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {isPayment ? 'Delete Payment Record?' : 'Delete Meeting?'}
              </h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Are you sure you want to delete <strong>{meeting.title}</strong>?
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 mb-5 flex gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 space-y-1 text-left">
                <p className="font-semibold">This action cannot be undone.</p>
                <p className="leading-relaxed">
                  {isPayment
                    ? 'Deleting this payment record will restore any prior pending balances that were settled by it.'
                    : 'All associated expenses and settlements will be permanently deleted.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary flex-1 py-3"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="btn-danger flex-1 py-3 flex items-center justify-center gap-2"
                id="confirm-delete-meeting-btn"
              >
                {isPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
