/**
 * lib/playlistImport — SERVER-ONLY playlist scraping + matching.
 *
 * Reads a Spotify / YouTube playlist's full song list, and matches a
 * free-text "Artist – Title" to a playable YouTube video — all keyless
 * (Piped open-source YT proxies) except Spotify, which reads PUBLIC
 * playlists via Client Credentials (SPOTIFY_CLIENT_ID / _SECRET env, no
 * Premium). NEVER import this from client code — it touches secrets.
 *
 * Shared by /api/playlist/import-url (preview) + /api/playlists/import-build
 * (rebuild into a real SC playlist).
 */

export interface ImportedTrack {
  title: string
  url: string
  thumbnail: string | null
  durationSec?: number | null
}

// Piped instances (open-source YouTube proxies — no API key / quota)
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.in.projectsegfau.lt',
  'https://pipedapi.r4fo.com',
  'https://pipedapi.leptons.xyz',
]

export const pipedFetch = async (path: string, signal: AbortSignal): Promise<any> => {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}${path}`, { headers: { 'User-Agent': 'SoundChain/1.0' }, signal })
      if (res.ok) return await res.json()
    } catch { /* try next instance */ }
  }
  throw new Error('All Piped instances failed')
}

// ── YouTube ─────────────────────────────────────────────────────────────────
export const extractYouTubePlaylistId = (url: string): string | null => {
  try { return new URL(url).searchParams.get('list') } catch { return null }
}

export const fetchYouTubePlaylistFull = async (playlistId: string): Promise<ImportedTrack[]> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const tracks: ImportedTrack[] = []
    const pushStreams = (streams: any[]) => {
      for (const video of (streams || [])) {
        if (!video.url || !video.title) continue
        const videoId = video.url?.replace('/watch?v=', '')
        tracks.push({
          title: video.title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail: video.thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null),
        })
      }
    }
    const data = await pipedFetch(`/playlists/${playlistId}`, controller.signal)
    if (!data.relatedStreams || !Array.isArray(data.relatedStreams)) throw new Error('Invalid playlist response')
    pushStreams(data.relatedStreams)
    let nextpage = data.nextpage
    let pageCount = 1
    const MAX_PAGES = 200 // ~6000 tracks
    while (nextpage && pageCount < MAX_PAGES) {
      const pageData = await pipedFetch(`/nextpage/playlists/${playlistId}?nextpage=${encodeURIComponent(nextpage)}`, controller.signal)
      if (!pageData.relatedStreams || !Array.isArray(pageData.relatedStreams)) break
      pushStreams(pageData.relatedStreams)
      nextpage = pageData.nextpage
      pageCount++
    }
    return tracks
  } finally {
    clearTimeout(timeout)
  }
}

export const fetchYouTubePlaylistRSS = async (playlistId: string): Promise<ImportedTrack[]> => {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`, {
    headers: { 'User-Agent': 'SoundChain/1.0' }, signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`YouTube RSS returned ${res.status}`)
  const xml = await res.text()
  const tracks: ImportedTrack[] = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1]
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/)
    const videoIdMatch = entry.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/)
    if (titleMatch && videoIdMatch) {
      const title = titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      const videoId = videoIdMatch[1].trim()
      tracks.push({ title, url: `https://www.youtube.com/watch?v=${videoId}`, thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` })
    }
  }
  return tracks
}

// Match a free-text "Artist – Title" to the best YouTube video (keyless).
export const pipedSearchYouTube = async (query: string): Promise<ImportedTrack | null> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const data = await pipedFetch(`/search?q=${encodeURIComponent(query)}&filter=videos`, controller.signal)
    const items = data?.items || data?.relatedStreams || []
    for (const v of items) {
      const u: string = v.url || ''
      if (!u.includes('/watch?v=')) continue
      const videoId = u.replace('/watch?v=', '')
      return {
        title: v.title || query,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      }
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

// Match via YouTube's own search page (keyless, reliable from a server —
// scrape the first videoId out of the results HTML). YOUTUBE_COOKIES, when set
// as a cookie string, is sent to dodge bot-detection. This is the PRIMARY
// matcher because the public Piped search endpoints are frequently down.
export const searchYouTubeDirect = async (query: string): Promise<ImportedTrack | null> => {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    }
    const cookies = process.env.YOUTUBE_COOKIES
    if (cookies && cookies.includes('=') && !cookies.trim().startsWith('/')) headers['Cookie'] = cookies
    // sp=EgIQAQ%3D%3D → restrict results to Videos (no channels/playlists).
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`, {
      headers, signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/"videoId":"([0-9A-Za-z_-]{11})"/)
    if (!m) return null
    const videoId = m[1]
    return { title: query, url: `https://www.youtube.com/watch?v=${videoId}`, thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` }
  } catch {
    return null
  }
}

// Best-effort match: YouTube direct search first, Piped as fallback.
export const matchYouTube = async (query: string): Promise<ImportedTrack | null> => {
  return (await searchYouTubeDirect(query)) || (await pipedSearchYouTube(query))
}

// ── Spotify (public playlist read via Client Credentials, no Premium) ────────
export const extractSpotifyPlaylistId = (url: string): string | null => {
  const m = url.match(/playlist[/:]([a-zA-Z0-9]+)/)
  return m ? m[1] : null
}

export const getSpotifyToken = async (): Promise<string | null> => {
  const id = process.env.SPOTIFY_CLIENT_ID
  const secret = process.env.SPOTIFY_CLIENT_SECRET
  if (!id || !secret) return null
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    return (await res.json()).access_token || null
  } catch { return null }
}

export const fetchSpotifyPlaylistFull = async (playlistId: string, token: string): Promise<{ tracks: ImportedTrack[]; name: string | null }> => {
  const tracks: ImportedTrack[] = []
  let name: string | null = null
  try {
    const meta = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) })
    if (meta.ok) name = (await meta.json())?.name || null
  } catch { /* best-effort */ }
  let next: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=next,items(track(name,artists(name),album(images),external_urls))`
  let pages = 0
  while (next && pages < 100) {
    const res = await fetch(next, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) })
    if (!res.ok) break
    const data = await res.json()
    for (const item of (data.items || [])) {
      const t = item?.track
      if (!t || !t.name) continue
      const artists = (t.artists || []).map((a: any) => a.name).filter(Boolean).join(', ')
      tracks.push({ title: artists ? `${artists} – ${t.name}` : t.name, url: t.external_urls?.spotify || '', thumbnail: t.album?.images?.[0]?.url || null })
    }
    next = data.next
    pages++
  }
  return { tracks, name }
}

// Keyless Spotify read — scrape the public embed page's __NEXT_DATA__ (NO
// Premium, NO API). Spotify now gates the Web API behind the app OWNER having
// Premium, so this is the PRIMARY read path. Caps at ~100 songs (the embed
// trackList limit); the Web API path (fetchSpotifyPlaylistFull) returns the
// full list once the app owner has Premium.
export const fetchSpotifyPlaylistEmbed = async (playlistId: string): Promise<{ tracks: ImportedTrack[]; name: string | null; capped: boolean }> => {
  try {
    const res = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return { tracks: [], name: null, capped: false }
    const html = await res.text()
    const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
    if (!m) return { tracks: [], name: null, capped: false }
    const data = JSON.parse(m[1])
    const entity = data?.props?.pageProps?.state?.data?.entity
    const name: string | null = entity?.name || entity?.title || null
    const list: any[] = entity?.trackList || []
    const tracks: ImportedTrack[] = []
    for (const t of list) {
      const title = t?.title
      if (!title) continue
      const artist = t?.subtitle || ''
      tracks.push({ title: artist ? `${artist} – ${title}` : title, url: '', thumbnail: null })
    }
    return { tracks, name, capped: list.length >= 100 }
  } catch {
    return { tracks: [], name: null, capped: false }
  }
}

// ── SoundCloud (keyless — scrape the public page's __sc_hydration JSON) ───────
// Handles share short links (on.soundcloud.com/…) via fetch redirect-follow, and
// both single tracks ("sound") and sets/playlists. Returns "Artist – Title" rows
// so they match to YouTube like Spotify (needsMatch). Partial sets (SoundCloud
// only hydrates full metadata for the first tracks) still yield what's present.
export const fetchSoundCloud = async (url: string): Promise<{ tracks: ImportedTrack[]; name: string | null }> => {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) return { tracks: [], name: null }
  const html = await res.text()
  const m = html.match(/window\.__sc_hydration\s*=\s*(\[[\s\S]*?\]);/)
  if (!m) return { tracks: [], name: null }
  let hydration: any[]
  try { hydration = JSON.parse(m[1]) } catch { return { tracks: [], name: null } }
  const row = (t: any): ImportedTrack | null => {
    const title = t?.title
    if (!title) return null
    const artist = t?.publisher_metadata?.artist || t?.user?.username || ''
    const art = (t?.artwork_url || t?.user?.avatar_url || '')?.replace('-large', '-t300x300') || null
    return {
      title: artist ? `${artist} – ${title}` : title,
      url: t?.permalink_url || '',
      thumbnail: art,
      durationSec: t?.duration ? Math.round(t.duration / 1000) : (t?.full_duration ? Math.round(t.full_duration / 1000) : null),
    }
  }
  const pl = hydration.find(h => h?.hydratable === 'playlist')?.data
  if (pl?.tracks?.length) {
    const tracks = pl.tracks.map(row).filter(Boolean) as ImportedTrack[]
    return { tracks, name: pl.title || null }
  }
  const sound = hydration.find(h => h?.hydratable === 'sound')?.data
  if (sound) { const r = row(sound); return { tracks: r ? [r] : [], name: sound.title || null } }
  return { tracks: [], name: null }
}

// ── Bandcamp (keyless — JSON-LD on the album/track page) ──────────────────────
// Album pages carry a MusicAlbum JSON-LD with track.itemListElement[]; single
// tracks a MusicRecording. Returns "Artist – Title" rows (needsMatch → YouTube).
export const fetchBandcamp = async (url: string): Promise<{ tracks: ImportedTrack[]; name: string | null }> => {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) return { tracks: [], name: null }
  const html = await res.text()
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  let cover: string | null = null
  for (const b of blocks) {
    let data: any
    try { data = JSON.parse(b[1]) } catch { continue }
    const node = Array.isArray(data) ? data[0] : data
    if (!node) continue
    if (typeof node.image === 'string') cover = node.image
    const artist = node.byArtist?.name || node.publisher?.name || ''
    // ISO-8601 duration (PT3M20S) → seconds.
    const isoSec = (d?: string): number | null => {
      if (!d || typeof d !== 'string') return null
      const m = d.match(/PT(?:(\d+)M)?(?:(\d+)S)?/)
      if (!m) return null
      return (parseInt(m[1] || '0', 10) * 60) + parseInt(m[2] || '0', 10) || null
    }
    const items = node.track?.itemListElement
    if (Array.isArray(items) && items.length) {
      const tracks = items.map((it: any) => {
        const name = it?.item?.name
        if (!name) return null
        return { title: artist ? `${artist} – ${name}` : name, url: it?.item?.['@id'] || node['@id'] || url, thumbnail: cover, durationSec: isoSec(it?.item?.duration) }
      }).filter(Boolean) as ImportedTrack[]
      if (tracks.length) return { tracks, name: node.name || null }
    }
    if ((node['@type'] === 'MusicRecording' || node['@type'] === 'Song') && node.name) {
      return { tracks: [{ title: artist ? `${artist} – ${node.name}` : node.name, url: node['@id'] || url, thumbnail: cover }], name: node.name }
    }
  }
  // Fallback: the album page's TralbumData blob (older Bandcamp templates).
  const tm = html.match(/data-tralbum="([^"]+)"/)
  if (tm) {
    try {
      const tralbum = JSON.parse(tm[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'))
      const artist = tralbum?.artist || ''
      const tracks = (tralbum?.trackinfo || []).map((t: any) => t?.title ? ({ title: artist ? `${artist} – ${t.title}` : t.title, url: url, thumbnail: cover, durationSec: t?.duration ? Math.round(t.duration) : null }) : null).filter(Boolean) as ImportedTrack[]
      if (tracks.length) return { tracks, name: tralbum?.current?.title || null }
    } catch { /* ignore */ }
  }
  return { tracks: [], name: null }
}

// ── High-level read ──────────────────────────────────────────────────────────
export type ScrapeResult = {
  platform: 'YouTube' | 'Spotify' | 'SoundCloud' | 'Bandcamp'
  playlistName: string | null
  tracks: ImportedTrack[]
  // true → tracks are bare "Artist – Title" (Spotify) and need YouTube matching
  // before they can play; false → tracks already carry playable YouTube urls.
  needsMatch: boolean
  note?: string
}

export const scrapePlaylist = async (url: string): Promise<ScrapeResult> => {
  let hostname = ''
  try { hostname = new URL(url).hostname.toLowerCase() } catch { throw new Error('Invalid URL') }

  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    const playlistId = extractYouTubePlaylistId(url)
    if (!playlistId) throw new Error('Could not find a YouTube playlist ID (the link must contain ?list=…).')
    let tracks: ImportedTrack[]
    let note: string | undefined
    try { tracks = await fetchYouTubePlaylistFull(playlistId) }
    catch { tracks = await fetchYouTubePlaylistRSS(playlistId); note = 'Fetched via fallback (up to 15 tracks).' }
    return { platform: 'YouTube', playlistName: null, tracks, needsMatch: false, note }
  }

  if (hostname.includes('spotify.com')) {
    const playlistId = extractSpotifyPlaylistId(url)
    if (!playlistId) throw new Error('Could not read that Spotify link — make sure it is a playlist share link.')
    // PRIMARY: keyless embed scrape (no Premium). Spotify gates the Web API
    // behind the app owner's Premium, so the embed is the reliable path.
    let { tracks, name, capped } = await fetchSpotifyPlaylistEmbed(playlistId)
    let note: string | undefined
    // If the embed capped at 100, the Web API would return the full list —
    // but only if the connected app's owner has Premium. Try; ignore if blocked.
    if (capped) {
      const token = await getSpotifyToken()
      if (token) {
        const api = await fetchSpotifyPlaylistFull(playlistId, token)
        if (api.tracks.length > tracks.length) { tracks = api.tracks; name = api.name || name; capped = false }
      }
    }
    if (tracks.length === 0) throw new Error('Could not read that Spotify playlist — make sure it is set to Public.')
    if (capped) note = 'Got the first 100 songs (Spotify only shows 100 without Premium on the connected app).'
    return { platform: 'Spotify', playlistName: name, tracks, needsMatch: true, note }
  }

  if (hostname.includes('soundcloud.com')) {
    const { tracks, name } = await fetchSoundCloud(url)
    if (tracks.length === 0) throw new Error('Could not read that SoundCloud link — make sure it is public.')
    // SoundCloud plays NATIVELY in the queue (Widget API autoplay + advance), so
    // keep the real permalink + sourceType — only rows missing a url need matching.
    return { platform: 'SoundCloud', playlistName: name, tracks, needsMatch: false }
  }

  if (hostname.includes('bandcamp.com')) {
    const { tracks, name } = await fetchBandcamp(url)
    if (tracks.length === 0) throw new Error('Could not read that Bandcamp link — make sure it is public.')
    // Bandcamp plays NATIVELY (duration-timed queue advance — no ended event API).
    return { platform: 'Bandcamp', playlistName: name, tracks, needsMatch: false }
  }

  throw new Error('Unsupported link. Paste a Spotify, YouTube, SoundCloud or Bandcamp link.')
}
