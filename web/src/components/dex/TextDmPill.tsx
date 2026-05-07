import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { TextDmModal } from './TextDmModal'

interface TextDmPillProps {
  recipient: {
    profileId: string
    displayName: string
    handle: string
    avatar?: string | null
  }
  className?: string
}

// Compact "Text" pill that opens the TextDmModal compose sheet. Sits next to
// the existing Tip pill on profile views. Tap → modal → write → send →
// recipient gets in-app DM + Web Push + Nostr DM in parallel.
export const TextDmPill = ({ recipient, className }: TextDmPillProps) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 hover:border-cyan-400 hover:bg-cyan-500/25 text-cyan-300 hover:text-cyan-100 text-[11px] font-medium transition-colors ${className || ''}`}
        aria-label={`Text ${recipient.handle || recipient.displayName}`}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Text
      </button>
      <TextDmModal open={open} onClose={() => setOpen(false)} recipient={recipient} />
    </>
  )
}
