import { z } from 'zod'

export const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  date: z.string().min(1, 'Date is required'),
  location: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  attendeeIds: z.array(z.string()).min(1, 'At least one attendee must be selected'),
})

export const updateMeetingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  date: z.string().min(1, 'Date is required'),
  location: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
})

export const updateAttendanceSchema = z.object({
  meetingId: z.string().min(1),
  attendeeIds: z.array(z.string()).min(1, 'At least one attendee must be selected'),
})

export const upsertExpenseSchema = z.object({
  meetingId: z.string().min(1),
  amount: z
    .string()
    .refine(val => {
      const n = parseFloat(val)
      return !isNaN(n) && isFinite(n) && n >= 0
    }, 'Amount must be a non-negative number')
    .transform(val => parseFloat(val).toString()),
})

export const markSettledSchema = z.object({
  settlementId: z.string().min(1),
  actualAmount: z
    .string()
    .refine(val => {
      const n = parseFloat(val)
      return !isNaN(n) && isFinite(n) && n >= 0
    }, 'Amount must be a non-negative number'),
  note: z.string().max(500).optional(),
})

export const bankDetailsSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required').max(100),
  accountName: z.string().min(1, 'Account name is required').max(100),
  accountNumber: z.string().min(1, 'Account number is required').max(50),
  branch: z.string().max(100).optional(),
})

export const createMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const updateMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().max(20).optional(),
})

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>
export type UpsertExpenseInput = z.infer<typeof upsertExpenseSchema>
export type MarkSettledInput = z.infer<typeof markSettledSchema>
export type BankDetailsInput = z.infer<typeof bankDetailsSchema>
export type CreateMemberInput = z.infer<typeof createMemberSchema>
