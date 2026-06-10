import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Trophy, MapPin, Radio, CalendarDays, Users, GitBranch, Star } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'
import {
  fetchWorldCupGroups,
  fetchWorldCupSchedule,
  groupMatchesByDate,
  WC_HOSTS,
  WC_KICKOFF_ISO,
  WC_ROUND_ORDER,
  type WCGroup,
  type WCMatch,
  type WCMatchSide,
  type WCRound,
} from '@/lib/worldcup'

// FIFA World Cup 2026 tournament dashboard — the single hub for the entire
// event on arena. Live + upcoming matches, all 12 groups with standings, the
// full schedule by matchday, the knockout bracket, and the 16 host cities.
// ESPN site.api is CORS-open so everything fetches in the browser; standings +
// schedule auto-refresh every 60s so scores stay live during matches.

type Tab = 'matches' | 'groups' | 'schedule' | 'bracket' | 'hosts'

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'matches', label: 'Matches', icon: Radio },
  { id: 'groups', label: 'Groups', icon: Users },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'bracket', label: 'Bracket', icon: GitBranch },
  { id: 'hosts', label: 'Hosts', icon: MapPin },
]

export default function WorldCupDash() {
  const [groups, setGroups] = useState<WCGroup[]>([])
  const [matches, setMatches] = useState<WCMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('matches')
  const didInit = useRef(false)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const [g, s] = await Promise.all([
          fetchWorldCupGroups().catch(() => [] as WCGroup[]),
          fetchWorldCupSchedule().catch(() => [] as WCMatch[]),
        ])
        if (!alive) return
        setGroups(g)
        setMatches(s)
      } finally {
        if (alive) setLoading(false)
      }
    }
    if (!didInit.current) {
      didInit.current = true
      load()
    }
    const t = setInterval(load, 60_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  const live = matches.filter((m) => m.state === 'in')
  const hasLive = live.length > 0

  return (
    <ArenaShell>
      <Head>
        <title>FIFA World Cup 2026 — Tournament Dash | Arena</title>
        <meta name="description" content="The complete 2026 FIFA World Cup hub: live scores, all 12 groups & standings, full schedule, knockout bracket, and the 16 host cities across USA, Canada & Mexico." />
      </Head>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 pb-16">
        <Hero hasLive={hasLive} liveCount={live.length} />

        {/* sticky sub-nav */}
        <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-arena-paper/90 dark:bg-arena-carbon/90 backdrop-blur border-b border-arena-border-l dark:border-arena-border-d">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {TABS.map((t) => {
              const Icon = t.icon
              const on = tab === t.id
              const liveDot = t.id === 'matches' && hasLive
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] sm:text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full transition ${
                    on
                      ? 'bg-arena-red text-white'
                      : 'bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d text-arena-muted-l dark:text-arena-muted-d hover:border-arena-red hover:text-arena-red'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                  {liveDot && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-arena-muted-l dark:text-arena-muted-d">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading the tournament…
          </div>
        ) : (
          <div className="pt-4">
            {tab === 'matches' && <MatchesTab matches={matches} />}
            {tab === 'groups' && <GroupsTab groups={groups} />}
            {tab === 'schedule' && <ScheduleTab matches={matches} />}
            {tab === 'bracket' && <BracketTab matches={matches} />}
            {tab === 'hosts' && <HostsTab />}
          </div>
        )}
      </div>
    </ArenaShell>
  )
}

// ─── Hero + countdown ───────────────────────────────────────────────────────

function Hero({ hasLive, liveCount }: { hasLive: boolean; liveCount: number }) {
  const [now, setNow] = useState<number>(() => new Date('2026-06-10T12:00:00Z').getTime())
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const kickoff = new Date(WC_KICKOFF_ISO).getTime()
  const diff = kickoff - now
  const pre = diff > 0

  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  return (
    <div className="relative overflow-hidden rounded-2xl my-3 border border-arena-border-l dark:border-arena-border-d bg-gradient-to-br from-[#0b1e3f] via-[#10243f] to-[#1a0b2e]">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #22d3ee 0, transparent 40%), radial-gradient(circle at 80% 70%, #c026d3 0, transparent 40%)' }} />
      <div className="relative px-5 py-6 sm:py-7">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">FIFA · 2026</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">FIFA World Cup 2026</h1>
        <div className="flex items-center gap-2 mt-1 text-white/70 text-xs sm:text-sm font-semibold">
          <span>🇺🇸 USA</span><span>🇨🇦 Canada</span><span>🇲🇽 Mexico</span>
          <span className="text-white/40">·</span>
          <span>Jun 11 – Jul 19</span>
        </div>

        <div className="mt-4">
          {hasLive ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-arena-red text-white text-xs font-black uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 animate-pulse" /> {liveCount} match{liveCount === 1 ? '' : 'es'} live now
            </div>
          ) : pre ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Kickoff in</span>
              {[
                ['Days', d],
                ['Hrs', h],
                ['Min', m],
                ['Sec', s],
              ].map(([lbl, val]) => (
                <div key={lbl as string} className="text-center px-2.5 py-1.5 rounded-lg bg-white/10 backdrop-blur border border-white/10 min-w-[44px]">
                  <div className="text-lg sm:text-xl font-black text-white tabular-nums leading-none">{String(Math.max(0, val as number)).padStart(2, '0')}</div>
                  <div className="text-[8px] uppercase tracking-wider text-white/50 font-bold mt-0.5">{lbl}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-black uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5" /> Tournament in progress
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Shared match bits ──────────────────────────────────────────────────────

function Flag({ side, size = 24 }: { side: WCMatchSide; size?: number }) {
  if (side.isPlaceholder || !side.flag) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-sm bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d text-[8px] font-black text-arena-muted-l dark:text-arena-muted-d"
        style={{ width: size, height: size * 0.7 }}
      >
        {side.abbr || '?'}
      </span>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={side.flag} alt={side.name} width={size} height={size * 0.7} className="object-contain rounded-sm" style={{ width: size, height: size * 0.7 }} />
}

function TeamCrest({ side }: { side: WCMatchSide }) {
  const body = (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <Flag side={side} />
      <span className="text-sm font-bold truncate">{side.isPlaceholder ? side.name || 'TBD' : side.name}</span>
    </span>
  )
  if (side.isPlaceholder || !side.id) return body
  return (
    <Link href={`/worldcup/team/${side.id}`} className="hover:text-arena-red transition min-w-0">
      {body}
    </Link>
  )
}

function MatchCard({ m, compact = false }: { m: WCMatch; compact?: boolean }) {
  const live = m.state === 'in'
  const done = m.state === 'post'
  const kickoff = new Date(m.date)
  const timeStr = kickoff.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  return (
    <div className={`rounded-xl border bg-arena-card dark:bg-arena-surface ${live ? 'border-arena-red shadow-[0_0_0_1px_rgba(220,38,38,0.4)]' : 'border-arena-border-l dark:border-arena-border-d'} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-black uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">{m.round}</span>
        {live ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-arena-red">
            <span className="w-1.5 h-1.5 rounded-full bg-arena-red animate-pulse" /> {m.clock || 'Live'}
          </span>
        ) : (
          <span className="text-[9px] font-bold uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">{done ? 'Final' : 'Upcoming'}</span>
        )}
      </div>
      <div className="space-y-1.5">
        {[m.home, m.away].map((side, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <TeamCrest side={side} />
            <span className={`text-base font-black tabular-nums ${side.winner ? 'text-arena-red' : done || live ? '' : 'text-arena-muted-l dark:text-arena-muted-d'}`}>
              {done || live ? side.score ?? '0' : ''}
            </span>
          </div>
        ))}
      </div>
      {!compact && (
        <div className="mt-2 pt-2 border-t border-arena-border-l dark:border-arena-border-d flex items-center justify-between text-[10px] text-arena-muted-l dark:text-arena-muted-d">
          <span className="truncate">{!done && !live ? timeStr : m.venue || ''}</span>
          {m.broadcasts.length > 0 && <span className="font-bold shrink-0 ml-2">{m.broadcasts[0]}</span>}
        </div>
      )}
    </div>
  )
}

// ─── Matches tab ────────────────────────────────────────────────────────────

function MatchesTab({ matches }: { matches: WCMatch[] }) {
  const now = useMemo(() => Date.now(), [])
  const live = matches.filter((m) => m.state === 'in')
  const today = new Date(now)
  const isSameDay = (iso: string) => {
    const d = new Date(iso)
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  }
  const todays = matches.filter((m) => m.state !== 'in' && isSameDay(m.date))
  const upcoming = matches.filter((m) => m.state === 'pre' && new Date(m.date).getTime() > now && !isSameDay(m.date)).slice(0, 12)
  const recent = matches.filter((m) => m.state === 'post').slice(-6).reverse()

  const Section = ({ title, items, icon: Icon }: { title: string; items: WCMatch[]; icon?: any }) =>
    items.length === 0 ? null : (
      <div className="mb-6">
        <h2 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d mb-2">
          {Icon && <Icon className="w-3.5 h-3.5" />} {title}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((m) => (
            <MatchCard key={m.id} m={m} />
          ))}
        </div>
      </div>
    )

  if (matches.length === 0) {
    return <Empty msg="Schedule loads as ESPN publishes the fixtures." />
  }

  return (
    <div>
      <Section title="Live Now" items={live} icon={Radio} />
      <Section title="Today" items={todays} icon={CalendarDays} />
      <Section title="Up Next" items={upcoming} />
      <Section title="Recent Results" items={recent} />
    </div>
  )
}

// ─── Groups tab ─────────────────────────────────────────────────────────────

function GroupsTab({ groups }: { groups: WCGroup[] }) {
  if (groups.length === 0) return <Empty msg="Groups populate once the draw data loads." />
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((g) => (
        <div key={g.letter} className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface overflow-hidden">
          <div className="px-3 py-2 bg-arena-paper dark:bg-arena-carbon border-b border-arena-border-l dark:border-arena-border-d flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-arena-red text-white text-xs font-black">{g.letter}</span>
            <span className="text-xs font-black uppercase tracking-wider">{g.name}</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[9px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">
                <th className="text-left font-bold px-3 py-1.5">Team</th>
                {['P', 'W', 'D', 'L', 'GD', 'Pts'].map((h) => (
                  <th key={h} className={`font-bold py-1.5 ${h === 'Pts' ? 'pr-3 text-right' : 'w-7 text-center'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r, i) => (
                <tr key={r.team.id || i} className={`border-t border-arena-border-l/50 dark:border-arena-border-d/50 ${i < 2 ? 'bg-emerald-500/5' : ''}`}>
                  <td className="px-3 py-1.5">
                    <Link href={r.team.id ? `/worldcup/team/${r.team.id}` : '#'} className="inline-flex items-center gap-1.5 hover:text-arena-red transition">
                      <span className={`w-1 h-4 rounded-full ${i < 2 ? 'bg-emerald-400' : 'bg-transparent'}`} />
                      {r.team.flag ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.team.flag} alt="" className="w-5 h-3.5 object-contain rounded-sm" />
                      ) : (
                        <span className="w-5 h-3.5 inline-block rounded-sm bg-arena-surface" />
                      )}
                      <span className="font-bold truncate max-w-[110px]">{r.team.name}</span>
                    </Link>
                  </td>
                  <td className="text-center text-arena-muted-l dark:text-arena-muted-d">{r.played}</td>
                  <td className="text-center">{r.wins}</td>
                  <td className="text-center">{r.draws}</td>
                  <td className="text-center">{r.losses}</td>
                  <td className="text-center tabular-nums">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                  <td className="pr-3 text-right font-black tabular-nums">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="sm:col-span-2 text-[10px] text-arena-muted-l dark:text-arena-muted-d text-center mt-1">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1 align-middle" /> Top 2 of each group advance, plus the 8 best third-placed teams → Round of 32.
      </p>
    </div>
  )
}

// ─── Schedule tab ───────────────────────────────────────────────────────────

function ScheduleTab({ matches }: { matches: WCMatch[] }) {
  const [round, setRound] = useState<WCRound | 'All'>('All')
  const filtered = round === 'All' ? matches : matches.filter((m) => m.round === round)
  const byDate = groupMatchesByDate(filtered)
  const rounds: (WCRound | 'All')[] = ['All', ...WC_ROUND_ORDER]

  if (matches.length === 0) return <Empty msg="Fixtures load from ESPN." />

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-4">
        {rounds.map((r) => (
          <button
            key={r}
            onClick={() => setRound(r)}
            className={`whitespace-nowrap text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full transition ${
              round === r ? 'bg-arena-red text-white' : 'bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d text-arena-muted-l dark:text-arena-muted-d hover:border-arena-red'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="space-y-5">
        {byDate.map((day) => (
          <div key={day.date}>
            <div className="sticky top-12 z-10 -mx-1 px-1 py-1 mb-2 text-[11px] font-black uppercase tracking-wider text-arena-red bg-arena-paper/80 dark:bg-arena-carbon/80 backdrop-blur">
              {day.label}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {day.matches.map((m) => (
                <MatchCard key={m.id} m={m} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Bracket tab ────────────────────────────────────────────────────────────

function BracketTab({ matches }: { matches: WCMatch[] }) {
  const KO: WCRound[] = ['Round of 32', 'Round of 16', 'Quarterfinal', 'Semifinal', 'Final']
  const byRound = KO.map((r) => ({
    round: r,
    matches: matches.filter((m) => m.round === r).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  }))
  const anyKO = byRound.some((c) => c.matches.length > 0)

  if (!anyKO) {
    return (
      <Empty msg="The knockout bracket fills in after the group stage (June 28). 32 teams advance — top 2 of each group plus the 8 best third-placed sides." />
    )
  }

  return (
    <div className="overflow-x-auto pb-3 -mx-3 sm:-mx-4 px-3 sm:px-4">
      <div className="flex gap-4 min-w-max">
        {byRound.map((col) => (
          <div key={col.round} className="flex flex-col gap-2 min-w-[200px]">
            <div className="text-[10px] font-black uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d sticky top-12">{col.round}</div>
            {col.matches.length === 0 ? (
              <div className="rounded-lg border border-dashed border-arena-border-l dark:border-arena-border-d p-3 text-center text-[10px] text-arena-muted-l dark:text-arena-muted-d">TBD</div>
            ) : (
              col.matches.map((m) => <BracketMatch key={m.id} m={m} />)
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function BracketMatch({ m }: { m: WCMatch }) {
  const done = m.state === 'post'
  const live = m.state === 'in'
  return (
    <div className={`rounded-lg border bg-arena-card dark:bg-arena-surface p-2 ${live ? 'border-arena-red' : 'border-arena-border-l dark:border-arena-border-d'}`}>
      {[m.home, m.away].map((side, i) => (
        <div key={i} className={`flex items-center justify-between gap-2 ${i === 0 ? 'mb-1 pb-1 border-b border-arena-border-l/40 dark:border-arena-border-d/40' : ''}`}>
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <Flag side={side} size={20} />
            <span className={`text-xs font-bold truncate ${done && !side.winner ? 'text-arena-muted-l dark:text-arena-muted-d' : ''}`}>
              {side.isPlaceholder ? side.name || 'TBD' : side.name}
            </span>
          </span>
          <span className={`text-sm font-black tabular-nums ${side.winner ? 'text-arena-red' : 'text-arena-muted-l dark:text-arena-muted-d'}`}>
            {done || live ? side.score ?? '' : ''}
          </span>
        </div>
      ))}
      <div className="mt-1 text-[9px] text-arena-muted-l dark:text-arena-muted-d">
        {done ? 'Final' : live ? m.clock || 'Live' : new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </div>
    </div>
  )
}

// ─── Hosts tab ──────────────────────────────────────────────────────────────

function HostsTab() {
  const byCountry = ['USA', 'Canada', 'Mexico'] as const
  return (
    <div className="space-y-5">
      {byCountry.map((c) => {
        const hosts = WC_HOSTS.filter((h) => h.country === c)
        return (
          <div key={c}>
            <h2 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d mb-2">
              {hosts[0]?.flag} {c} · {hosts.length} cities
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {hosts.map((h) => (
                <div key={h.city} className="rounded-xl border border-arena-border-l dark:border-arena-border-d bg-arena-card dark:bg-arena-surface p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-arena-red shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-black truncate">{h.city}</div>
                      <div className="text-[11px] text-arena-muted-l dark:text-arena-muted-d truncate">{h.venue}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
      <p className="text-[10px] text-arena-muted-l dark:text-arena-muted-d text-center">
        16 host cities across 3 nations — the first 48-team, tri-nation World Cup.
      </p>
    </div>
  )
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <Star className="w-8 h-8 text-arena-muted-l dark:text-arena-muted-d mb-3" />
      <p className="text-sm text-arena-muted-l dark:text-arena-muted-d max-w-sm">{msg}</p>
    </div>
  )
}
