/**
 * GET /api/admin/fix-chats — Diagnose and fix chat history issues
 * POST /api/admin/fix-chats — Remove bot messages that may be corrupting the aggregation
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    if (req.method === 'GET') {
      // Diagnose — show message stats
      const totalMessages = await db.collection('messages').countDocuments()

      // Sample messages to check ID types
      const samples = await db.collection('messages').find().limit(10).toArray()
      const typeInfo = samples.map(m => ({
        id: m._id.toString(),
        fromId: m.fromId?.toString()?.slice(0, 12),
        fromIdType: typeof m.fromId === 'string' ? 'string' : (m.fromId instanceof ObjectId ? 'ObjectId' : typeof m.fromId),
        toId: m.toId?.toString()?.slice(0, 12),
        toIdType: typeof m.toId === 'string' ? 'string' : (m.toId instanceof ObjectId ? 'ObjectId' : typeof m.toId),
        message: m.message?.slice(0, 40),
        createdAt: m.createdAt,
      }))

      // Find bot messages
      const botProfile = await db.collection('profiles').findOne({ handle: 'furl_ai' })
      const botMessages = botProfile
        ? await db.collection('messages').countDocuments({
            $or: [
              { fromId: botProfile._id },
              { fromId: botProfile._id.toString() },
            ]
          })
        : 0

      return res.status(200).json({
        totalMessages,
        botProfileId: botProfile?._id?.toString(),
        botMessages,
        sampleTypes: typeInfo,
      })
    }

    if (req.method === 'POST') {
      const action = req.query.action as string

      if (action === 'remove-bot') {
        // Remove all messages from the bot that might be corrupting chats
        const botProfile = await db.collection('profiles').findOne({ handle: 'furl_ai' })
        if (!botProfile) return res.status(404).json({ error: 'Bot profile not found' })

        const deleted = await db.collection('messages').deleteMany({
          $or: [
            { fromId: botProfile._id },
            { fromId: botProfile._id.toString() },
          ]
        })

        return res.status(200).json({ deleted: deleted.deletedCount, botProfileId: botProfile._id.toString() })
      }

      if (action === 'fix-types') {
        // Convert any string fromId/toId to ObjectId
        const messages = await db.collection('messages').find({
          $or: [
            { fromId: { $type: 'string' } },
            { toId: { $type: 'string' } },
          ]
        }).toArray()

        let fixed = 0
        for (const msg of messages) {
          const update: any = {}
          if (typeof msg.fromId === 'string') {
            try { update.fromId = new ObjectId(msg.fromId) } catch {}
          }
          if (typeof msg.toId === 'string') {
            try { update.toId = new ObjectId(msg.toId) } catch {}
          }
          if (Object.keys(update).length > 0) {
            await db.collection('messages').updateOne({ _id: msg._id }, { $set: update })
            fixed++
          }
        }

        return res.status(200).json({ messagesWithStringIds: messages.length, fixed })
      }

      return res.status(400).json({ error: 'Use ?action=remove-bot or ?action=fix-types' })
    }

    return res.status(405).json({ error: 'GET or POST only' })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}
