import { Lock, ShieldCheck, ArrowRight, CheckCircle2, CalendarCheck } from 'lucide-react'

// Whitelist-escrow VIEWER — shows a promoter exactly how an on-chain booking escrow
// protects both sides, using a hypothetical DJ gig, plus a "recent completions" feed
// (the artist's proven payout history). Illustrative sample data until real bookings
// flow through ManagerBookingEscrow; then `completions` is populated from chain.
interface Completion {
  venue: string
  date: string
  amount: string
  example?: boolean
}

interface Props {
  artistName: string
  payoutAddress?: string
  completions?: Completion[]
}

const SAMPLE: Completion[] = [
  { venue: 'Warehouse 9 · Brooklyn', date: 'May 2026', amount: '$2,500', example: true },
  { venue: 'Sahara Tent · Festival', date: 'Apr 2026', amount: '$6,000', example: true },
  { venue: 'The Echo · LA', date: 'Mar 2026', amount: '$1,800', example: true },
]

export function ManagerEscrowViewer({ artistName, payoutAddress, completions }: Props) {
  const list = completions && completions.length ? completions : SAMPLE
  const steps = [
    { n: 1, t: 'Promoter deposits', d: 'Booking fee (e.g. $2,500 USDC) is locked in the escrow contract — not held by us or the artist.' },
    { n: 2, t: 'Date locked on-chain', d: `The gig + ${artistName}'s slot are whitelisted on-chain so the date can't be double-booked.` },
    { n: 3, t: 'Artist performs', d: 'The DJ plays the set. Both sides are protected by the locked funds + terms.' },
    { n: 4, t: 'Auto payout on completion', d: 'Escrow releases the fee to the artist (5% platform). Refunds follow the cancellation terms — no middleman decides.' },
  ]

  return (
    <section className="backdrop-blur-xl bg-black/60 border border-emerald-500/25 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-white">On-Chain Booking Escrow</h2>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
          <Lock className="w-3 h-3" /> Polygon
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Example: a <span className="text-gray-200">2-hour DJ set</span> — here's how the smart contract secures the deal for both sides.
      </p>

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
        </div>
        <div className="space-y-1.5">
          {list.slice(0, 4).map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-gray-200 truncate">{c.venue}</span>
              <span className="text-gray-500">· {c.date}</span>
              <span className="ml-auto text-emerald-300 font-medium whitespace-nowrap">{c.amount} · paid</span>
            </div>
          ))}
        </div>
        {list[0]?.example && (
          <p className="text-[10px] text-gray-600 mt-2 italic">Sample preview — real completions post here as bookings settle on-chain.</p>
        )}
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
