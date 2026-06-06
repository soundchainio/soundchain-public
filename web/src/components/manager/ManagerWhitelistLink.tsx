import { useState } from 'react'
import { Lock, Copy, Check, ArrowRight, Share2 } from 'lucide-react'

// The booking escrow's OWN shareable URL — the "whitelist link". A pro shares it
// anywhere; a promoter who opens it lands straight on the on-chain booking escrow
// (?book=1 deep-link auto-opens the deposit template). The on-chain deposit is what
// joins the whitelist + locks the date.
interface Props {
  url: string
  isOwner?: boolean
  displayName: string
  onOpen: () => void
}

export function ManagerWhitelistLink({ url, isOwner, displayName, onOpen }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  const share = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try { await (navigator as any).share({ title: `Book ${displayName}`, text: `Join ${displayName}'s booking whitelist on SoundChain`, url }); return } catch {}
    }
    copy()
  }

  return (
    <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">Booking whitelist link</h3>
        <span className="ml-auto text-[10px] text-emerald-300/80">on-chain escrow</span>
      </div>
      <p className="text-[11px] text-gray-400 mb-2.5">
        {isOwner
          ? 'Share this link anywhere — promoters who open it land straight on your on-chain booking escrow to deposit and lock a date.'
          : `Open ${displayName}'s on-chain booking escrow — deposit to join the whitelist and lock your date.`}
      </p>

      <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-2">
        <span className="flex-1 truncate font-mono text-[11px] text-emerald-300">{url}</span>
        <button onClick={copy} className="rounded p-1 text-gray-400 hover:text-white" title="Copy link">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <button onClick={share} className="rounded p-1 text-gray-400 hover:text-white" title="Share link">
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        onClick={onOpen}
        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
      >
        <Lock className="w-4 h-4" /> {isOwner ? 'Preview booking escrow' : 'Join the whitelist — deposit to book'} <ArrowRight className="w-4 h-4" />
      </button>
    </section>
  )
}

export default ManagerWhitelistLink
