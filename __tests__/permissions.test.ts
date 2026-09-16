import { adminUpdateExpense } from '../actions/expenses'
import { markSettled } from '../actions/settlements'

// Mock the auth helpers
jest.mock('../lib/auth/helpers', () => ({
  requireAuth: jest.fn(),
  requireAdmin: jest.fn(),
}))

import { requireAuth, requireAdmin } from '../lib/auth/helpers'

describe('Permission Checks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('MEMBER CANNOT EDIT OTHER MEMBERS EXPENSE', async () => {
    // If a member calls adminUpdateExpense, requireAdmin will throw
    ;(requireAdmin as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'))

    const result = await adminUpdateExpense('meeting-1', 'user-b', '500')
    expect(result).toEqual({ success: false, error: "Only admins can edit other members' expenses." })
  })

  it('MEMBER CANNOT MARK PAYMENT SETTLED', async () => {
    // If a member calls markSettled, requireAdmin will throw
    ;(requireAdmin as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'))

    const formData = new FormData()
    formData.append('settlementId', 'set-1')
    formData.append('actualAmount', '1000')

    const result = await markSettled(formData)
    expect(result).toEqual({ success: false, error: 'Only admins can mark payments as settled.' })
  })
})
