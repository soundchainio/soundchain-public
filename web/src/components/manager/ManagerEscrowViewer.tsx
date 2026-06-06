import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Lock, ShieldCheck, ArrowRight, CheckCircle2, CalendarCheck,
  HandCoins, Handshake, Music4, ChevronLeft, ChevronRight, UserRound,
} from 'lucide-react'

// Whitelist-escrow VIEWER — the booking "storefront". A swipeable slideshow walks a
// promoter through a real deal (a 0.15 ETH, 2-hour Friday local-bar set): the offer,
// BOTH parties agreeing on-chain, funds locking, and the auto-payout — then a step
// recap + the artist's proven payout history. SoundChain takes a flat 0.5% booking
// fee per escrow (see contracts/ManagerBookingEscrow.sol). Illustrative until real
// bookings flow through that contract; then `completions` is populated from chain.
interface Completion {
  venue: string
  date: string
  amount: string
  example?: boolean
}

interface Props {
  artistName: string
  artistAvatar?: string
  payoutAddress?: string
  completions?: Completion[]
}

// A LOCAL / up-and-coming DJ's calendar — modest, grassroots bookings (a 2-hour
// bar set, a happy hour, a house party). Real payouts scale with the artist's
// level; once bookings settle on-chain these are replaced by the artist's own.
const SAMPLE: Completion[] = [
  { venue: 'The Tap Room · Local Bar', date: 'Fri · this week', amount: '0.15 ETH', example: true },
  { venue: "Mara's Rooftop · Happy Hour", date: 'Last Sat', amount: '0.1 ETH', example: true },
  { venue: 'Apt 4B · House Party', date: '2 weeks ago', amount: '0.06 ETH', example: true },
  { venue: 'Corner Pub · Open Decks', date: 'Last month', amount: '0.04 ETH', example: true },
]

function PromoterAvatar() {
  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500/30 to-blue-600/30 border border-sky-400/40 flex items-center justify-center">
      <UserRound className="w-6 h-6 text-sky-300" />
    </div>
  )
}

function ArtistAvatar({ name, avatar }: { name: string; avatar?: string }) {
  return avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover border border-emerald-400/40" />
  ) : (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-200 font-bold">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export function ManagerEscrowViewer({ artistName, artistAvatar, payoutAddress, completions }: Props) {
  const list = completions && completions.length ? completions : SAMPLE

  // Live ETH→USD so the (crypto) amounts read in real money — a local DJ wants to
  // know 0.04 ETH ≈ $130. One fetch on mount; falls back to a recent estimate.
  const [ethUsd, setEthUsd] = useState<number | null>(null)
  useEffect(() => {
    let on = true
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (on && d?.ethereum?.usd) setEthUsd(d.ethereum.usd) })
      .catch(() => {})
    return () => { on = false }
  }, [])
  const RATE = ethUsd || 3300 // fallback estimate if the price fetch fails
  const ethNum = (s: string) => parseFloat(s) || 0 // "0.15 ETH" → 0.15
  const usd = (eth: number) => {
    const v = eth * RATE
    return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`
  }
  const usdPrecise = (eth: number) => {
    const v = eth * RATE
    return v < 10 ? `$${v.toFixed(2)}` : usd(eth)
  }
  const FEE_RATE = 0.005 // 0.5% SoundChain booking fee
  const feeEth = (eth: number) => eth * FEE_RATE
  // Tier formatter that scales to millions (a Coachella-tier headline fee).
  const usdTier = (eth: number) => {
    const v = eth * RATE
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
    if (v >= 1e3) return `$${Math.round(v / 1e3)}k`
    return `$${Math.round(v)}`
  }
  // The same escrow handles a local bar set or a festival headline worth millions.
  const TIERS = [
    { label: 'Local bar', eth: 0.15 },
    { label: 'Club night', eth: 2 },
    { label: 'Festival slot', eth: 60 },
    { label: 'Coachella-tier', eth: 1300 },
  ]

  // ── The storefront slideshow: the deal told as a 4-frame visual story ──
  const slides = [
    {
      key: 'offer',
      label: 'The Offer',
      bg: 'from-sky-900/60 via-blue-900/40 to-black',
      ring: 'border-sky-500/30',
      node: (
        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex items-center gap-3">
            <PromoterAvatar />
            <HandCoins className="w-5 h-5 text-sky-300" />
            <ArtistAvatar name={artistName} avatar={artistAvatar} />
          </div>
          <p className="text-3xl font-extrabold text-white tracking-tight">0.15 <span className="text-sky-300 text-xl align-middle">ETH</span></p>
          <p className="text-[11px] text-sky-200/70 -mt-1.5">≈ {usd(0.15)} USD</p>
          <p className="text-[11px] text-sky-100/80 leading-snug">A promoter offers <span className="text-white font-medium">{artistName}</span><br />a 2-hour set · local bar · Friday night</p>
        </div>
      ),
    },
    {
      key: 'agree',
      label: 'Both Parties Agree',
      bg: 'from-emerald-900/60 via-teal-900/40 to-black',
      ring: 'border-emerald-500/30',
      node: (
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex items-end gap-4">
            <div className="flex flex-col items-center gap-1">
              <PromoterAvatar />
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-1.5 py-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Agreed</span>
              <span className="text-[9px] text-gray-400">Promoter</span>
            </div>
            <Handshake className="w-7 h-7 text-emerald-300 mb-5 animate-pulse" />
            <div className="flex flex-col items-center gap-1">
              <ArtistAvatar name={artistName} avatar={artistAvatar} />
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-1.5 py-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Agreed</span>
              <span className="text-[9px] text-gray-400">{artistName}</span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-100/80 leading-snug">Both sign the terms on-chain.<br />No middleman, no handshake-and-hope.</p>
        </div>
      ),
    },
    {
      key: 'lock',
      label: 'Funds Locked',
      bg: 'from-indigo-900/60 via-violet-900/40 to-black',
      ring: 'border-violet-500/30',
      node: (
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-400/40 flex items-center justify-center">
            <Lock className="w-7 h-7 text-violet-300" />
          </div>
          <p className="text-base font-bold text-white">0.15 ETH <span className="text-violet-300 font-medium">(≈ {usd(0.15)})</span> locked in escrow</p>
          <p className="text-[11px] text-violet-100/80 leading-snug">Held by the contract — not us, not the artist.<br />Friday's date is whitelisted: no double-booking.</p>
        </div>
      ),
    },
    {
      key: 'paid',
      label: 'Performed & Paid',
      bg: 'from-emerald-900/60 via-green-900/40 to-black',
      ring: 'border-emerald-500/30',
      node: (
        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex items-center gap-2">
            <Music4 className="w-6 h-6 text-emerald-300" />
            <ArrowRight className="w-4 h-4 text-gray-500" />
            <CheckCircle2 className="w-7 h-7 text-emerald-300" />
          </div>
          <p className="text-base font-bold text-white">Set performed → auto-payout</p>
          <p className="text-[11px] text-emerald-100/80 leading-snug">Escrow releases <span className="text-emerald-300 font-semibold">0.15 ETH (≈ {usd(0.15)})</span> to {artistName}<br />(0.5% SoundChain booking fee). Refunds follow the agreed terms.</p>
        </div>
      ),
    },
  ]

  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef<number | null>(null)
  const go = useCallback((n: number) => setIdx((p) => (n + slides.length) % slides.length), [slides.length])

  // Auto-advance the storefront unless the promoter is interacting.
  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setIdx((p) => (p + 1) % slides.length), 3800)
    return () => clearInterval(id)
  }, [paused, slides.length])

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; setPaused(true) }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1))
    touchX.current = null
  }

  const steps = [
    { n: 1, t: 'Promoter deposits', d: 'Booking fee (0.15 ETH) is locked in the escrow contract — not held by us or the artist.' },
    { n: 2, t: 'Both parties agree', d: `The promoter and ${artistName} both sign the terms on-chain; Friday's slot is whitelisted so it can't be double-booked.` },
    { n: 3, t: 'Artist performs', d: 'The 2-hour set is played. Both sides are protected by the locked funds + agreed terms.' },
    { n: 4, t: 'Auto payout on completion', d: 'Escrow releases the fee to the artist minus a flat 0.5% SoundChain booking fee. Refunds follow the cancellation terms — no middleman decides.' },
  ]

  return (
    <section className="backdrop-blur-xl bg-black/60 border border-emerald-500/25 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-white">On-Chain Booking Escrow</h2>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
          <Lock className="w-3 h-3" /> ZetaChain · Omnichain
        </span>
      </div>

      {/* ── Storefront slideshow ── */}
      <div
        className="relative rounded-xl overflow-hidden border border-white/10 mb-3 select-none"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className={`relative bg-gradient-to-br ${slides[idx].bg} ${slides[idx].ring} border-0`}>
          <div className="flex items-center justify-between px-3 pt-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/60">{slides[idx].label}</span>
            <span className="text-[10px] text-white/40">{idx + 1}/{slides.length}</span>
          </div>
          <div className="min-h-[170px] flex items-center justify-center px-4 py-4">
            {slides[idx].node}
          </div>
        </div>

        {/* Arrows */}
        <button
          aria-label="Previous"
          onClick={() => go(idx - 1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white/80 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          aria-label="Next"
          onClick={() => go(idx + 1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white/80 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.key}
              aria-label={`Slide ${i + 1}`}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/30 hover:bg-white/50'}`}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        Example: a <span className="text-gray-200">2-hour set at a local bar</span> — 0.15 ETH (≈ {usd(0.15)}), Friday night. SoundChain takes a flat <span className="text-emerald-300">0.5%</span> booking fee; here's how the smart contract secures the deal for both sides.
      </p>

      {/* Fee transparency — what SoundChain's 0.5% actually costs, in ETH + USD */}
      <div className="flex items-center justify-between gap-2 mb-3 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] px-3 py-2">
        <span className="text-[11px] text-gray-400">SoundChain booking fee · <span className="text-emerald-300">0.5%</span></span>
        <span className="text-[11px] text-right">
          <span className="text-emerald-300 font-medium">{feeEth(0.15).toFixed(5)} ETH</span>
          <span className="text-gray-500"> ≈ {usdPrecise(feeEth(0.15))}</span>
          <span className="text-gray-600"> on a 0.15 ETH booking</span>
        </span>
      </div>

      <ol className="space-y-2.5 mb-4">
        {steps.map((s) => (
          <li key={s.n} className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center">
              {s.n}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-gray-100 flex items-center gap-1.5">
                {s.t}
                {s.n < 4 && <ArrowRight className="w-3 h-3 text-gray-600" />}
              </p>
              <p className="text-[11px] text-gray-500 leading-snug">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="border-t border-white/10 pt-3">
        <div className="flex items-center gap-1.5 mb-2">
          <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
          <h3 className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Recent Completions</h3>
          <span className="ml-auto text-[9px] text-gray-500">take-home · net of 0.5% fee</span>
        </div>
        <div className="space-y-1.5">
          {list.slice(0, 4).map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-gray-200 truncate">{c.venue}</span>
              <span className="text-gray-500">· {c.date}</span>
              <span className="ml-auto whitespace-nowrap">
                <span className="text-emerald-300 font-medium">{c.amount}</span>
                <span className="text-gray-500"> · {usd(ethNum(c.amount))} · paid</span>
              </span>
            </div>
          ))}
        </div>
        {list[0]?.example && (
          <p className="text-[10px] text-gray-600 mt-2 italic">These are the artist's take-home payouts — what landed after SoundChain's 0.5% fee. Sample preview for a local artist; payouts scale with the artist's level, and real completions post here as bookings settle on-chain.</p>
        )}
      </div>

      {/* Scales to any tier — same escrow, local bar set → Coachella-tier headline (millions) */}
      <div className="border-t border-white/10 pt-3 mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Scales to any tier</p>
        <div className="grid grid-cols-4 gap-1.5">
          {TIERS.map((tt, i) => (
            <div key={tt.label} className={`rounded-lg border p-2 text-center ${i === TIERS.length - 1 ? 'border-fuchsia-500/30 bg-fuchsia-500/[0.06]' : 'border-white/10 bg-white/[0.02]'}`}>
              <p className={`text-[12px] font-bold ${i === TIERS.length - 1 ? 'text-fuchsia-300' : 'text-gray-200'}`}>{usdTier(tt.eth)}</p>
              <p className="text-[9px] text-gray-500 mt-0.5">{tt.eth} ETH</p>
              <p className={`text-[9px] mt-0.5 leading-tight ${i === TIERS.length - 1 ? 'text-fuchsia-300/80' : 'text-gray-500'}`}>{tt.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-gray-600 mt-1.5 italic">From a 2-hour local set to a festival headline worth millions — the same on-chain escrow, the same flat 0.5% fee.</p>
      </div>

      {payoutAddress && (
        <a
          href={`https://polygonscan.com/address/${payoutAddress}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-[10px] text-emerald-400 hover:text-emerald-300 font-mono break-all"
        >
          payout → {payoutAddress.slice(0, 10)}…{payoutAddress.slice(-6)} ↗
        </a>
      )}
    </section>
  )
}
