/**
 * QuartersRail — the hull rail beside the quarters viewport (Profile capsule)
 *
 * Frank's spec (Jun 12): the wall-art space becomes a RAIL of pics / gifs /
 * clips from this user's personal collection — scrollable (especially mobile),
 * tap a card to expand it for full view, and blank dashed cards inviting the
 * owner to upload more. Wired to the profile's real posted media via the same
 * Vercel-direct /api/feed/posts route the feeds use (track artwork, uploaded
 * images/carousels, raw gif/video links). Read-only — no new write paths.
 *
 * Desktop: vertical 2-col scrollable column beside the window.
 * Mobile: horizontal snap rail under the window.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X, Film, Pencil, Check, Loader2 } from 'lucide-react'
import { useUpload } from 'hooks/useUpload'
import { toast } from 'react-toastify'

interface RailItem {
  src: string
  kind: 'image' | 'video'
  label?: string
}

const IMG_RE = /\.(jpe?g|png|gif|webp|avif)(\?|$)/i
const VID_RE = /\.(mp4|mov|webm)(\?|$)/i
const MAX_BYTES = 200 * 1024 * 1024 // 200MB per card (Frank's spec)

export function QuartersRail({ profileId, isOwn, onInvite, customItems, onSaveCustom }: {
  profileId?: string
  isOwn?: boolean
  onInvite?: () => void
  /** owner-curated rail (profile.quartersRail) — overrides the derived feed media */
  customItems?: RailItem[] | null
  /** persist the curated rail (e.g. POST /api/profile/update) */
  onSaveCustom?: (items: RailItem[]) => Promise<void>
}) {
  const [items, setItems] = useState<RailItem[]>([])
  const [open, setOpen] = useState<RailItem | null>(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { upload } = useUpload()

  // Owner-curated rail wins; derived feed media is the fallback ONLY when the
  // owner has never curated (customItems == null). An intentionally EMPTY
  // curated rail ([]) must stay empty — otherwise deleting the derived cards
  // just re-derives them ("delete doesn't save" / phantom album covers).
  useEffect(() => {
    if (Array.isArray(customItems)) setItems(customItems.filter(i => i?.src))
  }, [customItems])

  const persist = async (next: RailItem[]) => {
    setItems(next)
    if (!onSaveCustom) return
    try { await onSaveCustom(next) } catch { toast.error('Rail save failed — try again') }
  }

  const removeAt = (idx: number) => {
    persist(items.filter((_, i) => i !== idx))
  }

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_BYTES) { toast.error('Max 200MB per card'); return }
    const isVideo = file.type.startsWith('video/')
    if (!isVideo && !file.type.startsWith('image/')) { toast.error('Pics, GIFs or clips only'); return }
    setBusy(true)
    try {
      const url = await upload([file])
      if (!url) throw new Error('no url')
      await persist([...items, { src: url, kind: isVideo ? 'video' : 'image' }])
    } catch {
      toast.error('Upload failed — try again')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!profileId) return
    if (Array.isArray(customItems)) return // owner-curated (incl. empty) — never derive
    let dead = false
    ;(async () => {
      try {
        const r = await fetch(`/api/feed/posts?profileId=${encodeURIComponent(profileId)}&limit=30`, { credentials: 'include' })
        if (!r.ok) return
        const data = await r.json()
        const seen = new Set<string>()
        const out: RailItem[] = []
        for (const p of data?.posts || []) {
          const push = (src?: string | null, kind?: 'image' | 'video', label?: string) => {
            if (!src || !kind || seen.has(src) || out.length >= 18) return
            seen.add(src)
            out.push({ src, kind, label })
          }
          // uploaded media (incl. IG-style carousels)
          for (const u of (p.uploadedMediaUrls || [])) {
            push(u, VID_RE.test(u) ? 'video' : 'image')
          }
          if (p.mediaLink && IMG_RE.test(p.mediaLink)) push(p.mediaLink, 'image')
          else if (p.mediaLink && VID_RE.test(p.mediaLink)) push(p.mediaLink, 'video')
          if (p.track?.artworkUrl) push(p.track.artworkUrl, 'image', p.track.title)
        }
        if (!dead) setItems(out)
      } catch { /* rail is decorative-plus — fail silent */ }
    })()
    return () => { dead = true }
  }, [profileId, customItems])

  // One rail, one placement: a horizontal strip beside the avatar (Frank
  // Jun 12 round 2 — the upper-right desktop column is gone). One invite
  // card max, own profile only.
  const inviteCount = isOwn ? 1 : 0
  const blanks = useMemo(() => Array.from({ length: inviteCount }), [inviteCount])
  if (items.length === 0 && inviteCount === 0) return null

  return (
    <>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex gap-2 overflow-x-auto snap-x scrollbar-hide pb-0.5">
          {items.map((it, i) => (
            <div key={it.src} className="relative flex-shrink-0 snap-start">
              <button
                onClick={() => (editing ? undefined : setOpen(it))}
                title={it.label || 'View'}
                className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 overflow-hidden bg-[#0c0916] active:scale-95 transition-all ${editing ? 'border-[#ff3d9a]/40' : 'border-[#221a36] hover:border-[#37e6ff]/50'}`}
                style={{ transform: `rotate(${i % 3 === 0 ? '-1deg' : i % 3 === 1 ? '0.7deg' : '-0.3deg'})`, boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5), 0 2px 5px #000' }}
              >
                {it.kind === 'video' ? (
                  <>
                    <video src={it.src} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                    <Film className="absolute bottom-1 right-1 w-3 h-3 text-white/70" />
                  </>
                ) : (
                  <img src={it.src} alt="" className="w-full h-full object-cover" loading="lazy" />
                )}
              </button>
              {editing && (
                <button
                  onClick={() => removeAt(i)}
                  aria-label="Remove from rail"
                  className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-red-500 border border-black flex items-center justify-center text-white shadow-lg active:scale-90"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {(editing || items.length === 0) && blanks.map((_, i) => (
            <button
              key={`b${i}`}
              onClick={() => (editing ? fileRef.current?.click() : onInvite?.())}
              disabled={busy}
              title={editing ? 'Add a pic, GIF or clip (200MB max)' : 'Add to your collection'}
              className="flex-shrink-0 snap-start w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed border-white/15 hover:border-[#ff3d9a]/50 bg-white/[0.02] flex items-center justify-center text-white/30 hover:text-[#ff3d9a] active:scale-95 transition-all disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono tracking-[0.3em] text-white/25 uppercase">Collection Rail · Tap to View</span>
          {isOwn && onSaveCustom && (
            <button
              onClick={() => setEditing(e => !e)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[7px] font-mono tracking-[0.2em] uppercase transition-all ${
                editing ? 'border-[#b8ff4d]/60 text-[#b8ff4d]' : 'border-white/15 text-white/40 hover:text-white/70 hover:border-white/30'
              }`}
            >
              {editing ? (<><Check className="w-2.5 h-2.5" />Done</>) : (<><Pencil className="w-2.5 h-2.5" />Edit</>)}
            </button>
          )}
        </div>
        {/* hidden picker — pics/gifs/clips, 200MB max, straight to IPFS */}
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={onPick} />
      </div>

      {/* expand-for-view lightbox */}
      {open && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <button
            onClick={() => setOpen(null)}
            aria-label="Close"
            className="fixed top-3 right-3 z-[310] flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-black/70 border border-orange-400/60 text-orange-300 hover:text-white backdrop-blur-md shadow-lg"
            style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <X className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Close</span>
          </button>
          <div onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full">
            {open.kind === 'video' ? (
              <video src={open.src} controls autoPlay playsInline className="max-w-full max-h-[85vh] rounded-lg" />
            ) : (
              <img src={open.src} alt={open.label || ''} className="max-w-full max-h-[85vh] rounded-lg object-contain" />
            )}
            {open.label && <p className="mt-2 text-center text-[10px] font-mono text-white/60 truncate">{open.label}</p>}
          </div>
        </div>
      )}
    </>
  )
}

export default QuartersRail
