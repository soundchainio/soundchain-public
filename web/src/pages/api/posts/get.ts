/**
 * GET /api/posts/get?id=xxx — Vercel-direct replacement for usePostQuery
 *
 * Single post by ID with full profile + track + reactions.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: 'id required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const auth = await authFromRequest(req)

    const post = await db.collection('posts').findOne({ _id: new ObjectId(id) })
    if (!post) return res.status(404).json({ error: 'Post not found' })

    // Hydrate profile
    const profile = post.profileId
      ? await db.collection('profiles').findOne({ _id: post.profileId }, { projection: { displayName: 1, userHandle: 1, profilePicture: 1, verified: 1, teamMember: 1, badges: 1, tracksCount: 1 } })
      : null

    // Hydrate track if attached
    const track = post.trackId
      ? await db.collection('tracks').findOne({ _id: post.trackId })
      : null

    // Reactions
    const reactions = await db.collection('reactions')
      .find({ postId: post._id })
      .toArray()

    const reactionTally = reactions.reduce((acc: any, r: any) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1
      return acc
    }, {})

    let myReaction = null
    if (auth) {
      const mine = reactions.find(r => r.profileId?.toString() === auth.profileId.toString())
      if (mine) myReaction = mine.emoji
    }

    return res.status(200).json({
      post: {
        id: post._id.toString(),
        message: post.message || post.body || '',
        body: post.body || post.message || '',
        createdAt: post.createdAt || null,
        uploadedMediaUrl: post.uploadedMediaUrl || null,
        uploadedMediaType: post.uploadedMediaType || null,
        linkUrl: post.linkUrl || null,
        isPermanent: post.isPermanent || false,
        permanentTxHash: post.permanentTxHash || null,
        reactionTally: Object.entries(reactionTally).map(([emoji, count]) => ({ emoji, count })),
        myReaction,
        profile: profile ? {
          id: profile._id.toString(),
          displayName: profile.displayName || '',
          userHandle: profile.userHandle || '',
          profilePicture: profile.profilePicture || null,
          verified: profile.verified || false,
          teamMember: profile.teamMember || false,
          badges: profile.badges || [],
          tracksCount: profile.tracksCount || 0,
        } : null,
        track: track ? {
          id: track._id.toString(),
          title: track.title || '',
          artist: track.artist || '',
          artworkUrl: track.artworkUrl || '',
          playbackUrl: track.playbackUrl || '',
        } : null,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
