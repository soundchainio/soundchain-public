/**
 * /arena/fantasy/[id] — Fantasy League Detail
 *
 * Tabs: Draft | Roster | Matchups | Standings
 * Commissioner controls: Start Draft / Lock / Settle / Cancel
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useMe } from 'hooks/useMe'
// DexNavBar inherited from Layout.tsx — no inline mount needed
import { ArrowLeft, Trophy, Users, Coins, Loader2, CheckCircle2, Shield, Crown, Medal, Award } from 'lucide-react'
import { toast } from 'react-toastify'
import { FantasyLeague, Matchup, PlayoffRound, PlayoffMatchup } from 'lib/arena/fantasy/types'
import { teamColorHex, positionPillClass } from 'lib/arena/fantasy/teamColors'
import { FantasyLiveTicker } from 'components/FantasyLiveTicker'

type Tab = 'draft' | 'roster' | 'matchups' | 'standings' | 'bracket'

interface DetailResponse {
  league: FantasyLeague
  standings: Array<{ rank: number; ownerHandle: string; teamName: string; wins: number; losses: number; totalPoints: number }>
}

interface EspnPlayer {
  id: string
  fullName: string
  displayName: string
  position: string
  teamAbbr: string
  headshot?: string
}

export default function FantasyLeagueDetailPage() {
  const router = useRouter()
  const id = router.query.id as string | undefined
  const me = useMe()
  const [data, setData] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('draft')
  const [players, setPlayers] = useState<EspnPlayer[]>([])
  const [playersLoading, setPlayersLoading] = useState(false)
  const [working, setWorking] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const r = await fetch(`/api/arena/fantasy/${id}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error || 'Failed to load'); return }
      setData(d)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (tab !== 'draft' || players.length > 0) return
    setPlayersLoading(true)
    fetch('/api/arena/fantasy/players')
      .then(r => r.json())
      .then(d => setPlayers(d.players || []))
      .finally(() => setPlayersLoading(false))
  }, [tab])

  const league = data?.league
  const myProfileId = me?.profile?.id
  const isCommissioner = !!(league && myProfileId && league.commissionerProfileId === myProfileId)
  const myTeam = league?.teams.find(t => t.ownerProfileId === myProfileId)

  const draftedIds = useMemo(
    () => new Set((league?.teams || []).flatMap(t => t.roster.map(r => r.playerId))),
    [league]
  )

  const availablePlayers = useMemo(
    () => players.filter(p => !draftedIds.has(p.id)).slice(0, 200),
    [players, draftedIds]
  )

  const onClockHandle = useMemo(() => {
    if (!league || league.status !== 'drafting') return null
    const N = league.draftOrder.length
    if (!N) return null
    const overall = league.currentPickIndex
    const round = Math.floor(overall / N)
    const within = overall % N
    const idx = round % 2 === 0 ? within : (N - 1 - within)
    return league.draftOrder[idx]
  }, [league])

  const act = async (action: string, payload: Record<string, any> = {}) => {
    if (!id) return
    setWorking(true)
    try {
      const r = await fetch(`/api/arena/fantasy/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, ...payload }),
      })
      const d = await r.json()
      if (!r.ok) return toast.error(d.error || `${action} failed`)
      toast.success(d.draftComplete ? 'Draft complete — league goes LIVE!' : `${action} ok`)
      await load()
    } finally {
      setWorking(false)
    }
  }

  if (loading || !league) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        <div className="fixed inset-0 arena-mesh-bg pointer-events-none" aria-hidden />
        <div className="fixed inset-0 arena-grid-overlay pointer-events-none" aria-hidden />
        <div className="fixed inset-0 arena-grain-overlay pointer-events-none" aria-hidden />
        <div className="relative flex flex-col items-center justify-center py-20 gap-3">
          <div className="relative w-14 h-14">
            <span className="absolute inset-0 rounded-full border-2 border-cyan-500/40 animate-ping" />
            <span className="absolute inset-1 rounded-full border-2 border-purple-500/40 animate-ping [animation-delay:200ms]" />
            <span className="absolute inset-2 rounded-full border-2 border-pink-500/40 animate-ping [animation-delay:400ms]" />
          </div>
          <span className="arena-hologram-text text-sm font-black tracking-widest">LOADING</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* High-end ambient graphics — framework lives in globals.css (port from /arena/picks) */}
      <div className="fixed inset-0 arena-mesh-bg pointer-events-none" aria-hidden />
      <div className="fixed inset-0 arena-grid-overlay pointer-events-none" aria-hidden />
      <div className="fixed inset-0 arena-grain-overlay pointer-events-none" aria-hidden />
      {league.status === 'live' && id && <FantasyLiveTicker leagueId={id} />}
      <div className="relative max-w-5xl mx-auto px-4 py-6">
        <Link href="/arena/fantasy" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> All Leagues
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.55)] shrink-0" />
              <h1 className="arena-hologram-text text-3xl lg:text-5xl font-black tracking-tight leading-none">{league.leagueName}</h1>
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-3 mt-2 flex-wrap">
              <span>@{league.commissionerHandle}</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{league.teams.length}/{league.maxTeams}</span>
              <span className="flex items-center gap-1"><Coins className="w-3 h-3" />{league.entryFee} {league.entryToken}</span>
              <span className="uppercase bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-bold">{league.status}</span>
            </div>
          </div>
          {me?.id && !myTeam && league.status === 'open' && (
            <button
              disabled={working}
              onClick={() => act('join')}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-sm font-bold"
            >
              Join League
            </button>
          )}
        </div>

        {isCommissioner && (
          <div className="flex gap-2 flex-wrap mb-6">
            {league.status === 'open' && league.teams.length >= 2 && (
              <button onClick={() => act('start-draft')} disabled={working}
                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded text-xs font-bold">
                Start Draft
              </button>
            )}
            {league.status === 'drafting' && (
              <button onClick={() => act('lock')} disabled={working}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-xs font-bold">
                Force Live (skip remaining picks)
              </button>
            )}
            {league.status === 'live' && !league.playoffBracket && (
              <button onClick={() => act('start-playoffs')} disabled={working}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 rounded text-xs font-bold">
                Start Playoffs (Top 4)
              </button>
            )}
            {league.status === 'live' && (
              <button onClick={() => {
                const first = prompt('Winner (handle):')
                const second = prompt('2nd (handle, optional):')
                const third = prompt('3rd (handle, optional):')
                if (first) act('settle', { first, second: second || undefined, third: third || undefined })
              }} disabled={working}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-xs font-bold">
                Settle
              </button>
            )}
            {league.status === 'open' && (
              <button onClick={() => { if (confirm('Cancel league? Refunds all joined teams.')) act('cancel') }} disabled={working}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-xs font-bold">
                Cancel
              </button>
            )}
          </div>
        )}

        {/* Trophy card — shown when league is complete */}
        {league.status === 'complete' && league.winners && (
          <TrophyCard league={league} />
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-800 mb-4 overflow-x-auto">
          {(['draft', 'roster', 'matchups', 'standings', ...(league.playoffBracket ? ['bracket' as Tab] : [])] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-bold uppercase whitespace-nowrap ${tab === t ? 'text-white border-b-2 border-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Draft Tab */}
        {tab === 'draft' && (
          <div>
            {league.status === 'open' && (
              <p className="text-sm text-gray-500">Draft starts once commissioner hits "Start Draft" (min 2 teams).</p>
            )}
            {league.status === 'drafting' && (
              <>
                <div className="mb-3 text-sm">
                  On the clock: <span className="font-bold text-yellow-400">@{onClockHandle}</span>
                  <span className="text-gray-500 ml-2">Pick {league.currentPickIndex + 1} of {league.draftOrder.length * league.draftRounds}</span>
                </div>
                {playersLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto">
                    {availablePlayers.map(p => {
                      const hex = teamColorHex(p.teamAbbr)
                      return (
                        <button
                          key={p.id}
                          onClick={() => act('pick', { playerId: p.id, fullName: p.fullName, position: p.position, teamAbbr: p.teamAbbr })}
                          disabled={working || onClockHandle !== me?.profile?.userHandle}
                          className="group flex items-center gap-3 p-2 pl-0 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed rounded text-left overflow-hidden relative"
                          style={{ borderLeft: `3px solid #${hex}` }}
                        >
                          {p.headshot ? (
                            <img
                              src={p.headshot}
                              alt=""
                              loading="lazy"
                              className="w-10 h-10 rounded-full object-cover bg-gray-800 ml-2 ring-2"
                              style={{ boxShadow: `0 0 0 2px #${hex}` }}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-bold ml-2">{p.position}</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate">{p.fullName}</div>
                            <div className="text-[10px] flex items-center gap-1.5 mt-0.5">
                              <span className={`px-1.5 py-0.5 rounded ring-1 ${positionPillClass(p.position)} text-[9px] font-bold`}>
                                {p.position}
                              </span>
                              <span className="text-gray-500">{p.teamAbbr}</span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}
            {(league.status === 'live' || league.status === 'complete') && (
              <div className="text-sm text-gray-400">
                <CheckCircle2 className="inline w-4 h-4 text-green-400 mr-1" /> Draft complete.
              </div>
            )}
          </div>
        )}

        {/* Roster Tab */}
        {tab === 'roster' && (
          <div className="space-y-4">
            {league.teams.map(t => (
              <div key={t.ownerProfileId} className="bg-gray-900 border border-gray-800 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-bold text-sm">{t.teamName}</div>
                    <div className="text-[10px] text-gray-500">@{t.ownerHandle}</div>
                  </div>
                  <div className="text-[10px] text-gray-500">{t.roster.length}/{league.draftRounds} drafted</div>
                </div>
                {t.roster.length === 0 ? (
                  <div className="text-[11px] text-gray-600 italic">No picks yet</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px]">
                    {t.roster.map((r, i) => {
                      const hex = teamColorHex(r.teamAbbr)
                      return (
                        <div
                          key={r.playerId}
                          className="flex items-center gap-2 bg-black/40 rounded px-2 py-1.5"
                          style={{ borderLeft: `2px solid #${hex}` }}
                        >
                          <span className={`px-1.5 py-0.5 rounded ring-1 ${positionPillClass(r.slot)} text-[9px] font-bold w-12 text-center`}>
                            {r.slot}
                          </span>
                          <span className="text-gray-200 font-semibold truncate flex-1">{r.fullName}</span>
                          <span className={`px-1.5 py-0.5 rounded ring-1 ${positionPillClass(r.position)} text-[9px] font-bold`}>
                            {r.position}
                          </span>
                          <span className="text-gray-500 text-[10px] font-mono">{r.teamAbbr}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Matchups Tab */}
        {tab === 'matchups' && (
          <MatchupsList
            schedule={league.schedule || []}
            teams={league.teams}
            myHandle={myTeam?.ownerHandle}
            currentWeek={league.lastScoringSyncWeek}
            weekPlayerScores={league.weekPlayerScores}
          />
        )}

        {/* Bracket Tab */}
        {tab === 'bracket' && league.playoffBracket && (
          <PlayoffBracketView bracket={league.playoffBracket} teams={league.teams} />
        )}

        {/* Standings Tab */}
        {tab === 'standings' && (
          <div className="bg-gray-900 border border-gray-800 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-black/40 text-[10px] uppercase text-gray-500">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Team</th>
                  <th className="text-right px-3 py-2">W-L</th>
                  <th className="text-right px-3 py-2">Pts</th>
                </tr>
              </thead>
              <tbody>
                {(data?.standings || []).map(s => (
                  <tr key={s.ownerHandle} className="border-t border-gray-800">
                    <td className="px-3 py-2 font-bold text-cyan-400">{s.rank}</td>
                    <td className="px-3 py-2">
                      <div className="font-bold">{s.teamName}</div>
                      <div className="text-[10px] text-gray-500">@{s.ownerHandle}</div>
                    </td>
                    <td className="px-3 py-2 text-right">{s.wins}-{s.losses}</td>
                    <td className="px-3 py-2 text-right">{s.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 text-[10px] text-gray-600 flex items-center gap-1">
          <Shield className="w-3 h-3" /> Free-to-play league — no stakes, no escrow. Bragging rights + leaderboard glory only.
        </div>
      </div>
    </div>
  )
}

interface MatchupsListProps {
  schedule: Matchup[]
  teams: FantasyLeague['teams']
  myHandle?: string
  currentWeek?: number
  weekPlayerScores?: FantasyLeague['weekPlayerScores']
}

function TrophyCard({ league }: { league: FantasyLeague }) {
  const winners = league.winners
  if (!winners?.first) return null
  const teamByHandle = new Map(league.teams.map(t => [t.ownerHandle, t]))
  const entries: Array<{ place: 1 | 2 | 3; handle: string; icon: any; color: string; bg: string }> = []
  if (winners.first)  entries.push({ place: 1, handle: winners.first,  icon: Crown, color: 'text-yellow-400',  bg: 'from-yellow-500/30 to-amber-900/20' })
  if (winners.second) entries.push({ place: 2, handle: winners.second, icon: Medal, color: 'text-gray-300',    bg: 'from-gray-400/30 to-gray-800/20' })
  if (winners.third)  entries.push({ place: 3, handle: winners.third,  icon: Award, color: 'text-orange-400',  bg: 'from-orange-500/30 to-orange-900/20' })

  return (
    <div className="mb-6 rounded-xl p-5 bg-gradient-to-br from-yellow-500/10 via-black to-amber-900/10 border-2 border-yellow-500/40 relative overflow-hidden">
      <div className="flex items-center gap-2 text-yellow-400 font-black text-xs uppercase tracking-widest mb-3">
        <Crown className="w-4 h-4" /> Season Complete · Champions
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {entries.map(e => {
          const team = teamByHandle.get(e.handle)
          return (
            <div key={e.place} className={`rounded-lg p-3 bg-gradient-to-br ${e.bg} border border-white/10`}>
              <div className={`flex items-center gap-2 text-xs font-bold ${e.color} mb-1`}>
                <e.icon className="w-4 h-4" />
                {e.place === 1 ? '1st' : e.place === 2 ? '2nd' : '3rd'}
              </div>
              <div className="font-black text-base truncate">{team?.teamName || `@${e.handle}`}</div>
              <div className="text-[10px] text-gray-400">@{e.handle}</div>
              <div className="text-[10px] text-gray-500 mt-1">
                {team?.wins ?? 0}-{team?.losses ?? 0} · {(team?.totalPoints ?? 0).toFixed(1)} pts
              </div>
            </div>
          )
        })}
      </div>
      {league.payoutTxHash && (
        <div className="mt-3 text-[10px] text-gray-500 font-mono truncate">
          Payout tx: <span className="text-cyan-400">{league.payoutTxHash}</span>
        </div>
      )}
    </div>
  )
}

function PlayoffBracketView({ bracket, teams }: { bracket: PlayoffRound[]; teams: FantasyLeague['teams'] }) {
  const teamByHandle = new Map(teams.map(t => [t.ownerHandle, t]))
  const handleHex = (h?: string) => {
    if (!h) return '555555'
    const t = teamByHandle.get(h)
    const firstTeam = t?.roster.find(r => !!r.teamAbbr)?.teamAbbr
    return firstTeam ? teamColorHex(firstTeam) : '22d3ee'
  }

  return (
    <div className="space-y-6">
      {bracket.map(round => (
        <div key={round.week}>
          <div className="text-[10px] uppercase font-bold text-orange-400 mb-2 flex items-center gap-2">
            <Crown className="w-3 h-3" />
            Week {round.week} · {round.matchups[0]?.round === 'semifinal' ? 'Semifinals' : 'Finals'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {round.matchups.map(m => {
              const homeHex = handleHex(m.home)
              const awayHex = handleHex(m.away)
              const played = typeof m.homeScore === 'number' && typeof m.awayScore === 'number'
              const isConsolation = m.bracket === 'consolation'
              return (
                <div
                  key={m.id}
                  className="relative rounded-lg p-3 text-sm overflow-hidden"
                  style={{
                    background: `linear-gradient(90deg, #${awayHex}22 0%, #0a0a0a 50%, #${homeHex}22 100%)`,
                    border: `1px solid ${isConsolation ? '#a78bfa33' : '#f59e0b66'}`,
                  }}
                >
                  <div className="text-[9px] uppercase font-bold mb-1.5 tracking-widest" style={{ color: isConsolation ? '#a78bfa' : '#f59e0b' }}>
                    {isConsolation ? 'Consolation (3rd Place)' : m.round === 'final' ? '🏆 Championship' : `Seed ${m.homeSeed} vs ${m.awaySeed}`}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className={`flex-1 ${m.winner && m.winner !== m.away ? 'opacity-50' : ''}`}>
                      <div className="text-[10px] text-gray-500">#{m.awaySeed ?? '?'}</div>
                      <div className="font-bold truncate" style={{ color: `#${awayHex}` }}>
                        {m.away ? (teamByHandle.get(m.away)?.teamName || `@${m.away}`) : <span className="text-gray-600">TBD</span>}
                      </div>
                      {played && <div className="text-2xl font-black tabular-nums">{m.awayScore?.toFixed(1)}</div>}
                    </div>
                    <div className="px-2 text-[10px] font-bold text-gray-600">{played ? '' : 'VS'}</div>
                    <div className={`flex-1 text-right ${m.winner && m.winner !== m.home ? 'opacity-50' : ''}`}>
                      <div className="text-[10px] text-gray-500">#{m.homeSeed ?? '?'}</div>
                      <div className="font-bold truncate" style={{ color: `#${homeHex}` }}>
                        {m.home ? (teamByHandle.get(m.home)?.teamName || `@${m.home}`) : <span className="text-gray-600">TBD</span>}
                      </div>
                      {played && <div className="text-2xl font-black tabular-nums">{m.homeScore?.toFixed(1)}</div>}
                    </div>
                  </div>
                  {m.winner && !isConsolation && m.round === 'final' && (
                    <div className="absolute top-2 right-2 text-yellow-400">
                      <Crown className="w-4 h-4" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function MatchupsList({ schedule, teams, myHandle, currentWeek, weekPlayerScores }: MatchupsListProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!schedule.length) return <div className="text-sm text-gray-500">Schedule generated once draft starts.</div>

  // handle → team record lookup (includes roster for per-starter breakdowns)
  const teamByHandle: Record<string, FantasyLeague['teams'][number]> = {}
  const handleHex: Record<string, string> = {}
  for (const t of teams) {
    teamByHandle[t.ownerHandle] = t
    const firstTeam = t.roster.find(r => !!r.teamAbbr)?.teamAbbr
    handleHex[t.ownerHandle] = firstTeam ? teamColorHex(firstTeam) : '22d3ee'
  }

  const byWeek = schedule.reduce<Record<number, Matchup[]>>((acc, m) => {
    (acc[m.week] = acc[m.week] || []).push(m); return acc
  }, {})
  const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b)

  // Promote the current week to the top, everything else in natural order
  if (currentWeek && weeks.includes(currentWeek)) {
    const idx = weeks.indexOf(currentWeek)
    weeks.splice(idx, 1)
    weeks.unshift(currentWeek)
  }

  // My this-week matchup for the hero card
  const myMatchup = currentWeek && myHandle
    ? (byWeek[currentWeek] || []).find(m => m.home === myHandle || m.away === myHandle)
    : undefined

  return (
    <div className="space-y-4">
      {myMatchup && (
        <MyWeekHero
          matchup={myMatchup}
          teams={teamByHandle}
          handleHex={handleHex}
          week={currentWeek!}
          myHandle={myHandle!}
          weekPlayerScores={weekPlayerScores}
        />
      )}
      {weeks.map(w => {
        const isCurrent = w === currentWeek
        return (
          <div key={w}>
            <div className="text-[10px] uppercase font-bold mb-1.5 flex items-center gap-2">
              <span className={isCurrent ? 'text-green-400' : 'text-gray-500'}>Week {w}</span>
              {isCurrent && <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 ring-1 ring-green-500/40 text-[9px]">THIS WEEK</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {byWeek[w].map((m, i) => {
                const homeHex = handleHex[m.home] || '22d3ee'
                const awayHex = handleHex[m.away] || 'a78bfa'
                const played = typeof m.homeScore === 'number' && typeof m.awayScore === 'number'
                const homeWon = played && m.homeScore! > m.awayScore!
                const awayWon = played && m.awayScore! > m.homeScore!
                const amIn = myHandle && (m.home === myHandle || m.away === myHandle)
                const key = `${w}-${i}`
                const isOpen = expanded === key
                return (
                  <div key={key}>
                    <button
                      onClick={() => setExpanded(isOpen ? null : key)}
                      className={`w-full relative rounded-lg p-3 text-sm overflow-hidden text-left ${amIn ? 'ring-2 ring-cyan-400/60' : ''}`}
                      style={{
                        background: `linear-gradient(90deg, #${awayHex}22 0%, #0a0a0a 50%, #${homeHex}22 100%)`,
                        border: `1px solid #${awayHex}33`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`flex-1 ${awayWon ? 'opacity-100' : played ? 'opacity-50' : ''}`}>
                          <div className="font-bold truncate" style={{ color: `#${awayHex}` }}>@{m.away}</div>
                          {played && <div className="text-2xl font-black tabular-nums">{m.awayScore?.toFixed(1)}</div>}
                        </div>
                        <div className="px-2 text-[10px] font-bold text-gray-600">
                          {played ? (m.winner === 'tie' ? 'TIE' : '') : 'VS'}
                        </div>
                        <div className={`flex-1 text-right ${homeWon ? 'opacity-100' : played ? 'opacity-50' : ''}`}>
                          <div className="font-bold truncate" style={{ color: `#${homeHex}` }}>@{m.home}</div>
                          {played && <div className="text-2xl font-black tabular-nums">{m.homeScore?.toFixed(1)}</div>}
                        </div>
                      </div>
                    </button>
                    {isOpen && (
                      <StarterBreakdown
                        home={teamByHandle[m.home]}
                        away={teamByHandle[m.away]}
                        week={w}
                        weekPlayerScores={weekPlayerScores}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface MyWeekHeroProps {
  matchup: Matchup
  teams: Record<string, FantasyLeague['teams'][number]>
  handleHex: Record<string, string>
  week: number
  myHandle: string
  weekPlayerScores?: FantasyLeague['weekPlayerScores']
}

function MyWeekHero({ matchup, teams, handleHex, week, myHandle, weekPlayerScores }: MyWeekHeroProps) {
  const isHome = matchup.home === myHandle
  const myKey = isHome ? 'home' : 'away'
  const oppKey = isHome ? 'away' : 'home'
  const myScore = isHome ? matchup.homeScore : matchup.awayScore
  const oppScore = isHome ? matchup.awayScore : matchup.homeScore
  const oppHandle = matchup[oppKey]
  const myHex = handleHex[myHandle] || '22d3ee'
  const oppHex = handleHex[oppHandle] || 'a78bfa'
  const played = typeof myScore === 'number' && typeof oppScore === 'number'
  const winning = played && myScore! > oppScore!

  return (
    <div
      className="relative rounded-xl p-4 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, #${myHex}33 0%, #0a0a0a 50%, #${oppHex}33 100%)`,
        border: `2px solid #${myHex}66`,
      }}
    >
      <div className="text-[10px] uppercase tracking-widest text-green-400 font-bold mb-2 flex items-center gap-2">
        <Trophy className="w-3 h-3" /> My Week {week}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-gray-500 uppercase">You</div>
          <div className="font-black text-lg truncate" style={{ color: `#${myHex}` }}>{teams[myHandle]?.teamName || `@${myHandle}`}</div>
          {played && <div className={`text-4xl font-black tabular-nums ${winning ? 'text-green-400' : ''}`}>{myScore?.toFixed(1)}</div>}
        </div>
        <div className="text-xs font-bold text-gray-500">
          {played ? (myScore! > oppScore! ? '✓' : myScore! < oppScore! ? '✗' : 'TIE') : 'VS'}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <div className="text-[10px] text-gray-500 uppercase">Opponent</div>
          <div className="font-black text-lg truncate" style={{ color: `#${oppHex}` }}>{teams[oppHandle]?.teamName || `@${oppHandle}`}</div>
          {played && <div className={`text-4xl font-black tabular-nums ${!winning && played && myScore !== oppScore ? 'text-red-400' : ''}`}>{oppScore?.toFixed(1)}</div>}
        </div>
      </div>
      {weekPlayerScores && weekPlayerScores[week] && (
        <StarterBreakdown
          home={teams[matchup.home]}
          away={teams[matchup.away]}
          week={week}
          weekPlayerScores={weekPlayerScores}
          compact
        />
      )}
    </div>
  )
}

interface StarterBreakdownProps {
  home?: FantasyLeague['teams'][number]
  away?: FantasyLeague['teams'][number]
  week: number
  weekPlayerScores?: FantasyLeague['weekPlayerScores']
  compact?: boolean
}

function StarterBreakdown({ home, away, week, weekPlayerScores, compact }: StarterBreakdownProps) {
  if (!home || !away) return null
  const weekMap = weekPlayerScores?.[week] || {}
  const homeStarters = home.roster.filter(r => r.slot !== 'BENCH')
  const awayStarters = away.roster.filter(r => r.slot !== 'BENCH')
  const rowCount = Math.max(homeStarters.length, awayStarters.length)

  return (
    <div className={`${compact ? 'mt-3' : 'mt-2 bg-gray-950/80 rounded-b-lg'} p-2 text-[10px] border-t border-gray-800`}>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
        {Array.from({ length: rowCount }).map((_, idx) => {
          const a = awayStarters[idx]
          const h = homeStarters[idx]
          const aPts = a ? (weekMap[a.playerId] ?? null) : null
          const hPts = h ? (weekMap[h.playerId] ?? null) : null
          return (
            <div key={idx} className="contents">
              <div className="truncate text-left">
                {a ? (
                  <>
                    <span className={`inline-block px-1 rounded ring-1 ${positionPillClass(a.slot)} text-[8px] font-bold mr-1`}>{a.slot}</span>
                    <span className="text-gray-300">{a.fullName.split(' ').slice(-1)[0]}</span>
                    {aPts !== null && <span className="ml-1 text-green-400 font-bold tabular-nums">{aPts.toFixed(1)}</span>}
                  </>
                ) : <span className="text-gray-700">—</span>}
              </div>
              <div className="text-gray-700 text-center">·</div>
              <div className="truncate text-right">
                {h ? (
                  <>
                    {hPts !== null && <span className="mr-1 text-green-400 font-bold tabular-nums">{hPts.toFixed(1)}</span>}
                    <span className="text-gray-300">{h.fullName.split(' ').slice(-1)[0]}</span>
                    <span className={`inline-block px-1 rounded ring-1 ${positionPillClass(h.slot)} text-[8px] font-bold ml-1`}>{h.slot}</span>
                  </>
                ) : <span className="text-gray-700">—</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
