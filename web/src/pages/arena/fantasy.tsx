/**
 * /arena/fantasy — Fantasy League Hub
 *
 * List all fantasy leagues + create button. Detail view lives at /arena/fantasy/[id].
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMe } from 'hooks/useMe'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
// DexNavBar inherited from Layout.tsx — no inline mount needed
import { ArrowLeft, Trophy, Plus, Users, Coins, Loader2, X } from 'lucide-react'
import { toast } from 'react-toastify'
import { FantasyLeague, EntryToken, TOKEN_CONFIG, isTokenLive } from 'lib/arena/fantasy/types'
import { TOKEN_INFO, SUPPORTED_TOKENS } from 'constants/tokens'

export default function FantasyHubPage() {
  const router = useRouter()
  const me = useMe()
  const [leagues, setLeagues] = useState<FantasyLeague[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const { setHideBottomNavBarState } = useHideBottomNavBar()

  useEffect(() => {
    setHideBottomNavBarState(true)
    return () => setHideBottomNavBarState(false)
  }, [setHideBottomNavBarState])

  const loadLeagues = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/arena/fantasy?status=all', { credentials: 'include' })
      const d = await r.json()
      setLeagues(d.leagues || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLeagues() }, [])

  // Auto-open create modal when landed via /arena/fantasy?new=1
  useEffect(() => {
    if (router.query.new === '1' && me?.profile) setShowCreate(true)
  }, [router.query.new, me?.profile])

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {me?.id && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> New League
            </button>
          )}
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-black bg-gradient-to-r from-green-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
            <Trophy className="w-8 h-8 text-green-400" /> FANTASY LEAGUES
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            NFL fantasy with OGUN / POL prize pools. Smart contract escrow. 0.05% platform fee.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
        ) : leagues.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No leagues yet — be first to start one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leagues.map(l => <LeagueCard key={String((l as any)._id)} league={l} />)}
          </div>
        )}
      </div>

      {showCreate && <CreateLeagueModal onClose={() => setShowCreate(false)} onCreated={loadLeagues} />}
    </div>
  )
}

function LeagueCard({ league }: { league: FantasyLeague }) {
  const id = String((league as any)._id)
  const statusColor: Record<string, string> = {
    open: 'bg-cyan-500/20 text-cyan-300',
    drafting: 'bg-yellow-500/20 text-yellow-300',
    live: 'bg-green-500/20 text-green-300',
    complete: 'bg-gray-500/20 text-gray-400',
    cancelled: 'bg-red-500/20 text-red-400',
  }
  return (
    <Link href={`/arena/fantasy/${id}`} className="block bg-gray-900 border border-gray-800 hover:border-cyan-500/50 rounded-lg p-4 transition">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-white">{league.leagueName}</h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${statusColor[league.status] || ''}`}>
          {league.status}
        </span>
      </div>
      <div className="text-xs text-gray-400 flex items-center gap-3">
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{(league.teams || []).length}/{league.maxTeams}</span>
        <span className="flex items-center gap-1"><Coins className="w-3 h-3" />{league.entryFee} {league.entryToken}</span>
        <span>by @{league.commissionerHandle}</span>
      </div>
    </Link>
  )
}

function CreateLeagueModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [leagueName, setLeagueName] = useState('')
  const [maxTeams, setMaxTeams] = useState(10)
  const [entryToken, setEntryToken] = useState<EntryToken>('OGUN')
  const [entryFee, setEntryFee] = useState(100)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (leagueName.trim().length < 3) return toast.error('League name must be at least 3 chars')
    setSubmitting(true)
    try {
      const r = await fetch('/api/arena/fantasy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ leagueName, maxTeams, entryToken, entryFee }),
      })
      const d = await r.json()
      if (!r.ok) return toast.error(d.error || 'Failed to create')
      toast.success('League created!')
      onCreated()
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">New Fantasy League</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-white" /></button>
        </div>

        <label className="block mb-3">
          <span className="text-xs text-gray-400">League Name</span>
          <input
            type="text"
            value={leagueName}
            onChange={e => setLeagueName(e.target.value)}
            placeholder="Sunday Degens"
            className="w-full mt-1 bg-gray-1A border border-gray-800 rounded px-3 py-2 text-sm"
            maxLength={60}
          />
        </label>

        <label className="block mb-3">
          <span className="text-xs text-gray-400">Max Teams</span>
          <select
            value={maxTeams}
            onChange={e => setMaxTeams(Number(e.target.value))}
            className="w-full mt-1 bg-gray-1A border border-gray-800 rounded px-3 py-2 text-sm"
          >
            {[4, 6, 8, 10, 12, 14].map(n => <option key={n} value={n} className="bg-gray-900">{n} teams</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="block">
            <span className="text-xs text-gray-400">Entry Token</span>
            <select
              value={entryToken}
              onChange={e => setEntryToken(e.target.value as EntryToken)}
              className="w-full mt-1 bg-gray-1A border border-gray-800 rounded px-3 py-2 text-sm"
            >
              {Object.keys(TOKEN_CONFIG).map(token => {
                const live = isTokenLive(token)
                const info = TOKEN_INFO[token as keyof typeof TOKEN_INFO]
                return (
                  <option key={token} value={token} disabled={!live} className="bg-gray-900">
                    {info?.icon || ''} {TOKEN_CONFIG[token]?.label || token}{!live ? ' (coming)' : ''}
                  </option>
                )
              })}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-400">Entry Fee</span>
            <input
              type="number"
              value={entryFee}
              onChange={e => setEntryFee(Number(e.target.value))}
              min={1}
              className="w-full mt-1 bg-gray-1A border border-gray-800 rounded px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="text-[11px] text-gray-500 mb-4 bg-black/40 border border-gray-800 rounded p-3">
          Default prize split: 1st 60% · 2nd 25% · 3rd 10% · 5% platform fee · 0.05% SoundChain fee<br />
          Smart contract: <code className="text-cyan-400">FantasyLeagueEscrow.sol</code> (deployment pending)<br />
          Phase 1 ships off-chain escrow via arena backend wallet — same pattern as challenge matches.
        </div>

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded py-2 font-bold text-sm flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create League'}
        </button>
      </div>
    </div>
  )
}
