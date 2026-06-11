import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

/**
 * GET /api/radio/galaxy — the OGUN Radio "galaxy": every radio-eligible track as
 * a lightweight body for RadioScene4D. Each entry becomes an NFT/SCID asteroid
 * on its own Keplerian orbit; when the player's currentTrackId matches one, that
 * asteroid gets gravitationally captured into the core and its cover art blooms.
 *
 * Mirrors the radio skill's eligibility (assetUrl present, not deleted, deduped
 * by audio) and joins the scids collection by the STRING trackId (scids.trackId
 * is string-keyed — see the scid resolver bug). Cheap projection, edge-cached.
 */
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const tracks = await db
      .collection('tracks')
      .find(
        { assetUrl: { $exists: true, $ne: '' }, deleted: { $ne: true } },
        { projection: { _id: 1, title: 1, assetUrl: 1, genres: 1 } }
      )
      .limit(2000)
      .toArray()

    // Dedup by audio (one body per unique track, ignoring editions).
    const seen = new Set<string>()
    const unique: any[] = []
    for (const t of tracks) {
      const key = t.assetUrl
      if (!key || seen.has(key)) continue
      seen.add(key)
      unique.push(t)
    }

    const ids = unique.map((t) => t._id.toString())
    const scidDocs = await db
      .collection('scids')
      .find({ trackId: { $in: ids } }, { projection: { trackId: 1, scid: 1 } })
      .toArray()
    const scidByTrack = new Map(scidDocs.map((s: any) => [String(s.trackId), s.scid]))

    const bodies = unique.slice(0, 600).map((t: any) => {
      const id = t._id.toString()
      return {
        id,
        scid: scidByTrack.get(id) || undefined,
        title: t.title || undefined,
        genre: Array.isArray(t.genres) && t.genres.length ? t.genres[0] : undefined,
      }
    })

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=900')
    res.status(200).json({ tracks: bodies, count: bodies.length })
  } catch (e: any) {
    res.status(200).json({ tracks: [], count: 0, error: String(e?.message || e) })
  }
}
