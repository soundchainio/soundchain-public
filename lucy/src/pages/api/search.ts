/**
 * /api/search?q=...&limit=5 — server-side web search for Lucy.
 *
 * Goal: give Lucy "the super internets" without paying Google or shipping a
 * client-side API key. Stitches DuckDuckGo's Instant Answer API + Wikipedia
 * REST search; both are free, key-less, and CORS-friendly from the server.
 *
 * Returns:
 *   { query, results: [{ title, snippet, url, source }] }
 *
 * Pattern Lucy uses: she emits `[search: <query>]` in a reply; the post-stream
 * resolver on the client swaps it for a compact summary of the top results.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

interface SearchResult {
  title: string
  snippet: string
  url: string
  source: 'ddg' | 'wiki'
}

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

async function ddgInstantAnswer(q: string): Promise<SearchResult[]> {
  try {
    const u = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`
    const r = await fetch(u, { headers: { 'user-agent': 'lucy.soundchain.io/1.0 (+search proxy)' } })
    if (!r.ok) return []
    const d: any = await r.json()
    const out: SearchResult[] = []
    if (d.AbstractText && d.AbstractURL) {
      out.push({
        title: d.Heading || q,
        snippet: truncate(d.AbstractText, 240),
        url: d.AbstractURL,
        source: 'ddg',
      })
    }
    if (Array.isArray(d.RelatedTopics)) {
      for (const t of d.RelatedTopics.slice(0, 6)) {
        if (t?.FirstURL && t?.Text) {
          out.push({
            title: truncate(t.Text.split(' - ')[0] || t.Text, 90),
            snippet: truncate(t.Text, 240),
            url: t.FirstURL,
            source: 'ddg',
          })
        }
      }
    }
    return out
  } catch { return [] }
}

async function wikipediaSearch(q: string): Promise<SearchResult[]> {
  try {
    const u = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(q)}&limit=5`
    const r = await fetch(u, { headers: { 'user-agent': 'lucy.soundchain.io/1.0 (+search proxy)' } })
    if (!r.ok) return []
    const d: any = await r.json()
    return (d.pages || []).map((p: any) => ({
      title: p.title,
      snippet: truncate((p.excerpt || p.description || '').replace(/<\/?[^>]+>/g, ''), 240),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.key)}`,
      source: 'wiki' as const,
    }))
  } catch { return [] }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }
  const q = (req.query.q as string || '').trim()
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 5, 1), 10)
  if (!q) return res.status(400).json({ error: 'q (query) required' })

  // Run both providers in parallel; merge + dedupe by host.
  const [ddg, wiki] = await Promise.all([ddgInstantAnswer(q), wikipediaSearch(q)])
  const merged: SearchResult[] = []
  const seenHost = new Set<string>()
  for (const r of [...ddg, ...wiki]) {
    try {
      const h = new URL(r.url).host
      if (seenHost.has(h)) continue
      seenHost.add(h)
    } catch { /* keep weird urls */ }
    merged.push(r)
    if (merged.length >= limit) break
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900')
  return res.status(200).json({ query: q, results: merged })
}
