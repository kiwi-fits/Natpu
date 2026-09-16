import Decimal from 'decimal.js'

// Configure Decimal for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN })

export type ExpenseInput = {
  userId: string
  amount: number | string | Decimal
}

export type ParticipantSummary = {
  userId: string
  amountPaid: Decimal
  equalShare: Decimal
  difference: Decimal
  status: 'RECEIVER' | 'PAYER' | 'SETTLED'
}

export type MeetingSummary = {
  totalExpense: Decimal
  attendeeCount: number
  equalShare: Decimal
  participants: ParticipantSummary[]
  totalOwed: Decimal
  totalToReceive: Decimal
}

export type SettlementRecord = {
  userId: string
  amountOwed: Decimal
}

/**
 * Calculate the total expense from a list of expense inputs.
 * Uses Decimal arithmetic to avoid floating-point errors.
 */
export function calculateMeetingTotal(expenses: ExpenseInput[]): Decimal {
  return expenses.reduce(
    (sum, exp) => sum.plus(new Decimal(exp.amount)),
    new Decimal(0)
  )
}

/**
 * Calculate the equal share per person.
 * Rounds to 2 decimal places using banker's rounding.
 */
export function calculateEqualShare(total: Decimal, attendeeCount: number): Decimal {
  if (attendeeCount <= 0) return new Decimal(0)
  return total.dividedBy(attendeeCount).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN)
}

/**
 * Calculate how much a person paid vs their share.
 * Positive = receiver, Negative = payer, Zero = settled.
 */
export function calculateParticipantDifference(paid: Decimal, share: Decimal): Decimal {
  return paid.minus(share).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN)
}

/**
 * Calculate the full meeting summary for all attendees.
 * Handles rounding remainder distribution.
 */
export function calculateMeetingSummary(expenses: ExpenseInput[]): MeetingSummary {
  const attendeeCount = expenses.length

  if (attendeeCount === 0) {
    return {
      totalExpense: new Decimal(0),
      attendeeCount: 0,
      equalShare: new Decimal(0),
      participants: [],
      totalOwed: new Decimal(0),
      totalToReceive: new Decimal(0),
    }
  }

  const totalExpense = calculateMeetingTotal(expenses)

  // Calculate base equal share (rounded down to 2dp)
  const baseShare = totalExpense.dividedBy(attendeeCount).toDecimalPlaces(2, Decimal.ROUND_DOWN)
  const totalWithBaseShare = baseShare.times(attendeeCount)
  // Remainder in cents (as a Decimal)
  const remainder = totalExpense.minus(totalWithBaseShare).toDecimalPlaces(2)
  // Number of people who get +0.01 extra
  const extraPennies = remainder.times(100).toDecimalPlaces(0).toNumber()

  const equalShare = totalExpense.dividedBy(attendeeCount).toDecimalPlaces(2)

  const participants: ParticipantSummary[] = expenses.map((exp, index) => {
    const amountPaid = new Decimal(exp.amount)
    // First `extraPennies` people get baseShare + 0.01
    const share = index < extraPennies
      ? baseShare.plus(new Decimal('0.01'))
      : baseShare
    const difference = calculateParticipantDifference(amountPaid, share)

    let status: 'RECEIVER' | 'PAYER' | 'SETTLED'
    if (difference.greaterThan(0)) {
      status = 'RECEIVER'
    } else if (difference.lessThan(0)) {
      status = 'PAYER'
    } else {
      status = 'SETTLED'
    }

    return {
      userId: exp.userId,
      amountPaid,
      equalShare: share,
      difference,
      status,
    }
  })

  const totalOwed = participants
    .filter(p => p.status === 'PAYER')
    .reduce((sum, p) => sum.plus(p.difference.abs()), new Decimal(0))

  const totalToReceive = participants
    .filter(p => p.status === 'RECEIVER')
    .reduce((sum, p) => sum.plus(p.difference), new Decimal(0))

  return {
    totalExpense,
    attendeeCount,
    equalShare,
    participants,
    totalOwed,
    totalToReceive,
  }
}

/**
 * Calculate settlement records — only for people who owe money (PAYER).
 * Receivers and settled people do NOT get settlement records.
 */
export function calculateSettlements(expenses: ExpenseInput[]): SettlementRecord[] {
  const summary = calculateMeetingSummary(expenses)
  return summary.participants
    .filter(p => p.status === 'PAYER')
    .map(p => ({
      userId: p.userId,
      amountOwed: p.difference.abs(),
    }))
}

/**
 * Format a Decimal amount as a currency string (LKR).
 */
export function formatCurrency(amount: Decimal | number | string): string {
  const d = new Decimal(amount)
  return `Rs. ${d.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

/**
 * Check if the settlement totals balance (owed === to receive).
 * Small rounding tolerance of 0.02 allowed.
 */
export function validateSettlementBalance(summary: MeetingSummary): boolean {
  const diff = summary.totalOwed.minus(summary.totalToReceive).abs()
  return diff.lessThanOrEqualTo(new Decimal('0.02'))
}
