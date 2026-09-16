'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export default function CopyButton({
  text,
  label = 'Copy',
  className = 'text-xs text-ios-blue font-semibold hover:underline',
}: {
  text: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={className}>
      {copied ? 'Copied!' : label}
    </button>
  )
}
