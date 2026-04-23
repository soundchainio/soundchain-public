/**
 * UserSymbols — on-chain achievement markers next to usernames
 *
 * Frank: "badges are too law enforcement. symbols."
 *
 * ✓ Blue checkmark — verified account (admin approved)
 * ✦ Gold — on-chain NFT owner
 * ◆ Silver/Cyan — creator (earns royalties forever)
 * ⟐ Neon Green — airdrop recipient
 * 🏆 Gold SoundChain logo — admin/founder POAP (furdA1/jeremy/tito)
 */

const ADMIN_HANDLES = ['furdA1', 'jeremy_soundchain', 'tito']

interface UserSymbolsProps {
  handle?: string
  verified?: boolean
  isNftOwner?: boolean
  isCreator?: boolean
  isAirdropRecipient?: boolean
  teamMember?: boolean
  compact?: boolean // smaller for comments
}

export function UserSymbols({
  handle,
  verified,
  isNftOwner,
  isCreator,
  isAirdropRecipient,
  teamMember,
  compact = false,
}: UserSymbolsProps) {
  const isAdmin = handle && ADMIN_HANDLES.includes(handle)
  const size = compact ? 'text-[10px]' : 'text-xs'
  const s = compact ? 12 : 14 // SVG icon size

  return (
    <span className={`inline-flex items-center gap-0.5 ${size}`}>
      {/* Admin/Founder POAP — gold SoundChain logo */}
      {isAdmin && (
        <span
          className="inline-flex items-center justify-center"
          title="SoundChain Founder"
          style={{ filter: 'drop-shadow(0 0 4px rgba(250,204,21,0.6))' }}
        >
          <svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#facc15" />
            <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#000" fontWeight="bold">S</text>
          </svg>
        </span>
      )}

      {/* Blue checkmark — verified */}
      {verified && (
        <span
          className="text-blue-400"
          title="Verified"
          style={{ filter: 'drop-shadow(0 0 3px rgba(96,165,250,0.5))' }}
        >
          ✓
        </span>
      )}

      {/* Gold — on-chain NFT owner — glowing diamond */}
      {isNftOwner && (
        <span title="NFT Owner" className="inline-flex flex-shrink-0" style={{ filter: 'drop-shadow(0 0 4px rgba(250,204,21,0.7))' }}>
          <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14 6L8 15L2 6L8 1Z" fill="url(#goldGrad)" stroke="#facc15" strokeWidth="0.5" />
            <path d="M8 1L14 6L8 7L2 6L8 1Z" fill="rgba(255,255,255,0.3)" />
            <defs><linearGradient id="goldGrad" x1="8" y1="1" x2="8" y2="15"><stop stopColor="#fde047"/><stop offset="1" stopColor="#f59e0b"/></linearGradient></defs>
          </svg>
        </span>
      )}

      {/* Cyan — creator (earns royalties) — glowing hexagon */}
      {isCreator && (
        <span title="Creator — earns royalties forever" className="inline-flex flex-shrink-0" style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.6))' }}>
          <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
            <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" fill="url(#cyanGrad)" stroke="#22d3ee" strokeWidth="0.5" />
            <polygon points="8,4 11,6 11,10 8,12 5,10 5,6" fill="rgba(255,255,255,0.15)" />
            <defs><linearGradient id="cyanGrad" x1="8" y1="1" x2="8" y2="15"><stop stopColor="#22d3ee"/><stop offset="1" stopColor="#0891b2"/></linearGradient></defs>
          </svg>
        </span>
      )}

      {/* Neon Green — airdrop recipient — glowing bolt */}
      {isAirdropRecipient && (
        <span title="Airdrop Recipient" className="inline-flex flex-shrink-0" style={{ filter: 'drop-shadow(0 0 4px rgba(74,222,128,0.7))' }}>
          <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
            <path d="M9 1L4 9H7.5L6.5 15L12 7H8.5L9 1Z" fill="url(#greenGrad)" stroke="#4ade80" strokeWidth="0.5" />
            <defs><linearGradient id="greenGrad" x1="8" y1="1" x2="8" y2="15"><stop stopColor="#4ade80"/><stop offset="1" stopColor="#16a34a"/></linearGradient></defs>
          </svg>
        </span>
      )}

      {/* Purple hexagon — team member */}
      {teamMember && !isAdmin && (
        <span title="Team Member" className="inline-flex flex-shrink-0" style={{ filter: 'drop-shadow(0 0 3px rgba(168,85,247,0.6))' }}>
          <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
            <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" fill="url(#purpGrad)" stroke="#a855f7" strokeWidth="0.5" />
            <defs><linearGradient id="purpGrad" x1="8" y1="1" x2="8" y2="15"><stop stopColor="#a855f7"/><stop offset="1" stopColor="#7c3aed"/></linearGradient></defs>
          </svg>
        </span>
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
    isNftOwner: (profile?.tracksCount || 0) > 0, // has minted tracks = likely owner
    isCreator: (profile?.tracksCount || 0) > 0,
    isAirdropRecipient: false, // needs on-chain scan
    teamMember: profile?.teamMember === true,
  }
}
