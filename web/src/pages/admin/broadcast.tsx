/**
 * /admin/broadcast — Frank-only composer for SoundChain-native broadcasts.
 *
 * Drafts a message → picks an audience → sees the recipient count →
 * "Send test to me" first → then "Send to all" with confirmation.
 * Fans out to Pulse inbox + WebPush + Nostr DM in parallel per recipient
 * (see /api/broadcasts/send for the engine).
 *
 * Auth: server-side gates the actual send. Client just shows the UI;
 * non-admins get a 403 from the API. UI still renders so admins can navigate
 * here without redirect dance.
 *
 * Pre-filled with WELCOME_NEW_USER + WELCOME_RETURNING_L1 templates from
 * lib/broadcasts/welcomeManual — Frank can edit + send straight away.
 */
import Head from 'next/head'
import { useEffect, useMemo, useState } from 'react'
import {
  WELCOME_NEW_USER,
  WELCOME_RETURNING_L1,
  AUDIENCE,
  type Audience,
} from 'lib/broadcasts/welcomeManual'
import { Send, Eye, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

const TEMPLATES = [
  { id: 'welcome_new', label: 'Welcome — New Signup', payload: WELCOME_NEW_USER },
  { id: 'welcome_l1', label: 'Welcome Back — Returning L1 Invitee', payload: WELCOME_RETURNING_L1 },
  { id: 'blank', label: 'Blank — Compose your own', payload: { fromHandle: 'soundchain', fromDisplayName: 'SoundChain', pushTitle: '', pushBody: '', body: '' } },
] as const

const AUDIENCE_OPTIONS: { id: Audience; label: string; warn?: boolean }[] = [
  { id: AUDIENCE.SELF, label: 'Send test to me only' },
  { id: AUDIENCE.NEW_SIGNUPS, label: 'New signups (after Feb 2026 mainnet)' },
  { id: AUDIENCE.RETURNING_L1, label: 'Returning L1 testnet invitees' },
  { id: AUDIENCE.ALL, label: 'EVERY user with a profile', warn: true },
]

export default function BroadcastAdminPage() {
  const [templateId, setTemplateId] = useState<string>('welcome_new')
  const tpl = useMemo(() => TEMPLATES.find((t) => t.id === templateId)!.payload, [templateId])

  const [pushTitle, setPushTitle] = useState(tpl.pushTitle)
  const [pushBody, setPushBody] = useState(tpl.pushBody)
  const [body, setBody] = useState(tpl.body)

  // Reset draft when template changes
  useEffect(() => {
    setPushTitle(tpl.pushTitle)
    setPushBody(tpl.pushBody)
    setBody(tpl.body)
  }, [tpl])

  const [audience, setAudience] = useState<Audience>(AUDIENCE.SELF)
  const [audienceCount, setAudienceCount] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(false)

  // Fetch audience count on audience change
  useEffect(() => {
    setAudienceCount(null)
    setCountLoading(true)
    fetch(`/api/broadcasts/audience-count?audience=${audience}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setAudienceCount(typeof d.count === 'number' ? d.count : null))
      .catch(() => setAudienceCount(null))
      .finally(() => setCountLoading(false))
  }, [audience])

  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async (dryRun: boolean) => {
    if (!body.trim()) {
      setError('Message body is required')
      return
    }
    if (audience === AUDIENCE.ALL && !dryRun) {
      const confirmed = window.confirm(
        `Blast to ALL ~${audienceCount ?? '?'} users via in-app inbox + WebPush + Nostr DM. This is irreversible. Type "send" to confirm.`,
      )
      if (!confirmed) return
      const typed = window.prompt('Type "send" to confirm.')
      if (typed?.toLowerCase() !== 'send') return
    }

    setSending(true)
    setError(null)
    setResult(null)
    try {
      const r = await fetch('/api/broadcasts/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience, pushTitle, pushBody, body, dryRun }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data?.error || `HTTP ${r.status}`)
      } else {
        setResult(data)
      }
    } catch (err: any) {
      setError(err?.message || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Head>
        <title>Admin · Broadcast · SoundChain</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className="min-h-screen bg-black text-white antialiased">
        <header className="border-b border-white/10 sticky top-0 z-10 bg-black/80 backdrop-blur">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <h1 className="text-base font-black tracking-tight">📡 Broadcast Composer</h1>
            <span className="ml-auto text-[10px] font-mono uppercase tracking-[0.25em] text-cyan-300/70">
              Admin · v1
            </span>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          {/* Template picker */}
          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-white/60 block mb-2">
              Template
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/20 text-white text-sm"
            >
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-white/40 mt-2">
              Templates live in <code className="text-cyan-300">lib/broadcasts/welcomeManual.ts</code>. Edit there + redeploy to update defaults.
            </p>
          </section>

          {/* Push title + body */}
          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
              Push notification (lock screen + browser banner)
            </h2>
            <div>
              <label className="text-[11px] text-white/50 block mb-1">Title</label>
              <input
                type="text"
                maxLength={80}
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/20 text-white text-sm"
              />
              <p className="text-[10px] text-white/30 mt-1">{pushTitle.length} / 80</p>
            </div>
            <div>
              <label className="text-[11px] text-white/50 block mb-1">Body preview (≤120 chars)</label>
              <textarea
                rows={2}
                maxLength={120}
                value={pushBody}
                onChange={(e) => setPushBody(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/20 text-white text-sm resize-none"
              />
              <p className="text-[10px] text-white/30 mt-1">{pushBody.length} / 120</p>
            </div>
          </section>

          {/* Full body */}
          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                Full message body (Pulse + Nostr DM)
              </h2>
              <span className="text-[10px] text-white/30">{body.length} / 8000</span>
            </div>
            <textarea
              rows={20}
              maxLength={8000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/20 text-white text-[13px] font-mono leading-relaxed"
            />
            <p className="text-[11px] text-white/40">
              Plain text + emoji. Renders as a Pulse DM from <code className="text-cyan-300">@soundchain</code> + as the body of a Nostr NIP-17 encrypted DM.
            </p>
          </section>

          {/* Audience picker */}
          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
              Audience
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {AUDIENCE_OPTIONS.map((opt) => {
                const active = audience === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAudience(opt.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition ${
                      active
                        ? opt.warn
                          ? 'border-red-500/60 bg-red-500/10 text-red-200'
                          : 'border-cyan-400/60 bg-cyan-400/10 text-cyan-200'
                        : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/30'
                    }`}
                  >
                    <span className="text-sm font-bold flex-1">{opt.label}</span>
                    {opt.warn && <AlertTriangle className="w-4 h-4 text-red-300" />}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2 text-[12px] text-white/60">
              <span className="font-mono">Recipients:</span>
              {countLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-cyan-300" />
              ) : (
                <span className="font-bold text-cyan-300 arena-tabular">
                  {audienceCount === null ? '—' : audienceCount.toLocaleString()}
                </span>
              )}
            </div>
          </section>

          {/* Action buttons */}
          <section className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={sending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-sm font-bold disabled:opacity-50 transition"
            >
              <Eye className="w-4 h-4" />
              Dry run (count + sample)
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={sending || !body.trim()}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-black tracking-wide transition disabled:opacity-50 ${
                audience === AUDIENCE.ALL
                  ? 'bg-red-500 hover:bg-red-400 text-white'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black'
              }`}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {audience === AUDIENCE.ALL ? 'BLAST TO ALL' : 'Send'}
            </button>
          </section>

          {/* Result / error */}
          {error && (
            <section className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-200">
              {error}
            </section>
          )}

          {result && (
            <section className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 px-4 py-4 space-y-2">
              <div className="flex items-center gap-2 text-cyan-200 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                {result.dryRun ? 'Dry run complete' : 'Broadcast sent'}
              </div>
              <div className="text-[12px] font-mono text-white/70 space-y-1">
                <div>Audience: <span className="text-white">{result.audience}</span></div>
                <div>Total recipients: <span className="text-white">{result.totalRecipients?.toLocaleString()}</span></div>
                {result.sent && (
                  <>
                    <div>Pulse inbox: <span className="text-cyan-300">{result.sent.inApp}</span> sent · {result.failed?.inApp ?? 0} failed</div>
                    <div>Web Push: <span className="text-cyan-300">{result.sent.push}</span> sent · {result.failed?.push ?? 0} failed</div>
                    <div>Nostr DM: <span className="text-cyan-300">{result.sent.nostr}</span> sent · {result.failed?.nostr ?? 0} failed</div>
                  </>
                )}
                {result.dryRunSamples && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-white/60">Sample recipients ({result.dryRunSamples.length})</summary>
                    <pre className="text-[10px] text-white/50 mt-2 overflow-x-auto">
                      {JSON.stringify(result.dryRunSamples, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </section>
          )}

          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/30 text-center pt-2">
            SoundChain-native broadcasts · zero external service · powered by Pulse + WebPush + Nostr
          </div>
        </div>
      </main>
    </>
  )
}
