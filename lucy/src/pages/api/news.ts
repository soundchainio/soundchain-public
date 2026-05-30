/**
 * /api/news?topic=...&limit=6 — Lucy's news scraper ("the super internets").
 *
 * Pulls live headlines from free, key-less RSS feeds across many beats, so Lucy
 * can talk about what's happening RIGHT NOW — film, sports, world, arts, world
 * government/politics, tech, music, business, science. No API key, no paywall;
 * RSS is the open web's firehose.
 *
 * She emits `[news: <topic>]` (e.g. `[news: film]`, `[news: world]`); the client
 * resolver swaps it for a compact, linked headline digest.
 *
 * Returns: { ok, topic, items: [{ title, url, source, when }] }
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const T = 6000 // per-feed timeout (ms)

// Each topic = a set of solid, free RSS feeds. We race a few per topic and
// merge so one slow/dead feed never sinks the request.
const FEEDS: Record<string, { url: string; source: string }[]> = {
  world: [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NYT' },
  ],
  film: [
    { url: 'https://variety.com/feed/', source: 'Variety' },
    { url: 'https://www.hollywoodreporter.com/feed/', source: 'THR' },
    { url: 'https://www.indiewire.com/feed/', source: 'IndieWire' },
  ],
  sports: [
    { url: 'https://www.espn.com/espn/rss/news', source: 'ESPN' },
    { url: 'https://feeds.bbci.co.uk/sport/rss.xml', source: 'BBC Sport' },
  ],
  arts: [
    { url: 'https://www.theguardian.com/artanddesign/rss', source: 'Guardian' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml', source: 'NYT' },
  ],
  government: [
    { url: 'https://feeds.bbci.co.uk/news/politics/rss.xml', source: 'BBC' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', source: 'NYT' },
    { url: 'https://feeds.washingtonpost.com/rss/politics', source: 'WaPo' },
  ],
  tech: [
    { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge' },
    { url: 'https://feeds.arstechnica.com/arstechnica/index', source: 'Ars Technica' },
  ],
  music: [
    { url: 'https://pitchfork.com/rss/news/', source: 'Pitchfork' },
    { url: 'https://www.billboard.com/feed/', source: 'Billboard' },
  ],
  business: [
    { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', source: 'NYT' },
  ],
  science: [
    { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', source: 'BBC' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml', source: 'NYT' },
  ],
}

// Map loose user words → a canonical topic key.
const ALIASES: Record<string, string> = {
  world: 'world', global: 'world', international: 'world', news: 'world', headlines: 'world', breaking: 'world',
  film: 'film', movie: 'film', movies: 'film', cinema: 'film', hollywood: 'film', entertainment: 'film',
  sport: 'sports', sports: 'sports', nba: 'sports', nfl: 'sports', soccer: 'sports', football: 'sports',
  art: 'arts', arts: 'arts', culture: 'arts', design: 'arts', museum: 'arts',
  government: 'government', politics: 'government', political: 'government', policy: 'government', congress: 'government', election: 'government', whitehouse: 'government',
  tech: 'tech', technology: 'tech', ai: 'tech', gadget: 'tech', software: 'tech',
  music: 'music', song: 'music', album: 'music', artist: 'music',
  business: 'business', finance: 'business', economy: 'business', markets: 'business', market: 'business',
  science: 'science', space: 'science', climate: 'science', research: 'science',
}

const decode = (s: string): string =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
   .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'")
   .replace(/&#8217;/g, '’').replace(/&#8216;/g, '‘')
   .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
   .replace(/&#160;|&nbsp;/g, ' ')
   .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCharCode(parseInt(n, 10)) } catch { return _ } })
   .replace(/<[^>]+>/g, '').trim()

const tag = (block: string, name: string): string => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? decode(m[1]) : ''
}

const relWhen = (pub: string): string => {
  if (!pub) return ''
  const t = Date.parse(pub)
  if (isNaN(t)) return ''
  const mins = Math.max(0, Math.floor((Date.now() - t) / 60000))
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

interface NewsItem { title: string; url: string; source: string; when: string }

const fetchFeed = async (url: string, source: string): Promise<NewsItem[]> => {
  try {
    const r = await fetch(url, {
      headers: { 'user-agent': 'lucy.soundchain.io/1.0 (+news reader)', accept: 'application/rss+xml,application/xml,text/xml' },
      signal: AbortSignal.timeout(T),
    })
    if (!r.ok) return []
    const xml = await r.text()
    // RSS <item> or Atom <entry>
    const blocks = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) || []
    const out: NewsItem[] = []
    for (const b of blocks.slice(0, 10)) {
      const title = tag(b, 'title')
      // RSS uses <link>url</link>; Atom uses <link href="url"/>
      let url2 = tag(b, 'link')
      if (!url2) { const lm = b.match(/<link[^>]+href=["']([^"']+)["']/i); url2 = lm ? lm[1] : '' }
      const when = relWhen(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated'))
      if (title && url2) out.push({ title, url: url2, source, when })
    }
    return out
  } catch { return [] }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'GET only' })
  }
  const raw = (req.query.topic as string || req.query.q as string || 'world').trim().toLowerCase()
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 6, 1), 12)

  // pick the topic: exact key, else first alias word found, else world
  let topic = FEEDS[raw] ? raw : ''
  if (!topic) {
    for (const w of raw.split(/[^a-z]+/)) { if (ALIASES[w]) { topic = ALIASES[w]; break } }
  }
  if (!topic) topic = 'world'

  const feeds = FEEDS[topic]
  const batches = await Promise.all(feeds.map(f => fetchFeed(f.url, f.source)))

  // interleave sources so the digest isn't all one outlet, dedupe by title
  const seen = new Set<string>()
  const merged: NewsItem[] = []
  const maxLen = Math.max(...batches.map(b => b.length), 0)
  for (let i = 0; i < maxLen && merged.length < limit; i++) {
    for (const b of batches) {
      if (merged.length >= limit) break
      const it = b[i]
      if (!it) continue
      const key = it.title.toLowerCase().slice(0, 60)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(it)
    }
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900')
  return res.status(200).json({ ok: merged.length > 0, topic, items: merged })
}
