'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createMeeting } from '@/actions/meetings'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Users, Calendar, FileText, Check } from 'lucide-react'
import Link from 'next/link'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Member = {
  id: string
  name: string
  email: string
}

function getNowLocalDateTimeString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function NewMeetingForm({ members }: { members: Member[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => getNowLocalDateTimeString())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Ensure current local time is detected on component mount
  useEffect(() => {
    setDate(getNowLocalDateTimeString())
  }, [])

  function toggleAttendee(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(members.map(m => m.id)))
  }

  function clearAll() {
    setSelectedIds(new Set())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (selectedIds.size === 0) {
      toast.error('Please select at least one attendee.')
      return
    }

    const formData = new FormData()
    formData.append('title', title)
    formData.append('date', date)
    selectedIds.forEach(id => formData.append('attendeeIds', id))

    startTransition(async () => {
      const result = await createMeeting(formData)
      if (result.success) {
        toast.success('Meeting created!')
        router.push(`/meetings/${result.data.id}`)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="page-container pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/meetings" className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-primary">New Meeting</h1>
          <p className="text-xs text-gray-500">Create a group expense event</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Meeting Details Card */}
        <div className="card p-5">
          <h2 className="font-semibold text-primary mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            Meeting Details
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="label">Meeting name *</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Dinner at Nallur"
                className="input"
                required
                maxLength={100}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 px-1">
                <label htmlFor="date" className="label mb-0 px-0">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-ios-blue" /> Date & Time *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setDate(getNowLocalDateTimeString())}
                  className="text-[11px] font-semibold text-ios-blue hover:bg-blue-50 bg-ios-blue/10 px-2 py-0.5 rounded-full transition-colors"
                >
                  Now
                </button>
              </div>
              <input
                id="date"
                type="datetime-local"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>
        </div>

        {/* Attendee Selection Card */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-primary flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              Select Attendees
            </h2>
            <div className="flex gap-2">
              <button type="button" onClick={selectAll} className="text-xs text-accent font-semibold hover:underline">
                All
              </button>
              <span className="text-gray-300">|</span>
              <button type="button" onClick={clearAll} className="text-xs text-gray-500 font-semibold hover:underline">
                None
              </button>
            </div>
          </div>

          {/* Count badge */}
          <div className="mb-3 flex items-center gap-2">
            <span className={cn(
              'badge',
              selectedIds.size > 0 ? 'badge-settled' : 'badge-pending'
            )}>
              {selectedIds.size} selected
            </span>
          </div>

          <div className="space-y-2">
            {members.map(member => {
              const selected = selectedIds.has(member.id)
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleAttendee(member.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
                    selected
                      ? 'border-accent bg-accent-light'
                      : 'border-border bg-white hover:border-gray-300'
                  )}
                  id={`attendee-${member.id}`}
                >
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0',
                    selected ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600'
                  )}>
                    {selected ? <Check className="w-4 h-4" /> : getInitials(member.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('font-medium text-sm', selected ? 'text-accent-foreground' : 'text-primary')}>
                      {member.name}
                    </p>
                  </div>
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    selected ? 'border-accent bg-accent' : 'border-gray-300'
                  )}>
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending || selectedIds.size === 0}
          className="btn-primary w-full flex items-center justify-center gap-2"
          id="create-meeting-submit"
        >
          {isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Create Meeting
            </>
          )}
        </button>
      </form>
    </div>
  )
}
