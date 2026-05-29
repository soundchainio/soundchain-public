import { trackEvent, logActivity } from 'lib/api/trackEvent'
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// POST { mediaUrl, mediaType, caption?, duration?, overlays?, attachedTrackId?, attachedAudioUrl?, attachedAudioTitle?, attachedAudioArtist?, attachedAudioCoverUrl? }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const {
    mediaUrl, mediaType, caption, duration, overlays,
    attachedTrackId, attachedAudioUrl, attachedAudioTitle, attachedAudioArtist, attachedAudioCoverUrl,
  } = req.body || {}
  if (!mediaUrl || !mediaType) return res.status(400).json({ error: 'mediaUrl and mediaType required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const now = new Date()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // Resolve the author profile so the story carries denormalized creator
    // fields — same shape /api/feed/stories POST writes. Without these the
    // GET/ProfileReels grouping can't render the reel pill for the author.
    const profile = await db
      .collection('profiles')
      .findOne({ _id: new ObjectId(auth.profileId) })

    const doc: any = {
      // Store profileId as a STRING to match /api/feed/stories POST + the way
      // ProfileReels/StoriesBar group + match (me.profile.id / followedProfile.id
      // are strings). Mixed ObjectId/string profileId is the repo's known id-type
      // trap that yields empty reel rows.
      profileId: auth.profileId.toString(),
      mediaUrl,
      mediaType: mediaType || 'image',
      caption: caption || undefined,
      duration: typeof duration === 'number' ? duration : 60,
      overlays: overlays || [],
      // attachedTrackId can be a non-ObjectId (e.g. radio/wall-audio sentinel);
      // store as-is to avoid a BSONError 500 on share. The GET reads it raw.
      attachedTrackId: attachedTrackId || undefined,
      attachedTrackIpfsUrl: attachedAudioUrl || undefined,
      attachedTrackTitle: attachedAudioTitle || undefined,
      attachedTrackArtist: attachedAudioArtist || undefined,
      attachedTrackCoverUrl: attachedAudioCoverUrl || undefined,
      creatorDisplayName: profile?.displayName || null,
      creatorUserHandle: profile?.userHandle || null,
      creatorAvatarUrl: profile?.profilePicture || null,
      isPermanent: false,
      isGuest: false,
      viewCount: 0,
      reactions: [],
      createdAt: now,
      updatedAt: now,
      expiresAt,
    }
    const { insertedId } = await db.collection('stories').insertOne(doc)

    return res.status(200).json({
      story: {
        id: insertedId.toString(),
        mediaUrl,
        mediaType,
        caption: doc.caption || null,
        createdAt: now,
        expiresAt,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
