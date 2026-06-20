/**
 * POST /api/playlists/import-build — the SCRAPER's rebuild.
 *
 * Reads ONE OR MORE Spotify / YouTube playlists, combines + dedupes them into a
 * single SC playlist on the caller's profile, responds immediately with
 * { playlistId, total }, then (in the background — anvil runs a persistent Next
 * server, so work continues after the response) matches each Spotify song to a
 * playable YouTube video and inserts it as an embed `playlisttracks` row.
 * Progress lands on the playlist's `importStatus` for the UI to poll.
 *
 * Body: { urls: string[], title?: string }  (also accepts { url } for one link)
 *
 * Spotify reads are KEYLESS via the public embed page (no Premium) — capped at
 * ~100 songs/playlist; combining multiple links is how you build a bigger queue.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { scrapePlaylist, matchYouTube } from 'lib/playlistImport'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Sign in to rebuild a playlist.' })

  const body = req.body || {}
  const rawUrls: string[] = Array.isArray(body.urls) ? body.urls : (body.url ? [body.url] : [])
  const urls = Array.from(new Set(rawUrls.map((u: any) => String(u).trim()).filter(Boolean)))
  if (urls.length === 0) return res.status(400).json({ error: 'Paste at least one playlist link.' })
  const userTitle = (body.title && String(body.title).trim()) || ''

  // Map a scrape platform → the playlisttracks sourceType enum (UPPERCASE).
  const PLATFORM_SOURCE: Record<string, string> = { YouTube: 'YOUTUBE', SoundCloud: 'SOUNDCLOUD', Bandcamp: 'BANDCAMP', Spotify: 'YOUTUBE' }

  // 1) Read every source playlist, combine + dedupe by "artist – title".
  // Each row carries its native platform so it's stored as a playable embed of
  // the RIGHT type (YouTube/SoundCloud/Bandcamp). Spotify rows have no playable
  // url (30s previews) → needsMatch re-sources them to YouTube.
  const combined: Array<{ title: string; url: string; thumbnail: string | null; needsMatch: boolean; sourceType: string; durationSec: number | null }> = []
  const seen = new Set<string>()
  const names: string[] = []
  const errors: string[] = []
  let capped = false
  for (const u of urls) {
    try {
      const s = await scrapePlaylist(u)
      if (s.playlistName) names.push(s.playlistName)
      if (s.note) capped = true
      const srcType = PLATFORM_SOURCE[s.platform] || 'YOUTUBE'
      for (const t of s.tracks) {
        const key = norm(t.title)
        if (!key || seen.has(key)) continue
        seen.add(key)
        // A native row with no url still needs matching; otherwise play it natively.
        const needsMatch = s.needsMatch || !t.url
        combined.push({ title: t.title, url: t.url, thumbnail: t.thumbnail, needsMatch, sourceType: needsMatch ? 'YOUTUBE' : srcType, durationSec: t.durationSec ?? null })
      }
    } catch (e: any) {
      errors.push(e?.message || 'unreadable link')
    }
  }
  if (combined.length === 0) {
    return res.status(400).json({ error: errors[0] || 'Could not read those playlists — make sure they are public.' })
  }

  const client = await clientPromise
  const db = client.db('soundchain')
  const now = new Date()
  const total = combined.length
  const title = userTitle || (names.length === 1 ? names[0] : names.length ? names.join(' + ') : 'Combined Playlist')

  // 2) Create the combined playlist (cover = first song art).
  const { insertedId: playlistId } = await db.collection('playlists').insertOne({
    profileId: auth.profileId,
    title,
    description: `Rebuilt from ${urls.length} playlist${urls.length > 1 ? 's' : ''} · ${total} songs`,
    artworkUrl: combined.find(t => t.thumbnail)?.thumbnail || '',
    deleted: false,
    playbackCount: 0,
    importStatus: { sources: urls.length, total, done: 0, matched: 0, status: 'building', capped, startedAt: now },
    createdAt: now,
    updatedAt: now,
  })

  // 3) Respond now — the build continues in the background.
  res.status(200).json({ playlistId: playlistId.toString(), title, total, sources: urls.length, capped })

  // 4) Background: match + insert. Sequential to respect the keyless search.
  ;(async () => {
    let position = 0
    let done = 0
    let matched = 0
    for (const t of combined) {
      try {
        // Spotify (or any url-less row) re-sources to YouTube; native YouTube/
        // SoundCloud/Bandcamp rows keep their own playable url + sourceType.
        const hit = t.needsMatch ? await matchYouTube(t.title) : t
        if (hit && hit.url) {
          await db.collection('playlisttracks').insertOne({
            playlistId,
            sourceType: t.needsMatch ? 'YOUTUBE' : t.sourceType,
            title: t.title,
            artist: '',
            artworkUrl: hit.thumbnail || t.thumbnail || '',
            externalUrl: hit.url,
            duration: t.durationSec || null,
            position: position++,
            profileId: auth.profileId,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          matched++
        }
      } catch { /* skip this song, keep going */ }
      done++
      if (done % 5 === 0 || done === total) {
        await db.collection('playlists').updateOne(
          { _id: playlistId },
          { $set: { 'importStatus.done': done, 'importStatus.matched': matched, updatedAt: new Date() } },
        ).catch(() => {})
      }
      if (t.needsMatch) await sleep(250)
    }
    await db.collection('playlists').updateOne(
      { _id: playlistId },
      { $set: { 'importStatus.done': done, 'importStatus.matched': matched, 'importStatus.status': 'done', 'importStatus.finishedAt': new Date(), updatedAt: new Date() } },
    ).catch(() => {})
  })().catch(() => {})
}
