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
  lastUpdatedDate?: string
}

export default function WhatsAppShareButton({
  memberBalances = [],
  lastUpdatedDate,
}: WhatsAppShareButtonProps) {
  function formatAmount(amount: number): string {
    return `Rs. ${Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  }

  function generateWhatsAppMessage(shareUrl: string): string {
    const lines: string[] = []

    const now = new Date()
    const dateFormatted = lastUpdatedDate || now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    lines.push(`*Date:* ${dateFormatted}`)
    lines.push('')

    // Only show members who have unsettled amounts
    const unsettled = memberBalances
      .filter(m => Math.abs(m.netBalance) >= 0.01)
      .sort((a, b) => a.netBalance - b.netBalance)

    if (unsettled.length > 0) {
      unsettled.forEach(m => {
        const formatted = formatAmount(m.netBalance)
        if (m.netBalance < 0) {
          // Admin has to borrow: show normally
          lines.push(`*${m.name}:* ${formatted}`)
        } else {
          // Admin has to give: show within brackets
          lines.push(`*${m.name}:* (${formatted})`)
        }
      })
    }

    lines.push('')
    lines.push(shareUrl)

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


