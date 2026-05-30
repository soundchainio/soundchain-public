/**
 * /api/video?q=... — Lucy's video finder (keyless YouTube search).
 *
 * Scrapes YouTube's public results page for the top real videoId(s) — no API
 * key, no quota. Returns watch URL + thumbnail + title so Lucy can SHOW a
 * playable video instead of hallucinating a fake /watch?v= id (which she did
 * before this existed). She emits `[video: <topic>]`; the client renders the
 * result as an inline thumbnail that expands to a playable embed.
 *
 * Returns: { ok, q, results: [{ id, title, url, thumb, embed }] }
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const T = 8000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'GET only' })
  }
  const q = (req.query.q as string || '').trim()
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 3, 1), 6)
  if (!q) return res.status(400).json({ ok: false, error: 'q required' })

  try {
    const r = await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(q), {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(T),
    })
    if (!r.ok) return res.status(200).json({ ok: false, q, results: [], error: `youtube ${r.status}` })
    const html = await r.text()

    // Pull videoRenderer blocks: each has videoId + a title runs[].text.
    const results: Array<{ id: string; title: string; url: string; thumb: string; embed: string }> = []
    const seen = new Set<string>()
    const re = /"videoId":"([\w-]{11})"(?:(?!"videoId").)*?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/g
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null && results.length < limit) {
      const id = m[1]
      if (seen.has(id)) continue
      seen.add(id)
      let title = ''
      try { title = JSON.parse('"' + m[2] + '"') } catch { title = m[2] }
      results.push({
        id,
        title: title.slice(0, 140),
        url: `https://www.youtube.com/watch?v=${id}`,
        thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        embed: `https://www.youtube-nocookie.com/embed/${id}`,
      })
    }
    // Fallback: if title parse missed, at least return bare ids.
    if (results.length === 0) {
      const ids = [...new Set([...html.matchAll(/"videoId":"([\w-]{11})"/g)].map(x => x[1]))].slice(0, limit)
      for (const id of ids) results.push({
        id, title: q,
        url: `https://www.youtube.com/watch?v=${id}`,
        thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        embed: `https://www.youtube-nocookie.com/embed/${id}`,
      })
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900')
    return res.status(200).json({ ok: results.length > 0, q, results })
  } catch (err: any) {
    return res.status(200).json({ ok: false, q, results: [], error: err?.message || 'video search failed' })
  }
}
