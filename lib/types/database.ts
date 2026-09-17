export type Role = 'ADMIN' | 'MEMBER'
export const Role = {
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const

export type UserStatus = 'ACTIVE' | 'INACTIVE'
export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

export type MeetingStatus = 'OPEN' | 'CALCULATED' | 'SETTLED'
export const MeetingStatus = {
  OPEN: 'OPEN',
  CALCULATED: 'CALCULATED',
  SETTLED: 'SETTLED',
} as const

export type PaymentStatus = 'PENDING' | 'SUBMITTED' | 'SETTLED'
export const PaymentStatus = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  SETTLED: 'SETTLED',
} as const
