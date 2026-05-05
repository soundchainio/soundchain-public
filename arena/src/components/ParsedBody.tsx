/**
 * Render a take body with @mentions + #hashtags styled inline.
 *
 * Phase 1 (today): styled spans, no navigation. Tap-to-filter and
 * tap-to-jump-to-handle live in Phase 2 (cross-game discovery widget).
 */

import { parseChatBody } from '@/lib/chatParse'

export function ParsedBody({ body, className }: { body: string; className?: string }) {
  const segments = parseChatBody(body)
  if (segments.length === 0) return null
  return (
    <p className={className ?? 'whitespace-pre-wrap leading-relaxed break-words'}>
      {segments.map((seg, i) => {
        if (seg.type === 'mention') {
          return (
            <span
              key={i}
              className="font-bold text-arena-red hover:underline cursor-pointer"
              title={`@${seg.handle}`}
            >
              @{seg.handle}
            </span>
          )
        }
        if (seg.type === 'hashtag') {
          return (
            <span
              key={i}
              className="font-bold text-arena-orange hover:underline cursor-pointer"
              title={`#${seg.tag}`}
            >
              #{seg.tag}
            </span>
          )
        }
        return <span key={i}>{seg.value}</span>
      })}
    </p>
  )
}
