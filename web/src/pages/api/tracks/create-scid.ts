/**
 * Create Track with SCid — Vercel direct (replaces createTrackWithSCid Lambda mutation)
 * POST { title, assetUrl, artist?, album?, artworkUrl?, description?, genres?, copyright?, releaseYear?, createPost? }
 * Auth required. Returns { track, scid }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { title, assetUrl, artist, album, artworkUrl, description, genres, copyright, releaseYear, createPost } = req.body || {}
  if (!title || !assetUrl) return res.status(400).json({ error: 'title and assetUrl required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const now = new Date()

    // Create track document
    const track = {
      profileId: auth.profileId,
      title,
      assetUrl,
      playbackUrl: assetUrl,
      artist: artist || '',
      album: album || '',
      artworkUrl: artworkUrl || '',
      description: description || '',
      genres: genres || [],
      copyright: copyright || '',
      releaseYear: releaseYear || new Date().getFullYear(),
      deleted: false,
      playbackCount: 0,
      favoriteCount: 0,
      listingCount: 0,
      createdAt: now,
      updatedAt: now,
    }

    const trackResult = await db.collection('tracks').insertOne(track)
    const trackId = trackResult.insertedId

    // Generate SCid — format: SC-POL-XXXX-XXXXXXX
    const count = await db.collection('scids').estimatedDocumentCount()
    const scidNumber = count + 2600001
    const prefix = 'SC-POL'
    const block = Math.floor(scidNumber / 1000000).toString().padStart(4, '0').slice(-4)
    const seq = (scidNumber % 1000000).toString().padStart(7, '0')
    const scidCode = `${prefix}-${block}-${seq}`

    const scid = {
      trackId,
      profileId: auth.profileId,
      code: scidCode,
      streamCount: 0,
      totalOgunEarned: 0,
      claimedOgun: 0,
      unclaimedOgun: 0,
      isNFT: false,
      createdAt: now,
      updatedAt: now,
    }

    await db.collection('scids').insertOne(scid)

    // Auto-post to feed if requested
    if (createPost !== false) {
      const post = {
        profileId: auth.profileId,
        trackId,
        body: `🎵 New track: ${title}`,
        deleted: false,
        commentCount: 0,
        repostCount: 0,
        totalReactions: 0,
        createdAt: now,
        updatedAt: now,
      }
      const postResult = await db.collection('posts').insertOne(post)

      // Fan-out to author's feed
      await db.collection('feeditems').insertOne({
        profileId: auth.profileId,
        postId: postResult.insertedId,
        postedAt: now,
      })

      // Fan-out to followers
      const followers = await db.collection('follows')
        .find({ followingProfileId: auth.profileId })
        .project({ followerProfileId: 1 })
        .toArray()

      if (followers.length > 0) {
        const feedItems = followers.map(f => ({
          profileId: f.followerProfileId,
          postId: postResult.insertedId,
          postedAt: now,
        }))
        await db.collection('feeditems').insertMany(feedItems)
      }
    }

    return res.status(200).json({
      track: { ...track, id: trackId.toString(), _id: undefined },
      scid: { ...scid, id: scidCode },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
