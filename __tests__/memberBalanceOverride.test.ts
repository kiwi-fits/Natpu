describe('Member Balance Direct Overrides & WhatsApp Formatting', () => {
  function formatAmount(amount: number): string {
    return `Rs. ${Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  }

  function resolveMemberBalance(member: {
    id: string
    name: string
    calculatedNet: number
    customBalance?: number | null
  }) {
    let netBalance = member.calculatedNet
    let pendingToPay = 0
    let pendingToReceive = 0

    if (member.customBalance !== null && member.customBalance !== undefined) {
      netBalance = member.customBalance
      if (netBalance < 0) {
        pendingToPay = Math.abs(netBalance)
        pendingToReceive = 0
      } else if (netBalance > 0) {
        pendingToReceive = netBalance
        pendingToPay = 0
      } else {
        pendingToPay = 0
        pendingToReceive = 0
      }
    } else {
      if (netBalance < 0) pendingToPay = Math.abs(netBalance)
      if (netBalance > 0) pendingToReceive = netBalance
    }

    return {
      id: member.id,
      name: member.name,
      netBalance,
      pendingToPay,
      pendingToReceive,
    }
  }

  function generateWhatsAppMessageLines(
    members: Array<{ name: string; netBalance: number }>,
    dateStr: string,
    shareUrl: string
  ): string[] {
    const lines: string[] = []
    lines.push(`Date: ${dateStr}`)
    lines.push('')

    const unsettled = members
      .filter(m => Math.abs(m.netBalance) >= 0.01)
      .sort((a, b) => a.netBalance - b.netBalance)

    if (unsettled.length > 0) {
      unsettled.forEach(m => {
        const formatted = formatAmount(m.netBalance)
        if (m.netBalance < 0) {
          lines.push(`${m.name}: ${formatted}`)
        } else {
          lines.push(`${m.name}: (${formatted})`)
        }
      })
    } else {
      lines.push('All members are settled up!')
    }

    lines.push('')
    lines.push(shareUrl)
    return lines
  }

  it('directly sets balance to 2000 (Owes) without altering other members', () => {
    const members = [
      { id: '1', name: 'Steev', calculatedNet: -1000, customBalance: -2000 },
      { id: '2', name: 'Police', calculatedNet: -758, customBalance: null },
      { id: '3', name: 'Ajith', calculatedNet: 47.5, customBalance: null },
    ]

    const resolved = members.map(resolveMemberBalance)

    // Steev should have -2000 (Owes 2000)
    expect(resolved[0].netBalance).toBe(-2000)
    expect(resolved[0].pendingToPay).toBe(2000)

    // Police and Ajith must be COMPLETELY unaffected
    expect(resolved[1].netBalance).toBe(-758)
    expect(resolved[1].pendingToPay).toBe(758)
    expect(resolved[2].netBalance).toBe(47.5)
    expect(resolved[2].pendingToReceive).toBe(47.5)
  })

  it('directly sets balance to (2000) (Gets back) without altering other members', () => {
    const members = [
      { id: '1', name: 'Thanu', calculatedNet: -500, customBalance: 2000 },
      { id: '2', name: 'Police', calculatedNet: -758, customBalance: null },
    ]

    const resolved = members.map(resolveMemberBalance)

    // Thanu should have +2000 (Gets back 2000)
    expect(resolved[0].netBalance).toBe(2000)
    expect(resolved[0].pendingToReceive).toBe(2000)
    expect(resolved[0].pendingToPay).toBe(0)

    // Police remains unchanged
    expect(resolved[1].netBalance).toBe(-758)
  })

  it('formats WhatsApp message with (Rs. X) for Gets back and Rs. X for Owes', () => {
    const members = [
      { name: 'Steev', netBalance: -6306 },
      { name: 'Police', netBalance: -758 },
      { name: 'Ajith', netBalance: 47.5 },
      { name: 'Thanu', netBalance: 6845.5 },
    ]

    const lines = generateWhatsAppMessageLines(
      members,
      '18 Oct 2026',
      'https://natpu.fits-shop.workers.dev/share/balances'
    )

    expect(lines).toContain('Steev: Rs. 6,306.00')
    expect(lines).toContain('Police: Rs. 758.00')
    expect(lines).toContain('Ajith: (Rs. 47.50)')
    expect(lines).toContain('Thanu: (Rs. 6,845.50)')
  })
})
