/**
 * GET /api/search/federated?q=...
 *
 * Fans a query across open-source knowledge sources + SoundChain's own index
 * and returns the merged result set. All upstream calls run in parallel, each
 * with a 2.5s timeout — slow sources get skipped rather than blocking the
 * response. None of the upstream APIs require an API key on their free tier.
 *
 * Sources (in the order they're surfaced to the UI):
 *   1. SoundChain   — tracks + users from our own Mongo (SCid, handles)
 *   2. Wikipedia    — OpenSearch (title + snippet + URL)
 *   3. DuckDuckGo   — Instant Answer API (definition / abstract / related)
 *   4. GitHub       — public repo search (top 5 by stars)
 *
 * Response is cached for 60s at the edge — searches repeat a lot.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

export type SearchSource = 'soundchain' | 'wikipedia' | 'duckduckgo' | 'github'

export interface SearchResult {
  source: SearchSource
  title: string
  snippet: string
  url: string
  thumb?: string | null
  meta?: string | null
}

const TIMEOUT_MS = 2500

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T | null> {
  return Promise.race([
    p.catch(() => null as T | null),
    new Promise<T | null>(resolve => setTimeout(() => resolve(null), ms)),
  ])
}

async function searchSoundchain(q: string): Promise<SearchResult[]> {
  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const rx = new RegExp(safe, 'i')
    const [tracks, profiles] = await Promise.all([
      db.collection('tracks').find({ $or: [{ title: rx }, { artist: rx }], deleted: { $ne: true } }).limit(5)
        .project({ title: 1, artist: 1, artworkUrl: 1, _id: 1 }).toArray(),
      db.collection('profiles').find({ $or: [{ userHandle: rx }, { displayName: rx }] }).limit(5)
        .project({ userHandle: 1, displayName: 1, profilePicture: 1 }).toArray(),
    ])
    const out: SearchResult[] = []
    for (const t of tracks) {
      out.push({
        source: 'soundchain',
        title: String(t.title || 'Untitled'),
        snippet: `Track by ${t.artist || 'unknown'}`,
        url: `/dex/track/${t._id}`,
        thumb: t.artworkUrl || null,
        meta: 'SCID',
      })
    }
    for (const p of profiles) {
      out.push({
        source: 'soundchain',
        title: String(p.displayName || p.userHandle || 'user'),
        snippet: `@${p.userHandle}`,
        url: `/dex/users/${p.userHandle || p._id}`,
        thumb: p.profilePicture || null,
        meta: 'Profile',
      })
    }
    return out
  } catch { return [] }
}

async function searchWikipedia(q: string): Promise<SearchResult[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&limit=5&format=json&origin=*&search=${encodeURIComponent(q)}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as [string, string[], string[], string[]]
  const [, titles, snippets, urls] = data
  return (titles || []).map((title: string, i: number) => ({
    source: 'wikipedia' as const,
    title,
    snippet: snippets?.[i] || '',
    url: urls?.[i] || '',
    meta: 'Wikipedia',
  }))
}

async function searchDuckDuckGo(q: string): Promise<SearchResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&no_redirect=1&skip_disambig=1`
  const res = await fetch(url)
  if (!res.ok) return []
  const data: any = await res.json().catch(() => null)
  if (!data) return []
  const out: SearchResult[] = []
  if (data.AbstractText) {
    out.push({
      source: 'duckduckgo',
      title: data.Heading || q,
      snippet: data.AbstractText,
      url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
      thumb: data.Image ? (data.Image.startsWith('http') ? data.Image : `https://duckduckgo.com${data.Image}`) : null,
      meta: data.AbstractSource || 'DuckDuckGo',
    })
  }
  for (const r of (data.RelatedTopics || []).slice(0, 4)) {
    if (r?.Text && r?.FirstURL) {
      out.push({
        source: 'duckduckgo',
        title: r.Text.split(' - ')[0] || r.Text,
        snippet: r.Text,
        url: r.FirstURL,
        meta: 'Related',
      })
    }
  }
  return out
}

async function searchGithub(q: string): Promise<SearchResult[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=5`
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
  if (!res.ok) return []
  const data: any = await res.json().catch(() => null)
  if (!data?.items) return []
  return data.items.slice(0, 5).map((r: any): SearchResult => ({
    source: 'github',
    title: r.full_name,
    snippet: r.description || '',
    url: r.html_url,
    thumb: r.owner?.avatar_url || null,
    meta: `★ ${r.stargazers_count?.toLocaleString() || 0}`,
  }))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  const q = ((req.query.q as string) || '').trim()
  if (!q || q.length < 2) return res.status(400).json({ error: 'q required (min 2 chars)' })
  if (q.length > 200) return res.status(400).json({ error: 'q too long' })

  const started = Date.now()
  const [soundchain, wikipedia, duckduckgo, github] = await Promise.all([
    withTimeout(searchSoundchain(q)),
    withTimeout(searchWikipedia(q)),
    withTimeout(searchDuckDuckGo(q)),
    withTimeout(searchGithub(q)),
  ])

  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60')
  return res.status(200).json({
    q,
    tookMs: Date.now() - started,
    sources: {
      soundchain: soundchain || [],
      wikipedia: wikipedia || [],
      duckduckgo: duckduckgo || [],
      github: github || [],
    },
  })
}
