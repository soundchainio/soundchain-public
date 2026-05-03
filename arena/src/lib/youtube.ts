import type { SportKey } from './espn'

export interface YouTubeVideo {
  id: string                    // 11-char video ID
  title: string
  publishedAt: string           // ISO 8601
  channelTitle: string
  thumbnail: string             // hqdefault.jpg
  embedUrl: string              // youtube-nocookie.com embed URL
  watchUrl: string              // youtube.com/watch URL
  isLive?: boolean              // true if currently live
}

const LEAGUE_CHANNELS: Partial<Record<SportKey, { id: string; name: string }>> = {
  nba: { id: 'UCWJ2lWNubArHWmf3FIHbfcQ', name: 'NBA' },
  nfl: { id: 'UCDVYQ4Zhbm3S2dlz7P1GBDg', name: 'NFL' },
  mlb: { id: 'UCoLrcjPV5PbUrUyXq5mjc_A', name: 'MLB' },
  nhl: { id: 'UCqFMzb-4AUf6WAIbl132QKA', name: 'NHL' },
  wnba: { id: 'UCqICXsmJaq43--4yJ5ohMyw', name: 'WNBA' },
  mma: { id: 'UCvgfXK4nTYKudb0rFR6noLA', name: 'UFC' },
  soccerEpl: { id: 'UCG5qGWdu8nIRZqJ_GgDwQ_w', name: 'Premier League' },
  soccerMls: { id: 'UC4_5VsVkLQM_ZcLGIVnPnDw', name: 'MLS' },
  ncaaFootball: { id: 'UCN9HKj9KLW6_SHmAvrQbARA', name: 'NCAA Football' },
  ncaaMens: { id: 'UCB0JSO6d5ysH2Mvqb5HBlAQ', name: 'NCAA Basketball' },
}

const F1_CHANNEL = { id: 'UCB_qr75-ydFVKSF9Dmo6izg', name: 'Formula 1' }

export function getLeagueChannel(sport: SportKey | 'f1'): { id: string; name: string } | null {
  if (sport === 'f1') return F1_CHANNEL
  return LEAGUE_CHANNELS[sport as SportKey] ?? null
}

/** Builds privacy-enhanced embed URL with autoplay + JS API enabled. */
export function buildEmbedUrl(videoId: string, opts: { autoplay?: boolean } = {}): string {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  })
  if (opts.autoplay) params.set('autoplay', '1')
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

export function buildWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

/** Best-quality static thumbnail from YouTube CDN. */
export function buildThumbnailUrl(videoId: string, quality: 'hq' | 'mq' | 'sd' | 'maxres' = 'hq'): string {
  const file = quality === 'hq' ? 'hqdefault' : quality === 'mq' ? 'mqdefault' : quality === 'sd' ? 'sddefault' : 'maxresdefault'
  return `https://i.ytimg.com/vi/${videoId}/${file}.jpg`
}

/** Parse YouTube channel RSS feed (no API key required). */
export function parseChannelRss(xml: string, channelTitle: string): YouTubeVideo[] {
  const entries: YouTubeVideo[] = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match: RegExpExecArray | null
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1]
    const id = /<yt:videoId>(.*?)<\/yt:videoId>/.exec(block)?.[1]
    const title = /<title>([\s\S]*?)<\/title>/.exec(block)?.[1]
    const published = /<published>(.*?)<\/published>/.exec(block)?.[1]
    if (!id || !title || !published) continue
    entries.push({
      id,
      title: decodeXmlEntities(title.trim()),
      publishedAt: published,
      channelTitle,
      thumbnail: buildThumbnailUrl(id, 'hq'),
      embedUrl: buildEmbedUrl(id),
      watchUrl: buildWatchUrl(id),
    })
  }
  return entries
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

const RSS_BASE = 'https://www.youtube.com/feeds/videos.xml'

/** Fetches latest videos from a league's official channel. Free, no API key. */
export async function fetchChannelLatest(sport: SportKey | 'f1', limit = 12): Promise<YouTubeVideo[]> {
  const channel = getLeagueChannel(sport)
  if (!channel) return []
  const url = `${RSS_BASE}?channel_id=${channel.id}`
  const res = await fetch(url, { next: { revalidate: 600 } as any })
  if (!res.ok) throw new Error(`YouTube RSS ${sport} ${res.status}`)
  const xml = await res.text()
  return parseChannelRss(xml, channel.name).slice(0, limit)
}

export function relativeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `${Math.max(min, 1)}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const d = Math.floor(hr / 24)
  if (d < 7) return `${d}d`
  const w = Math.floor(d / 7)
  if (w < 4) return `${w}w`
  return `${Math.floor(d / 30)}mo`
}
