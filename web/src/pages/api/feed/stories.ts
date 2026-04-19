/**
 * STORIES / REELS — Vercel-direct (bypasses Lambda)
 *
 * GET /api/feed/stories — list active stories (< 24hr or permanent)
 * POST /api/feed/stories — create a new story/reel
 *
 * Ported from GraphQL publicStories query to kill Lambda dependency.
 * StoriesBar on Nodes page now fetches from here instead of Apollo.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise
  const db = client.db('soundchain')

  if (req.method === 'GET') {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const stories = db.collection('stories')
    const profiles = db.collection('profiles')

    // Active stories: created < 24hr ago OR isPermanent
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const active = await stories.find({
      $or: [
        { createdAt: { $gte: cutoff } },
        { isPermanent: true },
      ],
    }).sort({ createdAt: -1 }).limit(limit).toArray()

    // Resolve profile data for each story
    const profileIds = [...new Set(active.map(s => s.profileId).filter(Boolean))]
    const profileDocs = profileIds.length > 0
      ? await profiles.find({ _id: { $in: profileIds.map(id => {
          try { return new ObjectId(id) } catch { return id }
        }) } }).toArray()
      : []
    const profileMap = new Map(profileDocs.map(p => [p._id.toString(), p]))

    const result = active.map(s => {
      const prof = profileMap.get(s.profileId?.toString())
      return {
        id: s._id.toString(),
        profileId: s.profileId?.toString(),
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType || 'image',
        caption: s.caption || null,
        duration: s.duration || 60,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt || new Date(new Date(s.createdAt).getTime() + 24 * 60 * 60 * 1000),
        isPermanent: s.isPermanent || false,
        viewCount: s.viewCount || 0,
        isGuest: s.isGuest || false,
        walletAddress: s.walletAddress || null,
        creatorDisplayName: s.creatorDisplayName || prof?.displayName || null,
        creatorUserHandle: s.creatorUserHandle || prof?.userHandle || null,
        creatorAvatarUrl: s.creatorAvatarUrl || prof?.profilePicture || null,
        attachedTrackId: s.attachedTrackId || null,
        attachedTrackIpfsUrl: s.attachedTrackIpfsUrl || null,
        attachedTrackTitle: s.attachedTrackTitle || null,
        attachedTrackArtist: s.attachedTrackArtist || null,
        attachedTrackCoverUrl: s.attachedTrackCoverUrl || null,
        profile: prof ? {
          id: prof._id.toString(),
          userHandle: prof.userHandle,
          displayName: prof.displayName,
          profilePicture: prof.profilePicture,
        } : null,
      }
    })

    return res.status(200).json({ stories: result })
  }

  if (req.method === 'POST') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

    const { mediaUrl, mediaType, caption, duration, attachedTrackId, attachedTrackIpfsUrl, attachedTrackTitle, attachedTrackArtist, attachedTrackCoverUrl } = req.body || {}

    if (!mediaUrl) return res.status(400).json({ error: 'mediaUrl required' })

    const profiles = db.collection('profiles')
    const profile = await profiles.findOne({ _id: new ObjectId(auth.profileId) })

    const now = new Date()
    const doc = {
      profileId: auth.profileId.toString(),
      mediaUrl,
      mediaType: mediaType || 'image',
      caption: caption || null,
      duration: duration || 60,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      isPermanent: false,
      viewCount: 0,
      isGuest: false,
      creatorDisplayName: profile?.displayName || null,
      creatorUserHandle: profile?.userHandle || null,
      creatorAvatarUrl: profile?.profilePicture || null,
      attachedTrackId: attachedTrackId || null,
      attachedTrackIpfsUrl: attachedTrackIpfsUrl || null,
      attachedTrackTitle: attachedTrackTitle || null,
      attachedTrackArtist: attachedTrackArtist || null,
      attachedTrackCoverUrl: attachedTrackCoverUrl || null,
    }

    const result = await db.collection('stories').insertOne(doc)

    return res.status(200).json({ ok: true, story: { ...doc, id: result.insertedId.toString() } })
  }

  return res.status(405).json({ error: 'GET or POST only' })
}
