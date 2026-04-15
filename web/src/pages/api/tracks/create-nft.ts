/**
 * Create NFT Track — Vercel direct (replaces createMultipleTracks Lambda mutation)
 * POST { track: { title, assetUrl, artist?, ... }, batchSize, createPost? }
 * Auth required. Returns { trackId, trackIds }
 *
 * NOTE: This creates the MongoDB track record only. The actual NFT minting
 * (smart contract calls) happens client-side via useBlockchainV2.ts.
 * This route replaces the Lambda mutation that was creating the DB record.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { track: trackInput, batchSize = 1, createPost = true } = req.body || {}
  if (!trackInput?.title || !trackInput?.assetUrl) return res.status(400).json({ error: 'track.title and track.assetUrl required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const now = new Date()

    const trackIds: string[] = []

    // Create edition group if batchSize > 1
    let trackEditionId: ObjectId | null = null
    if (batchSize > 1) {
      const edition = {
        profileId: auth.profileId,
        size: batchSize,
        createdAt: now,
      }
      const edResult = await db.collection('trackeditions').insertOne(edition)
      trackEditionId = edResult.insertedId
    }

    // Create track(s)
    for (let i = 0; i < batchSize; i++) {
      const track = {
        profileId: auth.profileId,
        title: trackInput.title,
        assetUrl: trackInput.assetUrl,
        playbackUrl: trackInput.assetUrl,
        artist: trackInput.artist || '',
        album: trackInput.album || '',
        artworkUrl: trackInput.artworkUrl || '',
        description: trackInput.description || trackInput.utilityInfo || '',
        utilityInfo: trackInput.utilityInfo || '',
        genres: trackInput.genres || [],
        copyright: trackInput.copyright || '',
        releaseYear: trackInput.releaseYear || new Date().getFullYear(),
        ISRC: trackInput.ISRC || '',
        collaborators: trackInput.collaborators || [],
        saleType: trackInput.saleType || null,
        price: trackInput.price || null,
        editionSize: batchSize,
        trackEditionId,
        deleted: false,
        playbackCount: 0,
        favoriteCount: 0,
        listingCount: 0,
        createdAt: now,
        updatedAt: now,
      }

      const result = await db.collection('tracks').insertOne(track)
      trackIds.push(result.insertedId.toString())
    }

    // Auto-post to feed
    if (createPost && trackIds.length > 0) {
      const firstTrackId = new ObjectId(trackIds[0])
      const post = {
        profileId: auth.profileId,
        trackId: firstTrackId,
        body: batchSize > 1 ? `🎵 Minted ${batchSize} edition NFT: ${trackInput.title}` : `🎵 Minted NFT: ${trackInput.title}`,
        deleted: false,
        commentCount: 0,
        repostCount: 0,
        totalReactions: 0,
        createdAt: now,
        updatedAt: now,
      }
      const postResult = await db.collection('posts').insertOne(post)
      await db.collection('feeditems').insertOne({ profileId: auth.profileId, postId: postResult.insertedId, postedAt: now })

      const followers = await db.collection('follows').find({ followingProfileId: auth.profileId }).project({ followerProfileId: 1 }).toArray()
      if (followers.length > 0) {
        await db.collection('feeditems').insertMany(followers.map(f => ({ profileId: f.followerProfileId, postId: postResult.insertedId, postedAt: now })))
      }
    }

    return res.status(200).json({
      trackIds,
      firstTrackId: trackIds[0],
      editionId: trackEditionId?.toString() || null,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
