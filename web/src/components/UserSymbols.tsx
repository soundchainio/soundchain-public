/**
 * UserSymbols — on-chain achievement markers next to usernames
 *
 * Frank: "badges are too law enforcement. symbols."
 * Frank: "size them to match the other attendance poap badge and gold logo"
 * Frank: "hover if tapped on the symbols have a mini micro hover modal with info"
 *
 * ✓ Blue checkmark — verified account (admin approved)
 * ✦ Gold — on-chain NFT owner
 * ◆ Silver/Cyan — creator (earns royalties forever)
 * ⟐ Neon Green — airdrop recipient
 * 🏆 Gold SoundChain logo — admin/founder POAP (furdA1/jeremy/tito)
 */

import { useState, useRef, useEffect } from 'react'
import { SoundchainGoldLogo } from 'icons/SoundchainGoldLogo'

export const ADMIN_HANDLES = ['furdA1', 'jeremy_soundchain', 'tito']

interface UserSymbolsProps {
  handle?: string
  verified?: boolean
  isNftOwner?: boolean
  isCreator?: boolean
  isAirdropRecipient?: boolean
  teamMember?: boolean
  compact?: boolean // smaller for comments
  showFounder?: boolean // render the gold founder logo (true by default)
}

function SymbolTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!show) return
    const timer = setTimeout(() => setShow(false), 2500)
    return () => clearTimeout(timer)
  }, [show])

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onClick={(e) => { e.stopPropagation(); setShow(!show) }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-black/95 border border-white/20 text-[9px] text-white whitespace-nowrap z-50 shadow-lg shadow-black/50 pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-black/95" />
        </span>
      )}
    </span>
  )
}

export function UserSymbols({
  handle,
  verified,
  isNftOwner,
  isCreator,
  isAirdropRecipient,
  teamMember,
  compact = false,
  showFounder = true,
}: UserSymbolsProps) {
  const isAdmin = handle && ADMIN_HANDLES.includes(handle)
  const s = compact ? 16 : 20 // match gold logo + attendance badge size

  return (
    <span className="inline-flex items-center gap-0.5">
      {/* Admin/Founder POAP — the real gold SoundChain logo (furdA1/jeremy/tito) */}
      {isAdmin && showFounder && (
        <SymbolTooltip text="SoundChain Founder">
          <span
            className="inline-flex items-center justify-center cursor-pointer"
            style={{ filter: 'drop-shadow(0 0 5px rgba(255,224,130,0.7))' }}
          >
            <SoundchainGoldLogo width={s} height={s} aria-label="SoundChain Founder" />
          </span>
        </SymbolTooltip>
      )}

      {/* Blue checkmark — verified */}
      {verified && (
        <SymbolTooltip text="Verified Account">
          <span
            className="text-blue-400 cursor-pointer"
            style={{ filter: 'drop-shadow(0 0 3px rgba(96,165,250,0.5))', fontSize: compact ? '14px' : '18px' }}
          >
            ✓
          </span>
        </SymbolTooltip>
      )}

      {/* Gold — on-chain NFT owner — glowing diamond */}
      {isNftOwner && (
        <SymbolTooltip text="NFT Owner — holds on-chain assets">
          <span className="inline-flex flex-shrink-0 cursor-pointer" style={{ filter: 'drop-shadow(0 0 4px rgba(250,204,21,0.7))' }}>
            <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
              <path d="M8 1L14 6L8 15L2 6L8 1Z" fill="url(#goldGrad)" stroke="#facc15" strokeWidth="0.5" />
              <path d="M8 1L14 6L8 7L2 6L8 1Z" fill="rgba(255,255,255,0.3)" />
              <defs><linearGradient id="goldGrad" x1="8" y1="1" x2="8" y2="15"><stop stopColor="#fde047"/><stop offset="1" stopColor="#f59e0b"/></linearGradient></defs>
            </svg>
          </span>
        </SymbolTooltip>
      )}

      {/* Cyan — creator (earns royalties) — glowing hexagon */}
      {isCreator && (
        <SymbolTooltip text="Creator — earns royalties forever">
          <span className="inline-flex flex-shrink-0 cursor-pointer" style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.6))' }}>
            <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
              <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" fill="url(#cyanGrad)" stroke="#22d3ee" strokeWidth="0.5" />
              <polygon points="8,4 11,6 11,10 8,12 5,10 5,6" fill="rgba(255,255,255,0.15)" />
              <defs><linearGradient id="cyanGrad" x1="8" y1="1" x2="8" y2="15"><stop stopColor="#22d3ee"/><stop offset="1" stopColor="#0891b2"/></linearGradient></defs>
            </svg>
          </span>
        </SymbolTooltip>
      )}

      {/* Neon Green — airdrop recipient — glowing bolt */}
      {isAirdropRecipient && (
        <SymbolTooltip text="Airdrop Recipient — received token distribution">
          <span className="inline-flex flex-shrink-0 cursor-pointer" style={{ filter: 'drop-shadow(0 0 4px rgba(74,222,128,0.7))' }}>
            <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
              <path d="M9 1L4 9H7.5L6.5 15L12 7H8.5L9 1Z" fill="url(#greenGrad)" stroke="#4ade80" strokeWidth="0.5" />
              <defs><linearGradient id="greenGrad" x1="8" y1="1" x2="8" y2="15"><stop stopColor="#4ade80"/><stop offset="1" stopColor="#16a34a"/></linearGradient></defs>
            </svg>
          </span>
        </SymbolTooltip>
      )}

      {/* Purple hexagon — team member */}
      {teamMember && !isAdmin && (
        <SymbolTooltip text="SoundChain Team Member">
          <span className="inline-flex flex-shrink-0 cursor-pointer" style={{ filter: 'drop-shadow(0 0 3px rgba(168,85,247,0.6))' }}>
            <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
              <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" fill="url(#purpGrad)" stroke="#a855f7" strokeWidth="0.5" />
              <defs><linearGradient id="purpGrad" x1="8" y1="1" x2="8" y2="15"><stop stopColor="#a855f7"/><stop offset="1" stopColor="#7c3aed"/></linearGradient></defs>
            </svg>
          </span>
        </SymbolTooltip>
      )}
    </span>
  )
}

/**
 * Derive symbols from profile data (no on-chain call needed for basic display).
 * Full on-chain verification happens via poap_agent in background.
 */
export function deriveSymbols(profile: any) {
  return {
    handle: profile?.userHandle,
    verified: profile?.verified === true,
    isNftOwner: (profile?.tracksCount || 0) > 0,
    isCreator: (profile?.tracksCount || 0) > 0,
    isAirdropRecipient: false, // needs on-chain scan
    teamMember: profile?.teamMember === true,
  }
}
