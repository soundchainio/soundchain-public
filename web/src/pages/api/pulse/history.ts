/**
 * GET /api/pulse/history?profileId=xxx — chat history with a specific user
 *
 * Vercel-direct replacement for useChatHistoryLazyQuery (Apollo → Lambda).
 * Returns messages between the authenticated user and the target profile.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const targetProfileId = req.query.profileId as string
  if (!targetProfileId) return res.status(400).json({ error: 'profileId query param required' })

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const messages = db.collection('messages')
    const profiles = db.collection('profiles')

    // Defensive: query against BOTH ObjectId and string shapes for fromId/toId so legacy
    // Apollo/Lambda-era messages (stored as strings) AND new Vercel-direct messages
    // (stored as ObjectId) both surface. Discovered Apr 30: pulse chat history was empty
    // for users with pre-Vercel-port data because the query only matched the ObjectId form.
    let myOid: any, targetOid: any
    try { myOid = new ObjectId(auth.profileId) } catch { myOid = auth.profileId }
    try { targetOid = new ObjectId(targetProfileId) } catch { targetOid = targetProfileId }
    const myStr = auth.profileId.toString()
    const targetStr = String(targetProfileId)
    const myIds = [myOid, myStr]
    const targetIds = [targetOid, targetStr]

    // Fetch messages between the two users (both directions, both ID shapes)
    const docs = await messages.find({
      $or: [
        { fromId: { $in: myIds }, toId: { $in: targetIds } },
        { fromId: { $in: targetIds }, toId: { $in: myIds } },
      ],
    }).sort({ createdAt: -1 }).limit(limit).toArray()

    // Resolve both profiles
    const [myProfile, targetProfile] = await Promise.all([
      profiles.findOne({ _id: myOid }),
      profiles.findOne({ _id: targetOid }),
    ])

    // Mark unread messages from the other person as read — same dual-shape match
    await messages.updateMany(
      { fromId: { $in: targetIds }, toId: { $in: myIds }, readAt: { $in: [null, undefined] } },
      { $set: { readAt: new Date() } }
    )

    const nodes = docs.reverse().map(m => ({
      id: m._id.toString(),
      message: m.message,
      fromId: m.fromId?.toString(),
      toId: m.toId?.toString(),
      createdAt: m.createdAt,
      readAt: m.readAt || null,
      fromProfile: m.fromId?.toString() === auth.profileId?.toString()
        ? { id: myProfile?._id?.toString(), displayName: myProfile?.displayName, userHandle: myProfile?.userHandle, profilePicture: myProfile?.profilePicture }
        : { id: targetProfile?._id?.toString(), displayName: targetProfile?.displayName, userHandle: targetProfile?.userHandle, profilePicture: targetProfile?.profilePicture },
    }))

    return res.status(200).json({
      chatHistory: { nodes },
      totalCount: docs.length,
    })
  } catch (err: any) {
    console.error('[Pulse History]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
