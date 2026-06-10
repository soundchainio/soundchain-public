import { useEffect, useState } from 'react'
import { isUrlAvatar, getIdentity } from '@/lib/identity'
import { postChatMessage } from '@/lib/chat'
import type { SportKey } from '@/lib/espn'
import { ParsedBody } from './ParsedBody'

/**
 * ArenaReplyThread — recursive reply thread for arena chat/takes. Each reply can
 * itself be replied to (reply-to-a-reply), with its own reply count + nested
 * sub-thread, just like feed/wall comments on soundchain.io. Depth-capped to
 * keep the UI sane; replies lazy-load only when a node is expanded.
 */

type Reply = {
  id: string
  gameId: string
  sport: string
  handle: string
  avatar: string
  body: string
  mediaUrl?: string | null
  mediaType?: 'image' | null
  createdAt: string
  replyCount?: number
}

const MAX_DEPTH = 5

function rel(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export function ArenaReplyThread({
  parentId,
  gameId,
  sport,
  depth = 0,
}: {
  parentId: string
  gameId: string
  sport: string
  depth?: number
}) {
  const [replies, setReplies] = useState<Reply[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)   // which reply's sub-thread is open
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    try {
      const r = await fetch(`/api/chat/recent?thread=${encodeURIComponent(parentId)}`, { cache: 'no-store' })
      if (r.ok) {
        const d = await r.json()
        setReplies(Array.isArray(d?.messages) ? d.messages : [])
      }
    } catch { /* non-fatal */ }
  }
  useEffect(() => { load() }, [parentId])

  const submit = async (rep: Reply) => {
    const body = text.trim()
    if (!body || sending) return
    if (!getIdentity().handle) { setErr('Set your handle (avatar menu, top-right) to reply'); return }
    setSending(true); setErr(null)
    try {
      await postChatMessage({ gameId: rep.gameId || gameId, sport: (rep.sport || sport) as SportKey, body, replyTo: rep.id })
      setText(''); setReplyingId(null)
      setReplies((prev) => prev ? prev.map((p) => (p.id === rep.id ? { ...p, replyCount: (p.replyCount ?? 0) + 1 } : p)) : prev)
      setOpenId(rep.id)
    } catch (e) {
      setErr((e as Error)?.message ?? 'Reply failed')
    } finally {
      setSending(false)
    }
  }

  if (!replies) return <div className="text-[11px] text-arena-muted-l dark:text-arena-muted-d pl-3">Loading…</div>

  return (
    <ul className="space-y-2">
      {replies.map((rep) => (
        <li key={rep.id} className="border-l-2 border-arena-red/20 pl-3">
          <div className="flex items-start gap-2">
            {isUrlAvatar(rep.avatar) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={rep.avatar} alt="" loading="lazy" className="w-5 h-5 rounded-full object-cover border border-arena-border-l/60 dark:border-arena-border-d/60 flex-shrink-0 mt-0.5" />
            ) : (
              <span className="text-base leading-none flex-shrink-0 mt-0.5" aria-hidden>{rep.avatar || '🏟️'}</span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold truncate">@{rep.handle}</span>
                <span className="text-[10px] text-arena-muted-l dark:text-arena-muted-d">{rel(rep.createdAt)}</span>
              </div>
              {rep.body && <ParsedBody body={rep.body} className="text-xs text-arena-text-l dark:text-arena-text-d leading-snug break-words" />}
              {rep.mediaUrl && rep.mediaType === 'image' && (
                <img src={rep.mediaUrl} alt="" loading="lazy" className="mt-1 max-h-32 rounded-md border border-arena-border-l dark:border-arena-border-d" />
              )}
              {/* actions */}
              <div className="flex items-center gap-3 mt-1">
                <button onClick={() => { setReplyingId((c) => c === rep.id ? null : rep.id); setText(''); setErr(null) }}
                  className="text-[10px] font-bold text-arena-muted-l dark:text-arena-muted-d hover:text-arena-red">↩ Reply</button>
                {(rep.replyCount ?? 0) > 0 && depth + 1 < MAX_DEPTH && (
                  <button onClick={() => setOpenId((c) => c === rep.id ? null : rep.id)}
                    className="text-[10px] font-bold text-arena-red hover:underline">
                    {rep.replyCount} {rep.replyCount === 1 ? 'reply' : 'replies'} {openId === rep.id ? '▲' : '▼'}
                  </button>
                )}
              </div>
              {/* inline composer */}
              {replyingId === rep.id && (
                <div className="mt-1.5 flex items-center gap-2">
                  <input value={text} onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(rep) } }}
                    placeholder={`Reply to @${rep.handle}…`} autoFocus maxLength={500}
                    className="flex-1 min-w-0 rounded-lg border border-arena-border-l dark:border-arena-border-d bg-arena-paper dark:bg-arena-carbon px-2.5 py-1 text-xs outline-none focus:border-arena-red/60" />
                  <button onClick={() => submit(rep)} disabled={sending || !text.trim()}
                    className="flex-shrink-0 rounded-lg bg-arena-red px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-40">
                    {sending ? '…' : 'Reply'}
                  </button>
                </div>
              )}
              {replyingId === rep.id && err && <div className="mt-1 text-[10px] text-arena-red">{err}</div>}
              {/* recursive sub-thread */}
              {openId === rep.id && depth + 1 < MAX_DEPTH && (
                <div className="mt-2">
                  <ArenaReplyThread parentId={rep.id} gameId={rep.gameId || gameId} sport={rep.sport || sport} depth={depth + 1} />
                </div>
              )}
            </div>
          </div>
        </li>
      ))}
      {replies.length === 0 && <li className="text-[11px] text-arena-muted-l dark:text-arena-muted-d">No replies yet.</li>}
    </ul>
  )
}
