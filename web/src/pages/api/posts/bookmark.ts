import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// POST { postId, action: 'add' | 'remove', folder?: 'posts'|'reels'|'stories'|'music'|'media' }
// folder auto-categorizes saves so Archive can group by type
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { postId, action, folder } = req.body || {}
  if (!postId || !action) return res.status(400).json({ error: 'postId and action required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    if (action === 'add') {
      // Auto-detect folder if not provided — look at the post to categorize
      let finalFolder = folder || 'posts'
      if (!folder) {
        const post = await db.collection('posts').findOne(
          { _id: new ObjectId(postId) },
          { projection: { trackId: 1, uploadedMediaType: 1, isStory: 1, isEphemeral: 1 } }
        )
        if (post?.trackId) finalFolder = 'music'
        else if (post?.isStory || post?.isEphemeral) finalFolder = 'stories'
        else if (post?.uploadedMediaType === 'video') finalFolder = 'reels'
        else if (post?.uploadedMediaType === 'image') finalFolder = 'media'
        else finalFolder = 'posts'
      }

      await db.collection('bookmarks').updateOne(
        { profileId: auth.profileId, postId: new ObjectId(postId) },
        {
          $setOnInsert: { profileId: auth.profileId, postId: new ObjectId(postId), createdAt: new Date() },
          $set: { folder: finalFolder, updatedAt: new Date() },
        },
        { upsert: true },
      )
      return res.status(200).json({ ok: true, action, folder: finalFolder })
    }

    if (action === 'remove') {
      await db.collection('bookmarks').deleteOne({ profileId: auth.profileId, postId: new ObjectId(postId) })
      return res.status(200).json({ ok: true, action })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
