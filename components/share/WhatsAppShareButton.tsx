'use client'

import { MessageCircle } from 'lucide-react'

type MemberBalance = {
  name: string
  netBalance: number
  pendingToPay?: number
}

interface WhatsAppShareButtonProps {
  memberBalances?: MemberBalance[]
  totalSpend?: number
}

export default function WhatsAppShareButton({
  memberBalances = [],
  totalSpend,
}: WhatsAppShareButtonProps) {
  function formatAmount(amount: number): string {
    return `Rs. ${Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  }

  function generateWhatsAppMessage(shareUrl: string): string {
    const lines: string[] = []

    // Professional Header
    lines.push('🧾 *NATPU • GROUP EXPENSE STATEMENT*')
    lines.push('────────────────────────')

    const now = new Date()
    const dateFormatted = now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    lines.push(`📅 *Date:* ${dateFormatted}`)

    if (totalSpend !== undefined && totalSpend > 0) {
      lines.push(`💰 *Total Group Spend:* ${formatAmount(totalSpend)}`)
    }
    lines.push('')

    const toPay = memberBalances.filter(m => m.netBalance < 0)
    const toReceive = memberBalances.filter(m => m.netBalance > 0)
    const settled = memberBalances.filter(m => m.netBalance === 0)

    // Outstanding Payments (Members who owe)
    if (toPay.length > 0) {
      const totalOutstanding = toPay.reduce((sum, m) => sum + Math.abs(m.netBalance), 0)
      lines.push('🔴 *PENDING SETTLEMENT (TO PAY)*')
      toPay.forEach(m => {
        lines.push(`  • *${m.name}*: ${formatAmount(m.netBalance)}`)
      })
      lines.push(`  ↳ _Total to collect:_ ${formatAmount(totalOutstanding)}`)
      lines.push('')
    }

    // Credits Due (Members who overpaid)
    if (toReceive.length > 0) {
      lines.push('🟢 *RECEIVABLE CREDITS (TO RECEIVE)*')
      toReceive.forEach(m => {
        lines.push(`  • *${m.name}*: +${formatAmount(m.netBalance)}`)
      })
      lines.push('')
    }

    // Settled Members
    if (settled.length > 0) {
      lines.push('✅ *SETTLED & UP-TO-DATE*')
      const settledNames = settled.map(m => m.name).join(', ')
      lines.push(`  • ${settledNames}`)
      lines.push('')
    }

    // Footer & Call to Action
    lines.push('────────────────────────')
    lines.push('📊 *Itemized Breakdown & Bank Details:*')
    lines.push(shareUrl)
    lines.push('')
    lines.push('_Please review itemized calculations and settle pending amounts._')

    return lines.join('\n')
  }

  function handleWhatsAppShare() {
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/share/balances` : ''
    const message = generateWhatsAppMessage(shareUrl)
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
  }

  return (
    <button
      onClick={handleWhatsAppShare}
      className="flex-1 h-12 flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-[14px] font-bold text-sm transition-all hover:bg-[#20bd5a] active:scale-[0.97] shadow-sm"
      id="whatsapp-share-btn"
      title="Share Statement via WhatsApp"
    >
      <MessageCircle className="w-4.5 h-4.5" />
      Share
    </button>
  )
}


