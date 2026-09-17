'use client'

import { useState } from 'react'
import { Bell, X, CheckCircle, AlertCircle, HelpCircle, CreditCard } from 'lucide-react'
import { markNotificationsRead } from '@/actions/settings'
import { formatDateTime } from '@/lib/utils'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: Date
  meetingId?: string | null
  meeting?: {
    id: string
    title: string
    date: Date
    expenses?: Array<{ id: string; amount: any }>
    attendees?: Array<{ id: string; user?: { id: string; name: string } | null }>
    settlements?: Array<{ id: string; expectedAmount: any; actualAmount?: any }>
  } | null
}

export default function NotificationBell({
  count = 0,
  notifications = [],
  userId,
}: {
  count: number
  notifications?: Notification[]
  userId: string
}) {
  const [open, setOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  const getIcon = (type: string) => {
    switch (type) {
      case 'ENQUIRY': return <HelpCircle className="w-4 h-4 text-ios-blue" />
      case 'PAYMENT_SETTLED': return <CheckCircle className="w-4 h-4 text-success" />
      case 'PAYMENT_DUE': return <AlertCircle className="w-4 h-4 text-warning" />
      case 'PAYMENT_SUBMITTED': return <CreditCard className="w-4 h-4 text-accent" />
      default: return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  async function handleOpen() {
    setOpen(true)
    if (count > 0) {
      await markNotificationsRead(userId)
    }
  }

  function handleSelectNotification(n: Notification) {
    setSelectedNotification(n)
    setOpen(false)
  }

  return (
    <div className="relative font-outfit">
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-primary hover:bg-gray-100 transition-all"
        aria-label={`Notifications (${count} unread)`}
        id="notification-bell"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-black/[0.08] z-50 animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-black/[0.06]">
              <h3 className="font-semibold text-primary text-ios-subhead">Notifications</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-black/[0.06] max-h-80 overflow-y-auto">
                {notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleSelectNotification(n)}
                    className="w-full text-left p-4 flex gap-3 hover:bg-black/[0.02] active:bg-black/5 transition-colors"
                  >
                    <div className="w-8 h-8 bg-ios-lightGray rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-semibold text-ios-subhead text-primary truncate">{n.title}</p>
                        {n.type === 'ENQUIRY' && (
                          <span className="text-[10px] bg-ios-blue/10 text-ios-blue font-bold px-2 py-0.5 rounded-full shrink-0">
                            Enquiry
                          </span>
                        )}
                      </div>
                      <p className="text-ios-caption1 text-ios-gray mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── Notification Detail Modal ─── */}
      {selectedNotification && (
        <div
          className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-4 font-outfit"
          onClick={e => e.target === e.currentTarget && setSelectedNotification(null)}
        >
          <div className="w-full max-w-md bg-white rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl animate-slide-up">
            {/* Grab handle */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ios-blue/10 rounded-2xl flex items-center justify-center text-ios-blue shrink-0">
                  {getIcon(selectedNotification.type)}
                </div>
                <div>
                  <h3 className="text-ios-title3 font-bold text-primary">{selectedNotification.title}</h3>
                  <p className="text-ios-caption2 text-ios-gray">{formatDateTime(selectedNotification.createdAt)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="w-8 h-8 rounded-full bg-ios-lightGray text-ios-gray flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Meeting Breakdown Context Box */}
            {(selectedNotification.meeting || selectedNotification.type === 'ENQUIRY') && (() => {
              const meeting = selectedNotification.meeting
              const totalExpense = meeting?.expenses?.reduce((sum: number, e: { amount: any }) => sum + parseFloat(e.amount.toString()), 0) ?? 0
              const attendeeCount = meeting?.attendees?.length ?? 0
              const attendeeNames = meeting?.attendees?.map((a: { user?: { name: string } | null }) => a.user?.name).filter(Boolean).join(', ')
              const fairShare = attendeeCount > 0 ? totalExpense / attendeeCount : 0

              return (
                <div className="bg-white border border-black/[0.08] rounded-2xl p-4 shadow-sm mb-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-black/[0.06] pb-2">
                    <div>
                      <p className="text-ios-caption2 font-semibold uppercase tracking-wider text-ios-blue">
                        Enquired Meeting Breakdown
                      </p>
                      <h4 className="text-ios-headline font-bold text-primary">
                        {meeting?.title || selectedNotification.title.replace('Enquiry: ', '').replace(/"/g, '')}
                      </h4>
                    </div>
                    {meeting?.date && (
                      <span className="text-ios-caption2 text-ios-gray">
                        {new Date(meeting.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {meeting && (
                    <div className="grid grid-cols-2 gap-y-2 text-ios-footnote text-primary">
                      <div>
                        <span className="text-ios-gray text-ios-caption1 block">Total Spend</span>
                        <span className="font-bold">₹{totalExpense.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-ios-gray text-ios-caption1 block">Fair Share / Person</span>
                        <span className="font-bold text-ios-blue">₹{fairShare.toFixed(2)}</span>
                      </div>
                      <div className="col-span-2 border-t border-black/[0.04] pt-2">
                        <span className="text-ios-gray text-ios-caption1 block">Attendees ({attendeeCount})</span>
                        <span className="font-medium text-xs text-primary">{attendeeNames || 'None'}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="bg-[#F2F2F7] rounded-2xl p-4 border border-black/[0.04] mb-5">
              <p className="text-ios-caption2 font-semibold uppercase tracking-wider text-ios-gray mb-1.5">
                Full Breakdown & Query Details
              </p>
              <p className="text-ios-footnote text-primary font-medium leading-relaxed whitespace-pre-wrap font-mono">
                {selectedNotification.message}
              </p>
            </div>

            <button
              onClick={() => setSelectedNotification(null)}
              className="w-full py-3.5 rounded-2xl bg-ios-blue text-white font-semibold text-ios-body hover:bg-blue-600 transition-colors active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
