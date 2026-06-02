/**
 * Edge proxy for X/Twitter videos.
 *
 * WHY: video.twimg.com hotlink-blocks our origin — it returns HTTP 403 for any
 * request carrying `Referer: https://soundchain.io` (the browser's default
 * referrer policy). And the `referrerpolicy` attribute is NOT honored on
 * <video> elements (HTML spec only honors it on img/script/link/a/iframe), so
 * we can't strip the referer client-side. The clip is fine with NO referer or a
 * twitter.com referer (both 206). So we fetch it server-side — where we control
 * the Referer — and stream it back same-origin. The browser then loads the video
 * from soundchain.io, no cross-origin referer, no 403.
 *
 * Range requests are forwarded so the player can seek + progressively buffer.
 *
 * MUST be the Edge runtime: Node serverless responses are capped at ~4.5 MB,
 * which would truncate any real video. Edge streams have no such cap.
 *
 * SSRF-safe: only proxies https://video.twimg.com/*.
 */
export const config = { runtime: 'edge' }

const PASS_THROUGH = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']

export default async function handler(req: Request): Promise<Response> {
  const u = new URL(req.url).searchParams.get('u')
  if (!u) return new Response('Missing url', { status: 400 })

  let target: URL
  try {
    target = new URL(u)
  } catch {
    return new Response('Invalid url', { status: 400 })
  }
  // Strict allowlist — only X's video CDN, https only. Prevents SSRF.
  if (target.protocol !== 'https:' || target.hostname !== 'video.twimg.com') {
    return new Response('Forbidden host', { status: 403 })
  }

  const range = req.headers.get('range')
  let upstream: Response
  try {
    upstream = await fetch(target.toString(), {
      headers: {
        ...(range ? { Range: range } : {}),
        // twimg serves 206 for the twitter referer; our own origin gets 403.
        Referer: 'https://twitter.com/',
        'User-Agent': 'Mozilla/5.0 (compatible; SoundChain/1.0)',
        Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.8',
      },
      // Don't chase redirects to arbitrary hosts (defense in depth; amplify_video
      // serves the bytes directly with no redirect).
      redirect: 'manual',
    })
  } catch {
    return new Response('Upstream fetch failed', { status: 502 })
  }

  if (upstream.status !== 200 && upstream.status !== 206) {
    return new Response('Upstream error', { status: 502 })
  }

  const headers = new Headers()
  for (const h of PASS_THROUGH) {
    const v = upstream.headers.get(h)
    if (v) headers.set(h, v)
  }
  if (!headers.has('content-type')) headers.set('content-type', 'video/mp4')
  if (!headers.has('accept-ranges')) headers.set('accept-ranges', 'bytes')
  // Edge-cache the bytes hard — tweet videos are immutable.
  headers.set('Cache-Control', 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=604800')

  return new Response(upstream.body, { status: upstream.status, headers })
}
