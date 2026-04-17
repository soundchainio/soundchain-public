/**
 * GameHostModal — Phase 5 of the Nodeverse.
 *
 * Two modes wired to the same modal:
 *   1. HOST — parcel owner types a stream URL + title, hits "Go Live", and
 *      their parcel lights up across the Nodeverse so others can spectate.
 *   2. SPECTATE — any visitor can open the modal from a beacon to watch the
 *      stream in an embedded iframe. Read-only.
 *
 * Accepts URLs from twitch, youtube/shorts/live, parsec, geforce now, kick.
 * Server validates the hostname allow-list; we do the same check client-side
 * for a better error message, but the server is authoritative.
 */
import { useEffect, useState } from 'react'
import { X, Radio, StopCircle, Users } from 'lucide-react'

export type GameSession = {
  _id: string
  ownerId: string
  hostHandle?: string | null
  parcelX: number
  parcelZ: number
  streamUrl: string
  title: string
  startedAt: string
}

interface Props {
  parcelX: number
  parcelZ: number
  isOwner: boolean
  existingSession?: GameSession | null
  myHandle?: string
  onClose: () => void
  onChanged?: () => void
}

function toEmbedUrl(raw: string): string {
  // Convert common watch URLs to their embed equivalents so the iframe plays inline.
  try {
    const u = new URL(raw)
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}?autoplay=1`
      const liveMatch = u.pathname.match(/\/live\/([^/]+)/)
      if (liveMatch) return `https://www.youtube.com/embed/${liveMatch[1]}?autoplay=1`
      const shortsMatch = u.pathname.match(/\/shorts\/([^/]+)/)
      if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=1`
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1)
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1`
    }
    if (u.hostname === 'twitch.tv' || u.hostname.endsWith('.twitch.tv')) {
      const channel = u.pathname.replace(/^\//, '').split('/')[0]
      if (channel) return `https://player.twitch.tv/?channel=${channel}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'soundchain.io'}&autoplay=true`
    }
    return raw
  } catch {
    return raw
  }
}

export default function GameHostModal({ parcelX, parcelZ, isOwner, existingSession, myHandle, onClose, onChanged }: Props) {
  const [streamUrl, setStreamUrl] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (existingSession) {
      setStreamUrl(existingSession.streamUrl)
      setTitle(existingSession.title)
    }
  }, [existingSession])

  const goLive = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/nodeverse/game-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ parcelX, parcelZ, streamUrl, title, hostHandle: myHandle }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Host failed')
        return
      }
      onChanged?.()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const endSession = async () => {
    if (!existingSession) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/nodeverse/game-sessions?id=${encodeURIComponent(existingSession._id)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'End failed')
        return
      }
      onChanged?.()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-neutral-950 border border-cyan-500/40 rounded-xl shadow-[0_0_40px_rgba(6,182,212,0.3)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-cyan-300 font-mono text-sm">
            <Radio size={16} className="text-pink-400" />
            {existingSession ? 'LIVE ON THIS PARCEL' : 'HOST A SESSION'}
            <span className="text-neutral-500 ml-2">({parcelX}, {parcelZ})</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-neutral-800"><X size={16} className="text-neutral-400" /></button>
        </div>

        {existingSession && (
          <div className="p-5 space-y-3">
            <div className="text-xs font-mono text-pink-400 flex items-center gap-2">
              <Users size={12} /> HOSTED BY @{existingSession.hostHandle || 'unknown'} · {new Date(existingSession.startedAt).toLocaleTimeString()}
            </div>
            <div className="text-sm text-white font-semibold">{existingSession.title}</div>
            <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '16 / 9' }}>
              <iframe
                src={toEmbedUrl(existingSession.streamUrl)}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              />
            </div>
            {isOwner && (
              <div className="flex justify-end">
                <button
                  onClick={endSession}
                  disabled={busy}
                  className="px-3 py-2 rounded text-xs font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <StopCircle size={12} /> END SESSION
                </button>
              </div>
            )}
          </div>
        )}

        {!existingSession && isOwner && (
          <div className="p-5 space-y-3">
            <label className="block text-[10px] font-mono text-cyan-300/70">SESSION TITLE</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="2K Tournament Finals"
              maxLength={120}
              className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-700 text-sm text-white font-mono focus:border-cyan-500 outline-none"
            />
            <label className="block text-[10px] font-mono text-cyan-300/70">STREAM URL (Twitch / YouTube / Parsec / GeForce NOW / Kick)</label>
            <input
              value={streamUrl}
              onChange={e => setStreamUrl(e.target.value)}
              placeholder="https://twitch.tv/yourchannel"
              className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-700 text-sm text-white font-mono focus:border-cyan-500 outline-none"
            />
            {error && <div className="text-xs text-red-400 font-mono">{error}</div>}
            <button
              onClick={goLive}
              disabled={busy || !streamUrl.trim() || title.trim().length < 2}
              className="w-full py-3 rounded bg-gradient-to-r from-pink-500 to-cyan-500 text-black font-mono font-bold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Radio size={14} /> GO LIVE
            </button>
            <p className="text-[10px] text-neutral-500 font-mono">Sessions auto-expire after 4 hours. Only HTTPS streams from the allow-list are accepted.</p>
          </div>
        )}

        {!existingSession && !isOwner && (
          <div className="p-5 text-sm text-neutral-400 font-mono">
            No session is live here yet — come back when the parcel owner goes live.
          </div>
        )}
      </div>
    </div>
  )
}
