import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

/**
 * GET /api/radio/galaxy — the OGUN Radio "galaxy": EVERY radio-eligible track in
 * the v1+v2 volume (~5,400 SCIDs) as a lightweight body for RadioScene4D. Each
 * becomes an NFT/SCID asteroid on its own Keplerian orbit (deriveOrbit hashes
 * the id); when the queue's currentTrackId matches a body, that asteroid is
 * gravitationally captured into the core and its cover art blooms.
 *
 * CRITICAL: do NOT dedup or cap below the full volume — the radio queue can play
 * ANY eligible track, and if its id isn't a body here, nothing captures. Joins
 * the scids collection by the STRING trackId (scids.trackId is string-keyed).
 */
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const tracks = await db
      .collection('tracks')
      .find(
        { assetUrl: { $exists: true, $ne: '' }, deleted: { $ne: true } },
        { projection: { _id: 1, title: 1, genres: 1 } }
      )
      .toArray()

    const ids = tracks.map((t) => t._id.toString())
    const scidDocs = await db
      .collection('scids')
      .find({ trackId: { $in: ids } }, { projection: { trackId: 1, scid: 1 } })
      .toArray()
    const scidByTrack = new Map(scidDocs.map((s: any) => [String(s.trackId), s.scid]))

    const bodies = tracks.map((t: any) => {
      const id = t._id.toString()
      return {
        id,
        scid: scidByTrack.get(id) || undefined,
        title: t.title || undefined,
        genre: Array.isArray(t.genres) && t.genres.length ? t.genres[0] : undefined,
      }
    })

    // Short cache so a freshly minted NFT / uploaded SCID joins the galaxy fast.
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    res.status(200).json({ tracks: bodies, count: bodies.length })
  } catch (e: any) {
    res.status(200).json({ tracks: [], count: 0, error: String(e?.message || e) })
  }
}
