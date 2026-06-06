import { Award, Users, Music, CalendarCheck, BadgeCheck } from 'lucide-react'

// eBay-style "Pro Score" — a promoter's at-a-glance trust signal for follow-through.
// Composite of real signals: audience (followers), catalog depth (tracks), delivery
// (completed bookings), and verification. Shown to visitors on the manager page.
interface Props {
  followerCount?: number
  tracksCount?: number
  verified?: boolean
  completedBookings?: number
}

function tierFor(score: number) {
  if (score >= 90) return { label: 'Elite Pro', grad: 'from-amber-400 to-yellow-500', text: 'text-amber-300', ring: 'border-amber-400/40' }
  if (score >= 70) return { label: 'Top Pro', grad: 'from-cyan-400 to-blue-500', text: 'text-cyan-300', ring: 'border-cyan-400/40' }
  if (score >= 45) return { label: 'Established', grad: 'from-emerald-400 to-green-500', text: 'text-emerald-300', ring: 'border-emerald-400/40' }
  return { label: 'Rising', grad: 'from-purple-400 to-fuchsia-500', text: 'text-fuchsia-300', ring: 'border-fuchsia-400/40' }
}

export function ManagerReputation({ followerCount = 0, tracksCount = 0, verified = false, completedBookings = 0 }: Props) {
  const audience = Math.min(40, Math.round(Math.log10(Math.max(1, followerCount)) * 13))
  const catalog = Math.min(25, tracksCount * 2)
  const delivery = Math.min(25, completedBookings * 5)
  const trust = verified ? 10 : 0
  const score = Math.min(100, audience + catalog + delivery + trust)
  const t = tierFor(score)

  const Stat = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-gray-400" />
      <span className="text-gray-400">{label}</span>
      <span className="ml-auto text-gray-100 font-medium">{value}</span>
    </div>
  )

  return (
    <section className={`backdrop-blur-xl bg-black/60 border ${t.ring} rounded-2xl p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Award className={`w-4 h-4 ${t.text}`} />
        <h2 className="text-sm font-semibold text-white">Pro Score</h2>
        <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r ${t.grad} text-black`}>
          {t.label}
        </span>
      </div>
      <div className="flex items-end gap-2 mb-1">
        <span className={`text-4xl font-extrabold bg-gradient-to-r ${t.grad} bg-clip-text text-transparent leading-none`}>{score}</span>
        <span className="text-gray-500 text-sm mb-0.5">/ 100</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
        <div className={`h-full bg-gradient-to-r ${t.grad}`} style={{ width: `${score}%` }} />
      </div>
      <div className="space-y-1.5 text-xs">
        <Stat icon={Users} label="Audience" value={Number(followerCount).toLocaleString()} />
        <Stat icon={Music} label="Catalog" value={`${tracksCount} tracks`} />
        <Stat icon={CalendarCheck} label="Bookings completed" value={completedBookings} />
        <Stat icon={BadgeCheck} label="Verified" value={verified ? 'Yes' : 'No'} />
      </div>
      <p className="text-[10px] text-gray-500 mt-3 leading-relaxed">
        Reputation grows with every completed booking, release, and new supporter — proof of follow-through for promoters.
      </p>
    </section>
  )
}
