'use client'

import { MessageCircle } from 'lucide-react'

type MemberBalance = {
  name: string
  netBalance: number
  pendingToPay: number
}

export default function WhatsAppShareButton({ memberBalances = [] }: { memberBalances: MemberBalance[] }) {
  function formatAmount(amount: number): string {
    return `Rs. ${Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  }

  function generateWhatsAppMessage(shareUrl: string): string {
    const lines: string[] = []
    lines.push('💰 *Natpu — Member Balances*')
    lines.push('━━━━━━━━━━━━━━━━━━━━━')
    lines.push('')

    const toPay = memberBalances.filter(m => m.netBalance < 0)
    const toReceive = memberBalances.filter(m => m.netBalance > 0)
    const settled = memberBalances.filter(m => m.netBalance === 0)

    if (toPay.length > 0) {
      lines.push('🔴 *Borrow:*')
      toPay.forEach(m => {
        lines.push(`  • ${m.name}: ${formatAmount(m.netBalance)}`)
      })
      lines.push('')
    }

    if (toReceive.length > 0) {
      lines.push('🟢 *Give:*')
      toReceive.forEach(m => {
        lines.push(`  • ${m.name}: +${formatAmount(m.netBalance)}`)
      })
      lines.push('')
    }

    if (settled.length > 0) {
      lines.push('✅ *Settled:*')
      settled.forEach(m => {
        lines.push(`  • ${m.name}`)
      })
      lines.push('')
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━')
    lines.push(`📊 View full details: ${shareUrl}`)

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
      className="flex-1 h-12 flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-[14px] font-bold text-sm transition-all hover:bg-[#20bd5a] active:scale-[0.97]"
      id="whatsapp-share-btn"
    >
      <MessageCircle className="w-4.5 h-4.5" />
      Share
    </button>
  )
}

