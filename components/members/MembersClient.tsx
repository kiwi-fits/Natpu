'use client'

import { useState, useTransition } from 'react'
import { createMember, createMembersBulk, updateMember, deactivateMember, reactivateMember } from '@/actions/members'
import { toast } from 'sonner'
import { Plus, X, UserX, UserCheck, MoreVertical, Pencil, Trash2, Users as UsersIcon } from 'lucide-react'
import { Role, UserStatus } from '@prisma/client'

type Member = {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
  status: UserStatus
  _count: { meetingAttendees: number }
}

const avatarColors = [
  'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-violet-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-orange-600', 'bg-indigo-600',
  'bg-teal-600', 'bg-fuchsia-600', 'bg-sky-600',
]

export default function MembersClient({
  members,
  currentUserId,
}: {
  members: Member[]
  currentUserId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [showAddModal, setShowAddModal] = useState(false)
  const [addMode, setAddMode] = useState<'SINGLE' | 'BULK'>('SINGLE')
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [editName, setEditName] = useState('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  // Form state: Single
  const [name, setName] = useState('')
  const [previousAmount, setPreviousAmount] = useState('')

  // Form state: Bulk
  const [bulkText, setBulkText] = useState('')
  const [bulkRows, setBulkRows] = useState<Array<{ name: string; previousAmount: string }>>([
    { name: '', previousAmount: '' },
    { name: '', previousAmount: '' },
    { name: '', previousAmount: '' },
  ])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please enter member name')
      return
    }

    const formData = new FormData()
    formData.append('name', name.trim())
    if (previousAmount) {
      formData.append('previousAmount', previousAmount)
    }

    startTransition(async () => {
      const result = await createMember(formData)
      if (result.success) {
        toast.success('Member added successfully!')
        setShowAddModal(false)
        setName('')
        setPreviousAmount('')
      } else {
        toast.error(result.error)
      }
    })
  }

  async function handleBulkCreate(e: React.FormEvent) {
    e.preventDefault()

    let membersToSubmit: Array<{ name: string; previousAmount?: number }> = []

    if (bulkText.trim()) {
      const rawNames = bulkText
        .split(/[\n,]+/)
        .map(n => n.trim())
        .filter(Boolean)

      membersToSubmit = rawNames.map(name => ({ name }))
    } else {
      membersToSubmit = bulkRows
        .filter(r => r.name.trim().length > 0)
        .map(r => ({
          name: r.name.trim(),
          previousAmount: r.previousAmount ? parseFloat(r.previousAmount) : 0,
        }))
    }

    if (membersToSubmit.length === 0) {
      toast.error('Please enter at least one member name')
      return
    }

    startTransition(async () => {
      const result = await createMembersBulk(membersToSubmit)
      if (result.success) {
        toast.success(`Successfully added ${result.data.count} members!`)
        setShowAddModal(false)
        setBulkText('')
        setBulkRows([
          { name: '', previousAmount: '' },
          { name: '', previousAmount: '' },
          { name: '', previousAmount: '' },
        ])
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleAddBulkRow() {
    setBulkRows(prev => [...prev, { name: '', previousAmount: '' }])
  }

  function handleRemoveBulkRow(index: number) {
    setBulkRows(prev => prev.filter((_, i) => i !== index))
  }

  function handleOpenEdit(member: Member) {
    setEditingMember(member)
    setEditName(member.name)
    setActiveMenu(null)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMember) return
    if (!editName.trim()) {
      toast.error('Please enter member name')
      return
    }

    const formData = new FormData()
    formData.append('id', editingMember.id)
    formData.append('name', editName.trim())

    startTransition(async () => {
      const result = await updateMember(formData)
      if (result.success) {
        toast.success('Name updated successfully!')
        setEditingMember(null)
        setEditName('')
      } else {
        toast.error(result.error)
      }
    })
  }

  async function handleDeactivate(userId: string) {
    setActiveMenu(null)
    startTransition(async () => {
      const result = await deactivateMember(userId)
      if (result.success) toast.success('Member deactivated')
      else toast.error(result.error)
    })
  }

  async function handleReactivate(userId: string) {
    setActiveMenu(null)
    startTransition(async () => {
      const result = await reactivateMember(userId)
      if (result.success) toast.success('Member reactivated')
      else toast.error(result.error)
    })
  }

  const activeMembers = members.filter(m => m.status === 'ACTIVE')
  const inactiveMembers = members.filter(m => m.status === 'INACTIVE')

  return (
    <div className="page-container pt-6 pb-6 font-outfit">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-ios-title2 font-bold text-primary tracking-tight">Members</h1>
          <p className="text-ios-footnote text-ios-gray mt-0.5">{activeMembers.length} active members</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-[14px]"
          id="add-member-btn"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* ─── Active Members List ─── */}
      <div className="mb-6 animate-slide-up">
        <p className="section-header">Active</p>
        <div className="ios-list">
          {activeMembers.map((member, index) => (
            <div
              key={member.id}
              className={`px-4 py-3.5 flex items-center justify-between ${
                index !== 0 ? 'border-t border-black/[0.06]' : ''
              }`}
            >
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
                  <p className="text-ios-caption1 text-ios-gray mt-0.5">
                    {member._count.meetingAttendees} {member._count.meetingAttendees === 1 ? 'meeting' : 'meetings'} attended
                  </p>
                </div>
              </div>

              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === member.id ? null : member.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray hover:bg-black/5 active:bg-black/10 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {activeMenu === member.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                    <div className="absolute right-0 top-9 w-36 bg-white rounded-xl shadow-lg border border-black/[0.08] z-20 overflow-hidden animate-scale-in">
                      <button
                        onClick={() => handleOpenEdit(member)}
                        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium text-primary hover:bg-black/5 border-b border-black/[0.06]"
                        id={`edit-${member.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5 text-ios-blue" />
                        Edit Name
                      </button>
                      {member.id !== currentUserId && (
                        <button
                          onClick={() => handleDeactivate(member.id)}
                          className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          id={`deactivate-${member.id}`}
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Deactivate
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Inactive Members ─── */}
      {inactiveMembers.length > 0 && (
        <div className="animate-slide-up mb-6">
          <p className="section-header">Inactive</p>
          <div className="ios-list opacity-60">
            {inactiveMembers.map((member, index) => (
              <div
                key={member.id}
                className={`px-4 py-3.5 flex items-center justify-between ${
                  index !== 0 ? 'border-t border-black/[0.06]' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-500 text-sm">{member.name}</p>
                    <p className="text-ios-caption1 text-ios-gray mt-0.5">Inactive</p>
                  </div>
                </div>
                <button
                  onClick={() => handleReactivate(member.id)}
                  className="text-xs text-green-600 font-semibold flex items-center gap-1 hover:text-green-700 transition-colors"
                  id={`reactivate-${member.id}`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Reactivate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── iOS Floating Add Member Modal ─── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-4"
          onClick={e => e.target === e.currentTarget && setShowAddModal(false)}
        >
          <div className="w-full max-w-md bg-white rounded-t-[28px] sm:rounded-3xl px-6 pt-6 pb-9 sm:pb-6 shadow-2xl animate-slide-up">
            {/* Grab handle for mobile */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-ios-title3 font-bold text-primary tracking-tight">Add Members</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-ios-lightGray text-ios-gray flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Mode Control */}
            <div className="flex bg-ios-lightGray p-1 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => setAddMode('SINGLE')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  addMode === 'SINGLE'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-ios-gray hover:text-primary'
                }`}
              >
                Single Member
              </button>
              <button
                type="button"
                onClick={() => setAddMode('BULK')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  addMode === 'BULK'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-ios-gray hover:text-primary'
                }`}
              >
                Bulk Add
              </button>
            </div>

            {addMode === 'SINGLE' ? (
              <form onSubmit={handleCreate} className="space-y-4">
                {/* Name Field */}
                <div>
                  <label className="label">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. John"
                    className="input"
                    required
                    autoFocus
                  />
                </div>

                {/* Previous Amount to Pay Field */}
                <div>
                  <label className="label">Previous Amount to Pay</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-semibold text-sm">
                      Rs.
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={previousAmount}
                      onChange={e => setPreviousAmount(e.target.value)}
                      placeholder="0.00"
                      className="input pl-11 font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-ios-gray mt-1 px-1">
                    Optional: If the member owes a previous pending amount.
                  </p>
                </div>

                {/* 1-Word Action Buttons */}
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary flex-1 py-3 rounded-[14px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary flex-1 py-3 rounded-[14px] flex items-center justify-center gap-2"
                    id="create-member-submit"
                  >
                    {isPending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Add'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBulkCreate} className="space-y-4">
                {/* Quick Paste Textarea */}
                <div>
                  <label className="label">Quick Paste Names</label>
                  <textarea
                    rows={2}
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder="Enter names separated by commas or lines (e.g. John, Alex, Sarah)"
                    className="input py-2 text-xs resize-none font-normal"
                  />
                  <p className="text-[11px] text-ios-gray mt-1 px-1">
                    Or fill out individual rows below:
                  </p>
                </div>

                {/* Dynamic Rows */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {bulkRows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Member ${idx + 1}`}
                        value={row.name}
                        onChange={e => {
                          const updated = [...bulkRows]
                          updated[idx].name = e.target.value
                          setBulkRows(updated)
                        }}
                        className="input text-xs flex-1 py-2"
                        disabled={!!bulkText.trim()}
                      />
                      <div className="relative w-28 flex-shrink-0">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400 font-semibold text-xs">
                          Rs.
                        </div>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          value={row.previousAmount}
                          onChange={e => {
                            const updated = [...bulkRows]
                            updated[idx].previousAmount = e.target.value
                            setBulkRows(updated)
                          }}
                          className="input pl-8 text-xs font-mono py-2"
                          disabled={!!bulkText.trim()}
                        />
                      </div>
                      {bulkRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBulkRow(idx)}
                          className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0 transition-colors"
                          disabled={!!bulkText.trim()}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleAddBulkRow}
                    disabled={!!bulkText.trim()}
                    className="text-xs text-ios-blue font-medium flex items-center gap-1 hover:underline disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                  {bulkText.trim() && (
                    <span className="text-[11px] text-ios-blue font-medium">Using quick paste</span>
                  )}
                </div>

                {/* 1-Word Action Buttons */}
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary flex-1 py-3 rounded-[14px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary flex-1 py-3 rounded-[14px] flex items-center justify-center gap-2"
                    id="create-bulk-member-submit"
                  >
                    {isPending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Add'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── iOS Floating Edit Member Modal ─── */}
      {editingMember && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-4"
          onClick={e => e.target === e.currentTarget && setEditingMember(null)}
        >
          <div className="w-full max-w-md bg-white rounded-t-[28px] sm:rounded-3xl px-6 pt-6 pb-9 sm:pb-6 shadow-2xl animate-slide-up">
            {/* Grab handle for mobile */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-ios-title3 font-bold text-primary tracking-tight">Edit Member Name</h3>
              <button
                onClick={() => setEditingMember(null)}
                className="w-8 h-8 rounded-full bg-ios-lightGray text-ios-gray flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Enter name"
                  className="input"
                  required
                  autoFocus
                />
              </div>

              {/* 1-Word Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="btn-secondary flex-1 py-3 rounded-[14px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary flex-1 py-3 rounded-[14px] flex items-center justify-center gap-2"
                  id="update-member-submit"
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
    </div>
  )
}
