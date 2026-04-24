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
import { DexNavBar } from 'components/DexNavBar'
import { ArrowLeft, Trophy, Users, Coins, Loader2, CheckCircle2, Shield } from 'lucide-react'
import { toast } from 'react-toastify'
import { FantasyLeague, Matchup } from 'lib/arena/fantasy/types'

type Tab = 'draft' | 'roster' | 'matchups' | 'standings'

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
      <div className="min-h-screen bg-black text-white">
        <DexNavBar />
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <DexNavBar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link href="/arena/fantasy" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> All Leagues
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Trophy className="w-6 h-6 text-green-400" /> {league.leagueName}
            </h1>
            <div className="text-xs text-gray-400 flex items-center gap-3 mt-1">
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

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-800 mb-4">
          {(['draft', 'roster', 'matchups', 'standings'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-bold uppercase ${tab === t ? 'text-white border-b-2 border-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
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
                    {availablePlayers.map(p => (
                      <button
                        key={p.id}
                        onClick={() => act('pick', { playerId: p.id, fullName: p.fullName, position: p.position, teamAbbr: p.teamAbbr })}
                        disabled={working || onClockHandle !== me?.profile?.userHandle}
                        className="flex items-center gap-3 p-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed rounded text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-bold">{p.position}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate">{p.fullName}</div>
                          <div className="text-[10px] text-gray-500">{p.teamAbbr}</div>
                        </div>
                      </button>
                    ))}
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-[11px]">
                    {t.roster.map((r, i) => (
                      <div key={r.playerId} className="bg-black/40 rounded px-2 py-1">
                        <span className="text-cyan-400 font-bold w-6 inline-block">{r.slot}</span>
                        <span className="text-gray-400">{r.fullName}</span>
                        <span className="text-gray-600 ml-1">{r.teamAbbr}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Matchups Tab */}
        {tab === 'matchups' && <MatchupsList schedule={league.schedule || []} />}

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
          <Shield className="w-3 h-3" /> Escrow via <code className="text-cyan-500">FantasyLeagueEscrow.sol</code> (contract ready, deployment pending). Interim escrow via arena backend wallet.
        </div>
      </div>
    </div>
  )
}

function MatchupsList({ schedule }: { schedule: Matchup[] }) {
  if (!schedule.length) return <div className="text-sm text-gray-500">Schedule generated once draft starts.</div>
  const byWeek = schedule.reduce<Record<number, Matchup[]>>((acc, m) => {
    (acc[m.week] = acc[m.week] || []).push(m); return acc
  }, {})
  const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b)
  return (
    <div className="space-y-4">
      {weeks.map(w => (
        <div key={w}>
          <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Week {w}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {byWeek[w].map((m, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm flex items-center justify-between">
                <span>@{m.away}</span>
                <span className="text-gray-500 text-xs">
                  {typeof m.awayScore === 'number' ? `${m.awayScore} - ${m.homeScore}` : 'vs'}
                </span>
                <span>@{m.home}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
