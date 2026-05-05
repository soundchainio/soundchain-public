/**
 * Parse take bodies for @mentions and #hashtags.
 *
 * Mirrored on both client (renderer) and server (extractor for notif
 * fan-out + future hashtag aggregation). Same regexes — keep in sync if
 * either side changes them. The server-side equivalents live in
 * `pages/api/game/[id]/chat.ts` (intentionally inline so the API route
 * has no dep on `@/lib/*` at module-load to avoid circular concerns).
 */

export const MENTION_RE = /@([a-zA-Z0-9_.-]{2,24})/g
export const HASHTAG_RE = /#([a-zA-Z0-9_]{1,40})/g
const COMBINED_RE = /(@[a-zA-Z0-9_.-]{2,24})|(#[a-zA-Z0-9_]{1,40})/g

export type BodySegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; handle: string }
  | { type: 'hashtag'; tag: string }

export function parseChatBody(body: string): BodySegment[] {
  if (!body) return []
  const segments: BodySegment[] = []
  let lastIdx = 0
  let m: RegExpExecArray | null
  COMBINED_RE.lastIndex = 0
  while ((m = COMBINED_RE.exec(body))) {
    if (m.index > lastIdx) segments.push({ type: 'text', value: body.slice(lastIdx, m.index) })
    if (m[1]) segments.push({ type: 'mention', handle: m[1].slice(1) })
    else if (m[2]) segments.push({ type: 'hashtag', tag: m[2].slice(1) })
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < body.length) segments.push({ type: 'text', value: body.slice(lastIdx) })
  return segments
}
