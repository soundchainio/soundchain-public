/**
 * ARENA CHALLENGES — matchmaking for the Nodeverse gaming layer
 *
 * GET  /api/arena/challenges — list active challenges (+ filter by user)
 * POST /api/arena/challenges — create a challenge (invite another user to a match)
 * PUT  /api/arena/challenges — accept/decline/cancel a challenge
 *
 * Challenges auto-post to feed via arena_agent when accepted.
 * OGUN stakes are optional — winner takes pot (0.05% to treasury).
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { ObjectId } from 'mongodb'

const COLLECTION = 'arena_challenges'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise
  const db = client.db('soundchain')
  const col = db.collection(COLLECTION)

  // ─── GET — list challenges ──────────────────────────────
  if (req.method === 'GET') {
    const handle = req.query.handle as string | undefined
    const status = req.query.status as string || 'open'

    const filter: any = {}
    if (status !== 'all') filter.status = status
    if (handle) filter.$or = [{ challengerHandle: handle }, { opponentHandle: handle }]

    const challenges = await col.find(filter).sort({ createdAt: -1 }).limit(50).toArray()
    const stats = {
      open: await col.countDocuments({ status: 'open' }),
      accepted: await col.countDocuments({ status: 'accepted' }),
      completed: await col.countDocuments({ status: 'completed' }),
    }

    return res.status(200).json({ challenges, stats })
  }

  // ─── POST — create a challenge ──────────────────────────
  if (req.method === 'POST') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

    const { opponentHandle, game, platform, stakes, message } = req.body || {}
    if (!game || typeof game !== 'string') {
      return res.status(400).json({ error: 'game is required (e.g. "NBA 2K26")' })
    }

    // Look up challenger profile
    const profiles = db.collection('profiles')
    const challengerProfile = await profiles.findOne({ _id: new ObjectId(auth.profileId) })
    if (!challengerProfile) return res.status(404).json({ error: 'Profile not found' })

    const doc = {
      challengerId: auth.profileId,
      challengerHandle: challengerProfile.userHandle || 'anon',
      opponentHandle: opponentHandle || null, // null = open challenge (anyone can accept)
      game,
      platform: platform || 'any',
      stakes: typeof stakes === 'number' && stakes > 0 ? stakes : 0,
      stakeFee: typeof stakes === 'number' && stakes > 0 ? Math.ceil(stakes * 0.0005) : 0,
      message: message || null,
      status: 'open', // open → accepted → live → completed / cancelled / declined
      acceptedBy: null,
      acceptedAt: null,
      completedAt: null,
      winner: null,
      createdAt: new Date(),
    }

    const result = await col.insertOne(doc)

    // Auto-post to feed via arena_agent
    try {
      const stakeText = doc.stakes > 0 ? ` · Stakes: ${doc.stakes} OGUN` : ''
      const opponentText = doc.opponentHandle ? `@${doc.opponentHandle}` : 'ANYONE'
      await db.collection('posts').insertOne({
        message: `🎮 ARENA CHALLENGE!\n\n@${doc.challengerHandle} challenges ${opponentText} to ${doc.game}${stakeText}\n\nPlatform: ${doc.platform}${doc.message ? `\n"${doc.message}"` : ''}\n\nAccept the challenge at soundchain.io/dex/arena`,
        profileId: 'arena_agent',
        type: 'arena_challenge',
        arenaId: result.insertedId.toString(),
        createdAt: new Date(),
        reactions: {},
        reactionTally: 0,
        commentCount: 0,
      })
    } catch {}

    // Analytics
    fetch(`${req.headers.origin || 'https://soundchain.io'}/api/agent/analytics-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'arena_challenge_created', meta: { game, stakes: doc.stakes, opponent: doc.opponentHandle } }),
    }).catch(() => {})

    return res.status(200).json({ ok: true, challenge: { ...doc, _id: result.insertedId } })
  }

  // ─── PUT — accept / decline / cancel / complete ─────────
  if (req.method === 'PUT') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

    const { challengeId, action, winner } = req.body || {}
    if (!challengeId || !action) return res.status(400).json({ error: 'challengeId and action required' })

    const challenge = await col.findOne({ _id: new ObjectId(challengeId) })
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' })

    const profiles = db.collection('profiles')
    const myProfile = await profiles.findOne({ _id: new ObjectId(auth.profileId) })
    const myHandle = myProfile?.userHandle || 'anon'

    if (action === 'accept') {
      if (challenge.status !== 'open') return res.status(400).json({ error: 'Challenge not open' })
      if (challenge.challengerId.toString() === auth.profileId.toString()) {
        return res.status(400).json({ error: 'Cannot accept your own challenge' })
      }
      // If targeted challenge, only the opponent can accept
      if (challenge.opponentHandle && challenge.opponentHandle !== myHandle) {
        return res.status(403).json({ error: 'This challenge is for @' + challenge.opponentHandle })
      }

      await col.updateOne({ _id: new ObjectId(challengeId) }, {
        $set: { status: 'accepted', acceptedBy: myHandle, acceptedAt: new Date() },
      })

      // Auto-post to feed
      try {
        const stakeText = challenge.stakes > 0 ? ` · ${challenge.stakes} OGUN on the line!` : ''
        await db.collection('posts').insertOne({
          message: `🎮 MATCH ACCEPTED!\n\n@${myHandle} accepted @${challenge.challengerHandle}'s challenge!\n${challenge.game}${stakeText}\n\nGame ON! 🔥`,
          profileId: 'arena_agent',
          type: 'arena_accept',
          arenaId: challengeId,
          createdAt: new Date(),
          reactions: {},
          reactionTally: 0,
          commentCount: 0,
        })
      } catch {}

      return res.status(200).json({ ok: true, status: 'accepted' })
    }

    if (action === 'decline') {
      if (challenge.status !== 'open') return res.status(400).json({ error: 'Challenge not open' })
      await col.updateOne({ _id: new ObjectId(challengeId) }, { $set: { status: 'declined' } })
      return res.status(200).json({ ok: true, status: 'declined' })
    }

    if (action === 'cancel') {
      if (challenge.challengerId.toString() !== auth.profileId.toString()) {
        return res.status(403).json({ error: 'Only challenger can cancel' })
      }
      await col.updateOne({ _id: new ObjectId(challengeId) }, { $set: { status: 'cancelled' } })
      return res.status(200).json({ ok: true, status: 'cancelled' })
    }

    if (action === 'complete') {
      if (!winner) return res.status(400).json({ error: 'winner handle required' })
      await col.updateOne({ _id: new ObjectId(challengeId) }, {
        $set: { status: 'completed', winner, completedAt: new Date() },
      })

      // Post result to feed
      try {
        const stakeText = challenge.stakes > 0 ? ` and won ${challenge.stakes} OGUN!` : '!'
        await db.collection('posts').insertOne({
          message: `🏆 MATCH RESULT!\n\n@${winner} wins${stakeText}\n${challenge.game} · @${challenge.challengerHandle} vs @${challenge.acceptedBy || challenge.opponentHandle}\n\nGG! 🎮`,
          profileId: 'arena_agent',
          type: 'arena_result',
          arenaId: challengeId,
          createdAt: new Date(),
          reactions: {},
          reactionTally: 0,
          commentCount: 0,
        })
      } catch {}

      return res.status(200).json({ ok: true, status: 'completed', winner })
    }

    return res.status(400).json({ error: 'Invalid action. Use: accept, decline, cancel, complete' })
  }

  return res.status(405).json({ error: 'GET, POST, or PUT only' })
}
