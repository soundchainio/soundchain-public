/**
 * /api/tracks/comments — Vercel-direct (Phase 7e Apollo strip)
 *
 * GET ?trackId=xxx[&limit=50]   — list timestamped waveform comments
 * GET ?trackId=xxx&mode=count   — return { count: N } only
 * POST { trackId, body|text, timestamp, embedUrl? } — create
 * PATCH { commentId, action: 'like' } — toggle like
 * DELETE ?id=xxx                — soft-delete author's own comment
 *
 * Field aliases for Apollo compatibility:
 *   - response `text` field is an alias of mongo `body`
 *   - response `nodes[].profile` is hydrated from profiles collection
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise
  const db = client.db('soundchain')

  if (req.method === 'GET') {
    const trackId = req.query.trackId as string
    if (!trackId) return res.status(400).json({ error: 'trackId required' })
    let trackOid: ObjectId
    try { trackOid = new ObjectId(trackId) } catch { return res.status(400).json({ error: 'Invalid trackId' }) }

    // Count-only mode for useTrackCommentCountQuery
    if (req.query.mode === 'count') {
      try {
        const count = await db.collection('trackcomments').countDocuments({ trackId: trackOid, deleted: { $ne: true } })
        return res.status(200).json({ count })
      } catch (err: any) {
        return res.status(500).json({ error: err.message })
      }
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)

    try {
      const comments = await db.collection('trackcomments')
        .find({ trackId: trackOid, deleted: { $ne: true } })
        .sort({ timestamp: 1, createdAt: -1 })
        .limit(limit)
        .toArray()

      const profileIds = [...new Set(comments.map(c => c.profileId?.toString()).filter(Boolean))]
      const profileOids = profileIds.map(id => { try { return new ObjectId(id) } catch { return null } }).filter(Boolean) as ObjectId[]
      const profiles = profileOids.length > 0
        ? await db.collection('profiles').find({ _id: { $in: profileOids } }).project({ displayName: 1, userHandle: 1, profilePicture: 1, verified: 1 }).toArray()
        : []
      const profileMap = new Map(profiles.map(p => [p._id.toString(), p]))

      const nodes = comments.map(c => {
        const profile = profileMap.get(c.profileId?.toString())
        const text = c.body || c.text || ''
        return {
          id: c._id.toString(),
          trackId: c.trackId?.toString() || trackId,
          text,
          body: text,  // alias for legacy callers
          timestamp: c.timestamp ?? 0,
          likeCount: c.likeCount || 0,
          isPinned: !!c.isPinned,
          deleted: !!c.deleted,
          embedUrl: c.embedUrl || null,
          createdAt: c.createdAt || null,
          updatedAt: c.updatedAt || c.createdAt || null,
          profile: profile ? {
            id: profile._id.toString(),
            displayName: profile.displayName || '',
            userHandle: profile.userHandle || '',
            profilePicture: profile.profilePicture || null,
            verified: profile.verified || false,
          } : null,
        }
      })

      return res.status(200).json({ nodes, pageInfo: { hasNextPage: false, endCursor: null, hasPreviousPage: false, startCursor: null } })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

    const { trackId, body, text, timestamp, embedUrl } = req.body || {}
    const messageText = text || body
    if (!trackId || !messageText) return res.status(400).json({ error: 'trackId and text/body required' })

    try {
      const doc: any = {
        trackId: new ObjectId(trackId),
        profileId: auth.profileId,
        body: String(messageText).slice(0, 500),
        timestamp: typeof timestamp === 'number' ? timestamp : 0,
        likeCount: 0,
        isPinned: false,
        deleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      if (embedUrl) doc.embedUrl = String(embedUrl).slice(0, 500)
      const result = await db.collection('trackcomments').insertOne(doc)
      return res.status(201).json({ id: result.insertedId.toString() })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'PATCH') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

    const { commentId, action } = req.body || {}
    if (!commentId) return res.status(400).json({ error: 'commentId required' })

    let commentOid: ObjectId
    try { commentOid = new ObjectId(commentId) } catch { return res.status(400).json({ error: 'Invalid commentId' }) }

    try {
      if (action === 'like') {
        // Toggle like via a separate trackCommentLikes collection
        const existing = await db.collection('trackcommentlikes').findOne({ commentId: commentOid, profileId: auth.profileId })
        if (existing) {
          await db.collection('trackcommentlikes').deleteOne({ _id: existing._id })
          await db.collection('trackcomments').updateOne({ _id: commentOid }, { $inc: { likeCount: -1 } })
          return res.status(200).json({ liked: false })
        }
        await db.collection('trackcommentlikes').insertOne({ commentId: commentOid, profileId: auth.profileId, createdAt: new Date() })
        await db.collection('trackcomments').updateOne({ _id: commentOid }, { $inc: { likeCount: 1 } })
        return res.status(200).json({ liked: true })
      }
      return res.status(400).json({ error: 'Unknown action' })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'DELETE') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

    const id = req.query.id as string
    if (!id) return res.status(400).json({ error: 'id required' })
    let commentOid: ObjectId
    try { commentOid = new ObjectId(id) } catch { return res.status(400).json({ error: 'Invalid id' }) }

    try {
      // Soft-delete; allow only author or admin (admin not implemented here)
      const result = await db.collection('trackcomments').updateOne(
        { _id: commentOid, profileId: auth.profileId },
        { $set: { deleted: true, updatedAt: new Date() } }
      )
      if (result.matchedCount === 0) return res.status(404).json({ error: 'Comment not found or not yours' })
      return res.status(200).json({ ok: true })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'GET, POST, PATCH, or DELETE only' })
}
