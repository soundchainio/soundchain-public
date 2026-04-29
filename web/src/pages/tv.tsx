/**
 * /tv — display-mode debug + introspection page.
 *
 * Shows: detected mode, viewport width, breakpoint, override state, UA, /api/display-info
 * round-trip. Frank uses this when plugging a phone into a venue projector to verify the
 * Frames override took effect; agents use it as a single URL to read frame state from.
 */
import { useEffect, useState } from 'react'
import Head from 'next/head'
import {
  DisplayMode,
  DisplayModeOverride,
  detectDisplayMode,
  getOverride,
  setOverride as setDisplayOverride,
  labelForOverride,
  getScreenSnapshot,
  getLargeLandscapeViewport,
  DISPLAY_MODE_OVERRIDE_EVENT,
} from 'lib/tvMode'

const FRAME_OPTIONS: DisplayModeOverride[] = ['auto', 'mobile', 'desktop', 'tv', 'projector', 'vr', 'kiosk']

const breakpointOf = (w: number): string => {
  if (w >= 1536) return '2xl (≥1536px)'
  if (w >= 1280) return 'xl (≥1280px)'
  if (w >= 1024) return 'lg (≥1024px)'
  if (w >= 768)  return 'md (≥768px)'
  if (w >= 640)  return 'sm (≥640px)'
  return 'base (<640px)'
}

export default function TvDebugPage() {
  const [mode, setMode] = useState<DisplayMode>('standard')
  const [override, setOverrideState] = useState<DisplayModeOverride>('auto')
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [screenW, setScreenW] = useState(0)
  const [screenH, setScreenH] = useState(0)
  const [dpr, setDpr] = useState(1)
  const [appliedViewport, setAppliedViewport] = useState('')
  const [computedTvViewport, setComputedTvViewport] = useState('')
  const [ua, setUA] = useState('')
  const [serverInfo, setServerInfo] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const apply = () => {
      setMode(detectDisplayMode())
      setOverrideState(getOverride() || 'auto')
      setWidth(window.innerWidth)
      setHeight(window.innerHeight)
      const snap = getScreenSnapshot()
      setScreenW(snap.screenWidth)
      setScreenH(snap.screenHeight)
      setDpr(snap.dpr)
      setComputedTvViewport(getLargeLandscapeViewport())
      const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null
      setAppliedViewport(meta?.content || '—')
      setUA(window.navigator.userAgent)
    }
    apply()
    window.addEventListener('resize', apply)
    window.addEventListener(DISPLAY_MODE_OVERRIDE_EVENT, apply as EventListener)
    return () => {
      window.removeEventListener('resize', apply)
      window.removeEventListener(DISPLAY_MODE_OVERRIDE_EVENT, apply as EventListener)
    }
  }, [])

  const fetchServer = async () => {
    setLoading(true)
    try {
      const url = `/api/display-info?clientMode=${encodeURIComponent(mode)}&clientWidth=${width}&clientOverride=${encodeURIComponent(override)}`
      const r = await fetch(url)
      const data = await r.json()
      setServerInfo(data)
    } catch (e) {
      setServerInfo({ error: String(e) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>Frame Debug — SoundChain</title></Head>
      <div className="min-h-screen bg-black text-white p-6 font-mono">
        <div className="max-w-3xl mx-auto space-y-6">
          <header>
            <h1 className="text-2xl font-black tracking-tight">FRAME DEBUG</h1>
            <p className="text-xs text-gray-500 mt-1">Live display-mode introspection. Bookmark this URL on any device.</p>
          </header>

          <section className="rounded-xl border border-cyan-500/30 bg-black/60 p-4 space-y-2">
            <h2 className="text-[11px] uppercase tracking-widest text-cyan-400">Client (this device)</h2>
            <Row label="Detected mode" value={mode} highlight />
            <Row label="Override" value={override === 'auto' ? 'auto (unset)' : labelForOverride(override)} highlight={override !== 'auto'} />
            <Row label="screen.width × height" value={`${screenW} × ${screenH}`} highlight />
            <Row label="window.innerWidth × innerHeight" value={`${width} × ${height}`} />
            <Row label="devicePixelRatio" value={String(dpr)} />
            <Row label="Tailwind breakpoint (innerWidth)" value={breakpointOf(width)} />
            <Row label="Applied viewport meta" value={appliedViewport} mono />
            <Row label="Computed TV viewport (would-be)" value={computedTvViewport} mono />
            <Row label="data-display-mode" value={typeof document !== 'undefined' ? (document.documentElement.dataset.displayMode || '—') : '—'} />
            <Row label="data-display-override" value={typeof document !== 'undefined' ? (document.documentElement.dataset.displayOverride || '—') : '—'} />
            <Row label="data-tv (legacy)" value={typeof document !== 'undefined' ? (document.documentElement.dataset.tv || '—') : '—'} />
            <Row label="UA" value={ua} mono />
          </section>

          <section className="rounded-xl border border-amber-500/30 bg-black/60 p-4 space-y-3">
            <h2 className="text-[11px] uppercase tracking-widest text-amber-400">Override (Frames)</h2>
            <p className="text-[10px] text-gray-500">Same control as Avatar → Frames. Persists to localStorage.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FRAME_OPTIONS.map(o => (
                <button
                  key={o}
                  onClick={() => setDisplayOverride(o)}
                  className={`text-[11px] py-2 px-2 rounded border transition ${
                    override === o
                      ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                      : 'border-white/10 hover:border-amber-500/40 text-gray-400 hover:text-white'
                  }`}
                >
                  {labelForOverride(o)}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-purple-500/30 bg-black/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] uppercase tracking-widest text-purple-400">Server (UA-based)</h2>
              <button
                onClick={fetchServer}
                disabled={loading}
                className="text-[10px] px-3 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-200 disabled:opacity-50"
              >
                {loading ? 'Fetching…' : 'Hit /api/display-info'}
              </button>
            </div>
            {serverInfo ? (
              <pre className="text-[10px] text-gray-300 bg-black/60 rounded p-3 overflow-x-auto">{JSON.stringify(serverInfo, null, 2)}</pre>
            ) : (
              <p className="text-[10px] text-gray-500">Tap above to read what the server sees vs. what this client reports.</p>
            )}
          </section>

          <footer className="text-[10px] text-gray-600">
            <p>For agents: <code className="text-cyan-400">document.documentElement.dataset.displayMode</code> and <code className="text-cyan-400">/api/display-info?clientMode=…&amp;clientWidth=…&amp;clientOverride=…</code>.</p>
          </footer>
        </div>
      </div>
    </>
  )
}

const Row = ({ label, value, highlight, mono }: { label: string; value: string; highlight?: boolean; mono?: boolean }) => (
  <div className="flex items-start justify-between gap-3 text-xs">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span className={`text-right break-all ${highlight ? 'text-cyan-300 font-bold' : 'text-gray-200'} ${mono ? 'text-[10px]' : ''}`}>{value}</span>
  </div>
)
