'use client'

import { useState, useTransition } from 'react'
import { finalizeMeeting } from '@/actions/meetings'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle, Lock } from 'lucide-react'
import { MeetingStatus } from '@prisma/client'

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
  const [isPending, startTransition] = useTransition()
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false)

  async function handleFinalize() {
    startTransition(async () => {
      const result = await finalizeMeeting(meeting.id)
      if (result.success) {
        toast.success('Meeting ended! Balances updated.')
        setShowFinalizeConfirm(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="mb-4">
      <p className="section-header">Admin Controls</p>

      <div className="card p-4 border-2 border-dashed border-gray-200 space-y-3">
        {meeting.status === 'OPEN' ? (
          <>
            <div className="flex items-start gap-3 bg-warning-light rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <p className="text-xs text-warning-foreground">
                After ending the meeting, spending will be locked and balances updated.
              </p>
            </div>
            <button
              onClick={() => setShowFinalizeConfirm(true)}
              disabled={isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
              id="finalize-meeting-btn"
            >
              <Lock className="w-4 h-4" />
              End Meeting
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 justify-center py-2">
            <CheckCircle className="w-5 h-5 text-success" />
            <p className="font-semibold text-success">Meeting ended</p>
          </div>
        )}
      </div>

      {/* End Meeting Confirm Modal */}
      {showFinalizeConfirm && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-4"
          onClick={e => e.target === e.currentTarget && setShowFinalizeConfirm(false)}
        >
          <div className="w-full max-w-md bg-white rounded-t-[28px] sm:rounded-3xl px-6 pt-6 pb-9 sm:pb-6 shadow-2xl animate-slide-up">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-ios-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-ios-blue" />
              </div>
              <h3 className="text-ios-title3 font-bold text-primary tracking-tight">End Meeting?</h3>
              <p className="text-ios-subhead text-ios-gray mt-2 px-2 leading-relaxed">
                This will lock spending for all attendees and calculate settlement amounts.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinalizeConfirm(false)}
                className="btn-secondary flex-1 py-3.5 rounded-[14px]"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                disabled={isPending}
                className="btn-primary flex-1 py-3.5 rounded-[14px] flex items-center justify-center gap-2"
              >
                {isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'End'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
