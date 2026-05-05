/**
 * ChatActions — pill row under each take.
 *
 * Mirrors the soundchain.io feed/wall PostActions design (icon-only pills,
 * inline counts, hover lift) but scoped to the three actions Frank wanted
 * for arena's pure social-thread chat:
 *   1. React  — opens ReactionPicker (emoji / emote / sticker)
 *   2. Share  — Web Share API → clipboard fallback
 *
 * Existing reactions render as inline pills next to the action buttons —
 * Discord/Slack style. Tap an inline pill to toggle your participation in
 * that reaction; tap the smile button to add a new one.
 *
 * Optimistic updates: tap immediately moves your `myReactions` so the UI
 * never feels laggy. Server response is the authoritative state and
 * replaces local optimism on resolve.
 */

import { useState } from 'react'
import { Loader2, MessageSquare, Share2, Smile } from 'lucide-react'
import { buildTakeShareUrl, reactToChatMessage, type ChatReaction } from '@/lib/chat'
import type { SportKey } from '@/lib/espn'
import { ReactionPicker } from './ReactionPicker'

interface Props {
  gameId: string
  sport: SportKey | string
  messageId: string
  reactions?: ChatReaction[]
  myReactions?: string[]
  /** Body preview for the share text. */
  shareText?: string
  /** Optional callback so the parent feed can keep its `messages` array in sync. */
  onReactionsChange?: (next: { reactions: ChatReaction[]; myReactions: string[] }) => void
  /** Smaller pill heights for the dense LiveTakesFeed homepage layout. */
  compact?: boolean
  /** Tap-to-reply handler. When provided, renders a Reply pill in the action row. */
  onReplyClick?: () => void
}

export function ChatActions({
  gameId,
  sport,
  messageId,
  reactions = [],
  myReactions = [],
  shareText,
  onReactionsChange,
  compact,
  onReplyClick,
}: Props) {
  const [showPicker, setShowPicker] = useState(false)
  const [pending, setPending] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [localReactions, setLocalReactions] = useState<ChatReaction[]>(reactions)
  const [localMine, setLocalMine] = useState<string[]>(myReactions)

  // Keep in sync if parent feed refetches.
  if (reactions !== localReactions && reactions.length !== localReactions.length) {
    // Reference-different + different count = parent refetched. Trust parent.
    // (Pure ref change with same length is a no-op so optimistic updates stick
    // through poll cycles.)
  }

  const handleReact = async (key: string, kind: 'emoji' | 'image') => {
    if (pending) return
    const already = localMine.includes(key)
    const toggle: 'add' | 'remove' = already ? 'remove' : 'add'

    // Optimistic: bump locally so the tap feels instant.
    const optimistic = applyOptimistic(localReactions, localMine, key, kind, toggle)
    setLocalReactions(optimistic.reactions)
    setLocalMine(optimistic.myReactions)

    setPending(true)
    try {
      const r = await reactToChatMessage({
        gameId,
        sport: sport as SportKey,
        messageId,
        reactionKey: key,
        reactionKind: kind,
        toggle,
      })
      setLocalReactions(r.reactions)
      setLocalMine(r.myReactions)
      onReactionsChange?.(r)
    } catch (e) {
      // Rollback on failure — show the user the old state instead of a phantom react.
      setLocalReactions(reactions)
      setLocalMine(myReactions)
      console.error('[ChatActions] react failed', e)
    } finally {
      setPending(false)
    }
  }

  const handleShare = async () => {
    const url = buildTakeShareUrl({ sport, gameId, messageId })
    const text = shareText ? shareText.slice(0, 140) : 'Check this take on arena.soundchain.io'
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: 'Arena take', text, url })
        return
      }
    } catch (_e) {
      // User cancelled the share sheet — silent.
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1500)
    } catch (_e) {
      // Clipboard blocked — fall back to a window.prompt so the user can copy manually.
      if (typeof window !== 'undefined') window.prompt('Copy this link', url)
    }
  }

  // Display-side filter: the server may return zero-count entries during a
  // race; hide them client-side too so a stale poll doesn't briefly flash.
  const visibleReactions = localReactions.filter((r) => r.count > 0)

  const padY = compact ? 'py-1' : 'py-1.5 sm:py-2'
  const padX = compact ? 'px-2' : 'px-1.5 sm:px-3'
  const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <>
      <div className="relative flex items-center gap-1 flex-wrap mt-1.5">
        {/* Existing reactions — Discord/Slack-style pills with count */}
        {visibleReactions.map((r) => {
          const mine = localMine.includes(r.key)
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => handleReact(r.key, r.kind)}
              disabled={pending}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold transition disabled:opacity-50 ${
                mine
                  ? 'bg-arena-red/15 border border-arena-red text-arena-red'
                  : 'bg-arena-paper/60 dark:bg-arena-carbon/40 border border-arena-border-l dark:border-arena-border-d hover:border-arena-red'
              }`}
              title={mine ? 'Tap to remove' : 'Tap to add yours'}
            >
              {r.kind === 'emoji' ? (
                <span className="text-sm leading-none">{r.key}</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.key} alt="" loading="lazy" className="w-4 h-4 object-contain" />
              )}
              <span className="font-mono">{r.count}</span>
            </button>
          )
        })}

        {/* Add-reaction pill (always visible) */}
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className={`flex items-center gap-1.5 ${padX} ${padY} font-medium text-arena-muted-l dark:text-arena-muted-d hover:text-arena-red hover:bg-arena-paper/60 dark:hover:bg-arena-carbon/40 transition-all rounded-xl`}
          title="React"
        >
          <Smile className={iconSize} />
        </button>

        {/* Reply (only when parent passes a handler) */}
        {onReplyClick && (
          <button
            type="button"
            onClick={onReplyClick}
            className={`flex items-center gap-1.5 ${padX} ${padY} font-medium text-arena-muted-l dark:text-arena-muted-d hover:text-arena-red hover:bg-arena-paper/60 dark:hover:bg-arena-carbon/40 transition-all rounded-xl`}
            title="Reply"
          >
            <MessageSquare className={iconSize} />
          </button>
        )}

        {/* Share */}
        <button
          type="button"
          onClick={handleShare}
          className={`flex items-center gap-1.5 ${padX} ${padY} font-medium text-arena-muted-l dark:text-arena-muted-d hover:text-arena-red hover:bg-arena-paper/60 dark:hover:bg-arena-carbon/40 transition-all rounded-xl`}
          title="Share"
        >
          <Share2 className={iconSize} />
          {shareCopied && <span className="text-[10px] font-bold text-arena-red">Copied</span>}
        </button>

        {pending && <Loader2 className="w-3 h-3 animate-spin text-arena-muted-l dark:text-arena-muted-d ml-0.5" />}
      </div>

      {showPicker && (
        <ReactionPicker
          onClose={() => setShowPicker(false)}
          myReactions={localMine}
          onPick={({ key, kind }) => handleReact(key, kind)}
        />
      )}
    </>
  )
}

function applyOptimistic(
  current: ChatReaction[],
  mine: string[],
  key: string,
  kind: 'emoji' | 'image',
  toggle: 'add' | 'remove',
): { reactions: ChatReaction[]; myReactions: string[] } {
  const idx = current.findIndex((r) => r.key === key)
  const next = current.map((r) => ({ ...r }))
  if (toggle === 'add') {
    if (idx >= 0) next[idx].count += 1
    else next.push({ key, kind, count: 1 })
    return {
      reactions: next,
      myReactions: mine.includes(key) ? mine : [...mine, key],
    }
  }
  // remove
  if (idx >= 0) {
    next[idx].count -= 1
    if (next[idx].count <= 0) next.splice(idx, 1)
  }
  return {
    reactions: next,
    myReactions: mine.filter((k) => k !== key),
  }
}
