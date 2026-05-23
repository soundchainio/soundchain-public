/**
 * POST /api/streaming/log-play — Vercel-direct (Phase 7g.2)
 *
 * Replaces the Lambda LogStream mutation that triggered OGUN streaming
 * rewards. Same WIN-WIN reward logic, same SCid Mongo schema.
 *
 * Body:
 *   { scid, duration (s), listenerWallet?, listenerProfileId? }
 *
 * Returns Apollo LogStream shape so useLogStream + agent/play consumers
 * see no behavior change:
 *   { success, totalStreams, creatorReward, creatorWallet,
 *     creatorDailyLimitReached, listenerReward, listenerWallet,
 *     listenerDailyLimitReached, trackTitle, trackId }
 *
 * Mongo writes: SCid streamCount++, ogunRewardsEarned/dailyOgunEarned
 * accrue creator portion, lastStreamAt timestamp, listener daily counter
 * on the profile. On-chain OGUN distribution still happens via the
 * StreamingRewardsDistributor cron (separate AWS Lambda, will be
 * migrated to Vercel cron in Phase 7h).
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

const REWARDS_CONFIG = {
  rewardPerStream: 0.5,             // OGUN per stream, ALL tracks
  bonusMultiplier: 1.5,             // Verified artist bonus
  maxDailyRewards: 100,             // Max 100 OGUN/track/day
  minStreamDuration: 30,            // 30s min
  creatorSplit: 0.7,
  listenerSplit: 0.3,
  listenerMaxDaily: 50,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { scid, duration, listenerWallet, listenerProfileId } = req.body || {}
  if (!scid) return res.status(400).json({ error: 'scid required' })
  const dur = Number(duration) || 0

  // Validate min duration
  if (dur < REWARDS_CONFIG.minStreamDuration) {
    return res.status(200).json({
      success: false, totalStreams: 0, creatorReward: 0, listenerReward: 0,
      reason: `Minimum ${REWARDS_CONFIG.minStreamDuration}s required`,
    })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const scidUp = String(scid).toUpperCase()
    const scidRecord: any = await db.collection('scids').findOne({ scid: scidUp })
    if (!scidRecord) {
      return res.status(404).json({
        success: false, totalStreams: 0, creatorReward: 0, listenerReward: 0,
        error: `SCid not found: ${scid}`,
      })
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const lastReset = scidRecord.lastDailyReset ? new Date(scidRecord.lastDailyReset) : null
    const dailyResetNeeded = !lastReset || lastReset < todayStart
    const todayCreatorRewards = dailyResetNeeded ? 0 : (scidRecord.dailyOgunEarned || 0)
    const creatorDailyLimitReached = todayCreatorRewards >= REWARDS_CONFIG.maxDailyRewards

    // Track metadata + creator profile
    let trackTitle = 'Unknown Track'
    let creatorVerified = false
    let creatorWallet = scidRecord.walletAddress || null
    let track: any = null
    if (scidRecord.trackId) {
      try {
        const tOid = typeof scidRecord.trackId === 'string' ? new ObjectId(scidRecord.trackId) : scidRecord.trackId
        track = await db.collection('tracks').findOne({ _id: tOid }, { projection: { title: 1, artworkUrl: 1, profileId: 1 } as any })
        if (track?.title) trackTitle = track.title
      } catch {}
    }
    if (scidRecord.profileId) {
      try {
        const pOid = typeof scidRecord.profileId === 'string' ? new ObjectId(scidRecord.profileId) : scidRecord.profileId
        const creator: any = await db.collection('profiles').findOne({ _id: pOid }, { projection: { verified: 1, magicWalletAddress: 1, hdWalletAddress: 1 } as any })
        creatorVerified = !!creator?.verified
        if (!creatorWallet) creatorWallet = creator?.magicWalletAddress || creator?.hdWalletAddress || null
      } catch {}
    }

    // Compute base reward
    let baseReward = REWARDS_CONFIG.rewardPerStream
    if (creatorVerified) baseReward *= REWARDS_CONFIG.bonusMultiplier
    const durationBonus = Math.min(dur / 180, 2)
    baseReward *= durationBonus

    // Split
    let creatorReward = baseReward * REWARDS_CONFIG.creatorSplit
    let listenerReward = baseReward * REWARDS_CONFIG.listenerSplit

    // Creator daily cap
    if (creatorDailyLimitReached) {
      creatorReward = 0
    } else {
      const remaining = REWARDS_CONFIG.maxDailyRewards - todayCreatorRewards
      creatorReward = Math.min(creatorReward, remaining)
    }

    // Listener daily cap
    let listenerDailyLimitReached = false
    if (listenerProfileId) {
      try {
        const lOid = new ObjectId(listenerProfileId)
        const listener: any = await db.collection('profiles').findOne({ _id: lOid }, { projection: { dailyListenerOgunEarned: 1, listenerDailyReset: 1 } as any })
        const listenerLastReset = listener?.listenerDailyReset ? new Date(listener.listenerDailyReset) : null
        const listenerResetNeeded = !listenerLastReset || listenerLastReset < todayStart
        const listenerDailyEarned = listenerResetNeeded ? 0 : (listener?.dailyListenerOgunEarned || 0)
        if (listenerDailyEarned >= REWARDS_CONFIG.listenerMaxDaily) {
          listenerDailyLimitReached = true
          listenerReward = 0
        } else {
          const remaining = REWARDS_CONFIG.listenerMaxDaily - listenerDailyEarned
          listenerReward = Math.min(listenerReward, remaining)
        }
      } catch {}
    } else if (!listenerWallet) {
      // Anonymous + no wallet = no listener reward
      listenerReward = 0
    }

    // Persist SCid update
    const now = new Date()
    const scidUpdate: any = {
      $inc: { streamCount: 1 },
      $set: { lastStreamAt: now, updatedAt: now },
    }
    if (creatorReward > 0) {
      scidUpdate.$inc.ogunRewardsEarned = creatorReward
      scidUpdate.$set.dailyOgunEarned = (dailyResetNeeded ? 0 : todayCreatorRewards) + creatorReward
      if (dailyResetNeeded) scidUpdate.$set.lastDailyReset = todayStart
    } else if (dailyResetNeeded) {
      scidUpdate.$set.dailyOgunEarned = 0
      scidUpdate.$set.lastDailyReset = todayStart
    }
    if (!scidRecord.streamCountCalibratedAt) {
      scidUpdate.$set.streamCountCalibratedAt = now
    }
    await db.collection('scids').updateOne({ _id: scidRecord._id }, scidUpdate)

    // Update listener daily counter
    if (listenerReward > 0 && listenerProfileId) {
      try {
        const lOid = new ObjectId(listenerProfileId)
        await db.collection('profiles').updateOne({ _id: lOid }, {
          $inc: { dailyListenerOgunEarned: listenerReward, listenerRewardsEarned: listenerReward },
          $set: { listenerDailyReset: todayStart, updatedAt: now },
        })
      } catch {}
    }

    // Record the stream event (audit + cron pickup for on-chain distribution)
    try {
      await db.collection('streamevents').insertOne({
        scid: scidUp,
        scidId: scidRecord._id,
        trackId: scidRecord.trackId || null,
        profileId: scidRecord.profileId || null,
        listenerProfileId: listenerProfileId ? new ObjectId(listenerProfileId) : null,
        listenerWallet: listenerWallet || null,
        duration: dur,
        creatorReward,
        listenerReward,
        creatorWallet,
        timestamp: now,
        distributed: false,  // cron picks up + does on-chain
      })
    } catch {}

    const totalStreams = (scidRecord.streamCount || 0) + 1
    return res.status(200).json({
      success: true,
      totalStreams,
      creatorReward,
      creatorWallet,
      creatorProfileId: scidRecord.profileId?.toString() || null,
      creatorDailyLimitReached,
      listenerReward,
      listenerWallet: listenerWallet || null,
      listenerDailyLimitReached,
      trackTitle,
      trackId: scidRecord.trackId?.toString() || null,
      artworkUrl: track?.artworkUrl || null,
    })
  } catch (err: any) {
    return res.status(500).json({
      success: false, totalStreams: 0, creatorReward: 0, listenerReward: 0,
      error: err.message,
    })
  }
}
