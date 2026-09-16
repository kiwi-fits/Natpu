import {
  calculateMeetingSummary,
  calculateSettlements,
  validateSettlementBalance,
  ExpenseInput
} from '../lib/calculations/meeting'
import Decimal from 'decimal.js'

describe('Meeting Calculations', () => {
  it('should calculate an equal split correctly (Spec Case 1)', () => {
    // 8 attendees, total 8000
    const expenses: ExpenseInput[] = [
      { userId: 'A', amount: 3000 },
      { userId: 'B', amount: 1500 },
      { userId: 'C', amount: 500 },
      { userId: 'D', amount: 2000 },
      { userId: 'E', amount: 1000 },
      { userId: 'F', amount: 0 },
      { userId: 'G', amount: 0 },
      { userId: 'H', amount: 0 },
    ]

    const summary = calculateMeetingSummary(expenses)

    expect(summary.totalExpense.toString()).toBe('8000')
    expect(summary.equalShare.toString()).toBe('1000')

    const pA = summary.participants.find(p => p.userId === 'A')!
    expect(pA.status).toBe('RECEIVER')
    expect(pA.difference.toString()).toBe('2000')

    const pC = summary.participants.find(p => p.userId === 'C')!
    expect(pC.status).toBe('PAYER')
    expect(pC.difference.toString()).toBe('-500')

    const pE = summary.participants.find(p => p.userId === 'E')!
    expect(pE.status).toBe('SETTLED')
    expect(pE.difference.toString()).toBe('0')

    const pF = summary.participants.find(p => p.userId === 'F')!
    expect(pF.status).toBe('PAYER')
    expect(pF.difference.toString()).toBe('-1000')

    expect(summary.totalOwed.toString()).toBe('3500')
    expect(summary.totalToReceive.toString()).toBe('3500')
    expect(validateSettlementBalance(summary)).toBe(true)

    const settlements = calculateSettlements(expenses)
    expect(settlements.length).toBe(4) // C, F, G, H
    expect(settlements.find(s => s.userId === 'C')!.amountOwed.toString()).toBe('500')
    expect(settlements.find(s => s.userId === 'F')!.amountOwed.toString()).toBe('1000')
  })

  it('should handle one attendee correctly', () => {
    const expenses: ExpenseInput[] = [
      { userId: 'A', amount: 2000 }
    ]

    const summary = calculateMeetingSummary(expenses)
    expect(summary.totalExpense.toString()).toBe('2000')
    expect(summary.equalShare.toString()).toBe('2000')
    expect(summary.participants[0].status).toBe('SETTLED')
    expect(summary.participants[0].difference.toString()).toBe('0')

    const settlements = calculateSettlements(expenses)
    expect(settlements.length).toBe(0)
  })

  it('should handle zero spending', () => {
    const expenses: ExpenseInput[] = [
      { userId: 'A', amount: 0 },
      { userId: 'B', amount: 0 },
    ]

    const summary = calculateMeetingSummary(expenses)
    expect(summary.totalExpense.toString()).toBe('0')
    expect(summary.equalShare.toString()).toBe('0')
    expect(summary.participants.every(p => p.status === 'SETTLED')).toBe(true)
    
    const settlements = calculateSettlements(expenses)
    expect(settlements.length).toBe(0)
  })

  it('should handle rounding safely (Spec Case 3)', () => {
    // 3 attendees, total 10000
    const expenses: ExpenseInput[] = [
      { userId: 'A', amount: 3333 },
      { userId: 'B', amount: 3333 },
      { userId: 'C', amount: 3334 },
    ]

    const summary = calculateMeetingSummary(expenses)
    expect(summary.totalExpense.toString()).toBe('10000')
    
    // Base share is 3333.33, remainder is 0.01, so A gets 3333.34, B and C get 3333.33
    const pA = summary.participants.find(p => p.userId === 'A')!
    expect(pA.equalShare.toString()).toBe('3333.34')
    expect(pA.difference.toString()).toBe('-0.34') // Paid 3333, Share 3333.34 -> Owe 0.34

    const pB = summary.participants.find(p => p.userId === 'B')!
    expect(pB.equalShare.toString()).toBe('3333.33')
    expect(pB.difference.toString()).toBe('-0.33') // Paid 3333, Share 3333.33 -> Owe 0.33

    const pC = summary.participants.find(p => p.userId === 'C')!
    expect(pC.equalShare.toString()).toBe('3333.33')
    expect(pC.difference.toString()).toBe('0.67') // Paid 3334, Share 3333.33 -> Receive 0.67

    // Owed: A (0.34) + B (0.33) = 0.67
    // Receive: C (0.67)
    expect(summary.totalOwed.toString()).toBe('0.67')
    expect(summary.totalToReceive.toString()).toBe('0.67')
    expect(validateSettlementBalance(summary)).toBe(true)

    const settlements = calculateSettlements(expenses)
    expect(settlements.length).toBe(2) // A and B owe
    expect(settlements.find(s => s.userId === 'A')!.amountOwed.toString()).toBe('0.34')
    expect(settlements.find(s => s.userId === 'B')!.amountOwed.toString()).toBe('0.33')
  })
})
