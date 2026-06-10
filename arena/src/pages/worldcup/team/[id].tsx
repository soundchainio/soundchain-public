import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, ChevronDown, ExternalLink, Youtube } from 'lucide-react'
import { ArenaShell } from '@/components/ArenaShell'
import { HighlightsStrip } from '@/components/HighlightsStrip'

// FIFA World Cup 2026 team landing page — everything a fan needs to follow their
// country: big crest + colors, the full squad as accordion player cards (tap to
// expand full bio — height/weight/DOB/birthplace/club/injury), fixtures, and WC
// footage. ESPN site.api is CORS-open so we fetch team + roster from the browser.

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'

type Player = {
  id: string; name: string; first: string; last: string; pos: string; jersey?: string
  age?: number; dob?: string; height?: string; weight?: string
  birthplace?: string; citizenship?: string; club?: string
  headshot?: string; flag?: string; injury?: string; espn?: string
}
type TeamData = {
  name: string; color: string; alt: string; logo: string; record?: string
  squad: { group: string; players: Player[] }[]
  events: { id: string; date: string; short: string; state: string }[]
}

const POS_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Coach']

// Open-source initials avatar for players ESPN has no headshot for — so the
// squad never shows blank tiles.
function fallbackAvatar(name: string, color: string) {
  const bg = (color || '111827').replace('#', '')
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=${bg}&color=fff&bold=true&format=png`
}

async function loadTeam(id: string): Promise<TeamData | null> {
  try {
    const [tRes, rRes] = await Promise.all([fetch(`${ESPN}/teams/${id}`), fetch(`${ESPN}/teams/${id}/roster`)])
    if (!tRes.ok) return null
    const t = (await tRes.json()).team || {}
    const logo = t.logos?.[0]?.href || ''
    const color = t.color ? `#${t.color}` : '#dc2626'
    const record = t.record?.items?.[0]?.summary

    const groups: Record<string, Player[]> = {}
    if (rRes.ok) {
      const raw = (await rRes.json()).athletes || []
      const flat = Array.isArray(raw) && raw.length && raw[0]?.displayName ? raw : raw.flatMap((g: any) => g.items || [])
      for (const p of flat) {
        const posName = p.position?.name || 'Squad'
        ;(groups[posName] ||= []).push({
          id: String(p.id),
          name: p.displayName || p.fullName || '',
          first: p.firstName || '', last: p.lastName || '',
          pos: p.position?.abbreviation || '',
          jersey: p.jersey,
          age: p.age,
          dob: p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : undefined,
          height: p.displayHeight,
          weight: p.displayWeight,
          birthplace: [p.birthPlace?.city, p.birthPlace?.country].filter(Boolean).join(', ') || undefined,
          citizenship: p.citizenshipCountry?.name || p.citizenship,
          club: p.defaultTeam?.displayName && p.defaultTeam?.displayName !== (t.displayName) ? p.defaultTeam.displayName : undefined,
          headshot: p.headshot?.href,
          flag: p.flag?.href,
          injury: p.injuries?.[0]?.status || (p.status?.name && p.status.name !== 'Active' ? p.status.name : undefined),
          espn: p.links?.find((l: any) => l.rel?.includes('playercard'))?.href || p.links?.[0]?.href,
        })
      }
    }
    const squad = Object.entries(groups)
      .sort((a, b) => (POS_ORDER.indexOf(a[0]) + 1 || 99) - (POS_ORDER.indexOf(b[0]) + 1 || 99))
      .map(([group, players]) => ({ group, players }))

    const events = (t.nextEvent || []).slice(0, 8).map((e: any) => ({
      id: e.id, date: e.date, short: e.shortName || e.name || '',
      state: e.competitions?.[0]?.status?.type?.state || 'pre',
    }))

    return { name: t.displayName || 'Team', color, alt: t.alternateColor ? `#${t.alternateColor}` : '#111827', logo, record, squad, events }
  } catch { return null }
}

function PlayerCard({ p, color, teamName }: { p: Player; color: string; teamName: string }) {
  const [open, setOpen] = useState(false)
  const img = p.headshot || fallbackAvatar(p.name, color)
  const ytSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${p.name} ${teamName} highlights`)}`
  return (
    <div className={`rounded-xl border bg-arena-card dark:bg-arena-surface overflow-hidden transition ${open ? 'border-arena-red' : 'border-arena-border-l dark:border-arena-border-d'}`}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-arena-paper/50 dark:hover:bg-arena-carbon/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" loading="lazy" className="w-10 h-10 rounded-full object-cover bg-arena-paper dark:bg-arena-carbon flex-shrink-0"
          onError={(e) => { const i = e.target as HTMLImageElement; if (!i.dataset.fb) { i.dataset.fb = '1'; i.src = fallbackAvatar(p.name, color) } }} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate">{p.name}</div>
          <div className="text-[11px] text-arena-muted-l dark:text-arena-muted-d">{p.pos}{p.age ? ` · ${p.age}y` : ''}{p.club ? ` · ${p.club}` : ''}</div>
        </div>
        {p.jersey && <span className="text-base font-black text-arena-muted-l dark:text-arena-muted-d tabular-nums flex-shrink-0">{p.jersey}</span>}
        <ChevronDown className={`w-4 h-4 text-arena-muted-l dark:text-arena-muted-d flex-shrink-0 transition ${open ? 'rotate-180 text-arena-red' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-arena-border-l dark:border-arena-border-d">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-2">
            {([['Position', p.pos], ['Number', p.jersey], ['Age', p.age ? `${p.age}` : null], ['Born', p.dob], ['Height', p.height], ['Weight', p.weight], ['Birthplace', p.birthplace], ['Nationality', p.citizenship], ['Club', p.club], ['Status', p.injury]] as [string, any][])
              .filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><div className="text-[9px] uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d">{k}</div><div className="text-xs font-bold">{v}</div></div>
              ))}
          </div>
          <div className="flex gap-2 mt-3">
            <a href={ytSearch} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-arena-red/15 text-arena-red border border-arena-red/40 hover:bg-arena-red/25">
              <Youtube className="w-3 h-3" /> Highlights
            </a>
            {p.espn && (
              <a href={p.espn} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full border border-arena-border-l dark:border-arena-border-d text-arena-muted-l dark:text-arena-muted-d hover:border-arena-red hover:text-arena-red">
                <ExternalLink className="w-3 h-3" /> Profile
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
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
          <div className="rounded-2xl border border-arena-border-l dark:border-arena-border-d p-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-arena-muted-l dark:text-arena-muted-d" /></div>
        ) : !data ? (
          <div className="rounded-2xl border border-arena-border-l dark:border-arena-border-d p-8 text-center text-sm text-arena-muted-l dark:text-arena-muted-d">Couldn’t load this team. <Link href="/worldcup" className="text-arena-red font-bold">Back to the dash</Link>.</div>
        ) : (
          <>
            {/* full-width crest hero */}
            <div className="relative overflow-hidden rounded-2xl border border-arena-border-l dark:border-arena-border-d mb-5"
              style={{ background: `linear-gradient(135deg, ${data.color}, ${data.alt})` }}>
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative flex items-center gap-5 p-6 sm:p-8">
                {data.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.logo} alt="" className="w-24 h-24 sm:w-32 sm:h-32 object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]" />
                )}
                <div>
                  <h1 className="text-3xl sm:text-5xl font-black text-white drop-shadow leading-none">{data.name}</h1>
                  <div className="text-xs font-mono text-white/80 mt-2">FIFA World Cup 2026{data.record ? ` · ${data.record}` : ''} · {data.squad.reduce((n, g) => n + g.players.length, 0)} players</div>
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
                      <div className="text-xs font-bold mt-0.5 truncate">{e.short}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* squad — accordion player cards */}
            <section className="mb-6">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-arena-muted-l dark:text-arena-muted-d mb-2">Squad · tap a player</h2>
              {data.squad.length === 0 ? (
                <p className="text-sm text-arena-muted-l dark:text-arena-muted-d">Squad not announced yet — check back closer to kickoff.</p>
              ) : (
                <div className="space-y-4">
                  {data.squad.map((grp) => (
                    <div key={grp.group}>
                      <h3 className="text-[11px] font-black uppercase tracking-wider text-arena-red mb-1.5">{grp.group} · {grp.players.length}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {grp.players.map((p) => <PlayerCard key={p.id} p={p} color={data.color} teamName={data.name} />)}
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
