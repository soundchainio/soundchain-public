import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'
import { HighlightsStrip } from '@/components/HighlightsStrip'

// FIFA World Cup 2026 team landing page — everything a fan needs to follow their
// country: crest + colors, full 26-man squad by position, recent/upcoming
// fixtures, and World Cup footage. ESPN site.api is CORS-open so we fetch the
// team + roster + schedule straight from the browser.

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'

type Player = { id: string; name: string; pos: string; jersey?: string; age?: number; flag?: string; headshot?: string }
type TeamData = {
  name: string
  color: string
  alt: string
  logo: string
  record?: string
  squad: { group: string; players: Player[] }[]
  events: { id: string; date: string; name: string; short: string; state: string }[]
}

const POS_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Coach']

async function loadTeam(id: string): Promise<TeamData | null> {
  try {
    const [tRes, rRes] = await Promise.all([
      fetch(`${ESPN}/teams/${id}`),
      fetch(`${ESPN}/teams/${id}/roster`),
    ])
    if (!tRes.ok) return null
    const tj = await tRes.json()
    const t = tj.team || {}
    const logo = t.logos?.[0]?.href || ''
    const record = t.record?.items?.[0]?.summary

    // Roster: ESPN returns either a flat athletes[] or grouped [{position, items}]
    const groups: Record<string, Player[]> = {}
    if (rRes.ok) {
      const rj = await rRes.json()
      const raw = rj.athletes || []
      const flat = Array.isArray(raw) && raw.length && raw[0]?.displayName
        ? raw
        : raw.flatMap((g: any) => g.items || [])
      for (const p of flat) {
        const posName = p.position?.name || p.position?.displayName || 'Squad'
        const pl: Player = {
          id: String(p.id),
          name: p.displayName || p.fullName || '',
          pos: p.position?.abbreviation || '',
          jersey: p.jersey,
          age: p.age,
          headshot: p.headshot?.href,
        }
        ;(groups[posName] ||= []).push(pl)
      }
    }
    const squad = Object.entries(groups)
      .sort((a, b) => {
        const ia = POS_ORDER.indexOf(a[0]); const ib = POS_ORDER.indexOf(b[0])
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      })
      .map(([group, players]) => ({ group, players }))

    // Recent + upcoming events from the team's nextEvent/schedule
    const events = (t.nextEvent || []).slice(0, 6).map((e: any) => {
      const c = e.competitions?.[0] || {}
      return {
        id: e.id,
        date: e.date,
        name: e.name || e.shortName || '',
        short: e.shortName || '',
        state: c.status?.type?.state || 'pre',
      }
    })

    return {
      name: t.displayName || t.name || 'Team',
      color: t.color ? `#${t.color}` : '#dc2626',
      alt: t.alternateColor ? `#${t.alternateColor}` : '#111827',
      logo,
      record,
      squad,
      events,
    }
  } catch {
    return null
  }
}

export default function WorldCupTeamPage() {
  const router = useRouter()
  const id = typeof router.query.id === 'string' ? router.query.id : ''
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    loadTeam(id).then((d) => { if (!cancelled) { setData(d); setLoading(false) } })
    return () => { cancelled = true }
  }, [id])

  return (
    <ArenaShell>
      <Head><title>{data?.name ? `${data.name} · World Cup 2026` : 'Team · World Cup 2026'} · Arena</title></Head>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link href="/worldcup" className="inline-flex items-center gap-1.5 text-xs font-bold text-arena-muted-l dark:text-arena-muted-d hover:text-arena-red mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> World Cup
        </Link>

        {loading ? (
          <div className="rounded-2xl border border-arena-border-l dark:border-arena-border-d p-10 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-arena-muted-l dark:text-arena-muted-d" />
          </div>
        ) : !data ? (
          <div className="rounded-2xl border border-arena-border-l dark:border-arena-border-d p-8 text-center text-sm text-arena-muted-l dark:text-arena-muted-d">
            Couldn’t load this team. <Link href="/worldcup" className="text-arena-red font-bold">Back to the dash</Link>.
          </div>
        ) : (
          <>
            {/* hero */}
            <div className="relative overflow-hidden rounded-2xl border border-arena-border-l dark:border-arena-border-d p-6 mb-5"
              style={{ background: `linear-gradient(135deg, ${data.color}22, ${data.alt}22)` }}>
              <div className="flex items-center gap-4">
                {data.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.logo} alt="" className="w-16 h-16 object-contain" />
                )}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black">{data.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-block w-4 h-4 rounded-full border border-white/30" style={{ background: data.color }} />
                    <span className="text-xs font-mono text-arena-muted-l dark:text-arena-muted-d">FIFA World Cup 2026{data.record ? ` · ${data.record}` : ''}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* fixtures */}
            {data.events.length > 0 && (
              <section className="mb-5">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-2">Fixtures</h2>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {data.events.map((e) => (
                    <div key={e.id} className="flex-shrink-0 rounded-xl border border-arena-border-l dark:border-arena-border-d px-3 py-2 bg-arena-card dark:bg-arena-surface min-w-[150px]">
                      <div className="text-[10px] text-arena-muted-l dark:text-arena-muted-d">{new Date(e.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {e.state === 'in' ? 'LIVE' : e.state === 'post' ? 'FT' : 'Upcoming'}</div>
                      <div className="text-xs font-bold mt-0.5 truncate">{e.short || e.name}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* squad */}
            <section className="mb-6">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-2">Squad</h2>
              {data.squad.length === 0 ? (
                <p className="text-sm text-arena-muted-l dark:text-arena-muted-d">Squad not announced yet — check back closer to kickoff.</p>
              ) : (
                <div className="space-y-4">
                  {data.squad.map((grp) => (
                    <div key={grp.group}>
                      <h3 className="text-[11px] font-black uppercase tracking-wider text-arena-red mb-1.5">{grp.group}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {grp.players.map((p) => (
                          <div key={p.id} className="flex items-center gap-2 rounded-lg border border-arena-border-l dark:border-arena-border-d px-2.5 py-2 bg-arena-card dark:bg-arena-surface">
                            {p.headshot ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.headshot} alt="" loading="lazy" className="w-8 h-8 rounded-full object-cover bg-arena-paper dark:bg-arena-carbon flex-shrink-0" />
                            ) : (
                              <span className="w-8 h-8 rounded-full bg-arena-paper dark:bg-arena-carbon flex items-center justify-center text-[10px] font-black flex-shrink-0">{p.jersey || '–'}</span>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate">{p.name}</div>
                              <div className="text-[10px] text-arena-muted-l dark:text-arena-muted-d">{p.pos}{p.age ? ` · ${p.age}` : ''}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* footage */}
            <section>
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-2">World Cup footage</h2>
              <HighlightsStrip sport={'fifaWorld' as any} limit={12} />
            </section>
          </>
        )}
      </div>
    </ArenaShell>
  )
}
