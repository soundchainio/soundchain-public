/**
 * POST /api/log-stream — mint-side OGUN streaming reward (self-contained, Mongo-direct).
 *
 * SoundChain is a publishing house: every play that fetches a track from IPFS is a
 * tracked stream and pays the 70/30 OGUN split (creator/listener) — on mint exactly
 * like soundchain.io. This route replicates web's /api/streaming/log-play logic
 * against the same Mongo `scids` schema (no Lambda — the old GraphQL logStream proxy
 * returned success:false and took ~29s).
 *
 * Body: { trackId?, scid?, duration (s), listenerWallet?, listenerProfileId? }
 *   - Pass trackId (the marketplace listing id) OR an scid code. trackId is resolved
 *     to its scid via the `scids` collection. NOTE: scids.trackId is stored as a
 *     STRING (5432/5433 docs) — querying by ObjectId silently returns null, which is
 *     why scid resolution was broken everywhere. We match string first, ObjectId as
 *     a fallback for the lone legacy doc.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

const REWARDS_CONFIG = {
  rewardPerStream: 0.5,
  bonusMultiplier: 1.5,
  maxDailyRewards: 100,
  minStreamDuration: 30,
  creatorSplit: 0.7,
  listenerSplit: 0.3,
  listenerMaxDaily: 50,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  const { scid, trackId, duration, listenerWallet, listenerProfileId } = (req.body || {}) as {
    scid?: string
    trackId?: string
    duration?: number
    listenerWallet?: string
    listenerProfileId?: string
  }
  const dur = Number(duration) || 0
  if (!scid && !trackId) return res.status(400).json({ error: 'scid or trackId required' })
  if (dur < REWARDS_CONFIG.minStreamDuration) {
    return res.status(200).json({
      success: false, totalStreams: 0, creatorReward: 0, listenerReward: 0,
      reason: `Minimum ${REWARDS_CONFIG.minStreamDuration}s required`,
    })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Resolve the SCid record by scid code OR by trackId (string-keyed; ObjectId fallback).
    let scidRecord: any = null
    if (scid) {
      scidRecord = await db.collection('scids').findOne({ scid: String(scid).toUpperCase() })
    } else if (trackId) {
      const ors: any[] = [{ trackId: String(trackId) }]
      if (ObjectId.isValid(trackId)) ors.push({ trackId: new ObjectId(trackId) })
      scidRecord = await db.collection('scids').findOne({ $or: ors })
    }
    if (!scidRecord) {
      return res.status(404).json({
        success: false, totalStreams: 0, creatorReward: 0, listenerReward: 0,
        error: `SCid not found for ${scid || trackId}`,
      })
    }
    const scidUp = String(scidRecord.scid || '').toUpperCase()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const lastReset = scidRecord.lastDailyReset ? new Date(scidRecord.lastDailyReset) : null
    const dailyResetNeeded = !lastReset || lastReset < todayStart
    const todayCreatorRewards = dailyResetNeeded ? 0 : (scidRecord.dailyOgunEarned || 0)
    const creatorDailyLimitReached = todayCreatorRewards >= REWARDS_CONFIG.maxDailyRewards

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

    let baseReward = REWARDS_CONFIG.rewardPerStream
    if (creatorVerified) baseReward *= REWARDS_CONFIG.bonusMultiplier
    const durationBonus = Math.min(dur / 180, 2)
    baseReward *= durationBonus

    let creatorReward = baseReward * REWARDS_CONFIG.creatorSplit
    let listenerReward = baseReward * REWARDS_CONFIG.listenerSplit

    if (creatorDailyLimitReached) {
      creatorReward = 0
    } else {
      const remaining = REWARDS_CONFIG.maxDailyRewards - todayCreatorRewards
      creatorReward = Math.min(creatorReward, remaining)
    }

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
      listenerReward = 0
    }

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
    if (!scidRecord.streamCountCalibratedAt) scidUpdate.$set.streamCountCalibratedAt = now
    await db.collection('scids').updateOne({ _id: scidRecord._id }, scidUpdate)

    if (listenerReward > 0 && listenerProfileId) {
      try {
        const lOid = new ObjectId(listenerProfileId)
        await db.collection('profiles').updateOne({ _id: lOid }, {
          $inc: { dailyListenerOgunEarned: listenerReward, listenerRewardsEarned: listenerReward },
          $set: { listenerDailyReset: todayStart, updatedAt: now },
        })
      } catch {}
    }

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
        source: 'mint',
        timestamp: now,
        distributed: false,
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
