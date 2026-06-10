import { useEffect, useRef, useState } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'
import { getIdentity, setHandle, setAvatar, ARENA_AVATARS, isUrlAvatar, type Avatar } from '@/lib/identity'

/**
 * ArenaIdentityModal — establish/edit your arena identity from anywhere (header,
 * nav). Handle + avatar (sport emoji or upload your own pic via Pinata). Arena
 * is "no login, just sports" — this is the lightweight identity editor; passkey
 * / Face ID sign-in is the heavier IdentityModal (follow-up).
 */
export function ArenaIdentityModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  // getIdentity() returns null during SSR (no localStorage), so we can't seed
  // useState from it — the handle field would init empty and the Save pill stay
  // disabled forever. Seed on the client in an effect instead.
  const [handle, setHandleInput] = useState('')
  const [avatar, setAvatarInput] = useState<Avatar>(ARENA_AVATARS[0])
  const [hasHandle, setHasHandle] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = getIdentity()
    if (id.handle) { setHandleInput(id.handle); setHasHandle(true) }
    setAvatarInput(id.avatar)
  }, [])

  const upload = async (file: File) => {
    setUploading(true); setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('deviceId', getIdentity().deviceId)
      const resp = await fetch('/api/avatars/upload', { method: 'POST', body: form })
      const j = await resp.json()
      if (!resp.ok || !j.avatarUrl) { setError(j.error || 'Upload failed'); return }
      setAvatarInput(j.avatarUrl)
    } catch {
      setError('Upload failed — check your connection')
    } finally {
      setUploading(false)
    }
  }

  const save = () => {
    const r = setHandle(handle.trim())
    if (!r.ok) { setError(r.error || 'Pick a valid handle'); return }
    setAvatar(avatar)
    // Best-effort persist beyond localStorage (mirrors GameChat's handle picker).
    fetch('/api/handles/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getIdentity().deviceId, handle: r.handle, avatar }),
    }).catch(() => undefined)
    onSaved?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-sm bg-arena-paper dark:bg-arena-carbon border border-arena-border-l dark:border-arena-border-d rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="px-4 py-3 border-b border-arena-border-l dark:border-arena-border-d flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider">{id.handle ? 'Edit your profile' : 'Set up your profile'}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full border border-arena-border-l dark:border-arena-border-d flex items-center justify-center hover:border-arena-red hover:text-arena-red transition" aria-label="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </header>
        <div className="p-4 space-y-4">
          {/* avatar preview + upload */}
          <div className="flex items-center gap-3">
            {isUrlAvatar(avatar) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-arena-red" />
            ) : (
              <span className="w-14 h-14 inline-flex items-center justify-center text-3xl rounded-full border-2 border-arena-red bg-arena-card dark:bg-arena-surface">{avatar}</span>
            )}
            <div className="flex-1">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d hover:border-arena-red hover:text-arena-red transition disabled:opacity-50">
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {uploading ? 'Uploading…' : 'Upload pic'}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
              <p className="mt-1 text-[10px] text-arena-muted-l dark:text-arena-muted-d">or pick a sport emoji below</p>
            </div>
          </div>

          {/* emoji avatar grid */}
          <div className="grid grid-cols-8 gap-1">
            {ARENA_AVATARS.map((a) => (
              <button key={a} type="button" onClick={() => setAvatarInput(a)} title={a}
                className={`aspect-square rounded-lg flex items-center justify-center text-lg transition ${avatar === a ? 'bg-arena-red ring-2 ring-arena-red' : 'bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d hover:border-arena-red'}`}>
                {a}
              </button>
            ))}
          </div>

          {/* handle */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-arena-muted-l dark:text-arena-muted-d mb-1.5">Handle</label>
            <input type="text" value={handle} onChange={(e) => { setHandleInput(e.target.value); setError(null) }} maxLength={24}
              onKeyDown={(e) => { if (e.key === 'Enter') save() }} placeholder="e.g. yeah_guy" autoFocus
              className="w-full rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d px-3 py-2 text-sm focus:outline-none focus:border-arena-red" />
            <p className="mt-1 text-[10px] text-arena-muted-l dark:text-arena-muted-d">2-24 chars · letters, numbers, dot, dash, underscore.</p>
          </div>

          {error && <p className="text-[11px] text-arena-red font-bold">{error}</p>}
          <button type="button" onClick={save} disabled={!handle.trim()}
            className="w-full rounded-lg bg-arena-red text-white font-black uppercase tracking-wider py-2.5 text-sm hover:bg-red-700 transition disabled:opacity-40">
            Save profile
          </button>
          <p className="text-[10px] text-arena-muted-l dark:text-arena-muted-d text-center">Face ID / passkey sign-in coming next.</p>
        </div>
      </div>
    </div>
  )
}
