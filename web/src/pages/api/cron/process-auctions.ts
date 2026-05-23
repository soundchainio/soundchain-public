/**
 * GET /api/cron/process-auctions — Vercel Cron (Phase 7h)
 *
 * Replaces soundchain-api-production-processauctions AWS Lambda.
 * Runs every 5 minutes (per vercel.json).
 *
 * Two responsibilities (notification-only — on-chain settlement happens
 * client-side via the marketplace contract's endAuction() call):
 *
 * 1) Find auctions where endingTime <= now AND no AuctionEnded notification
 *    exists yet → create AuctionEnded notification for both seller + winning
 *    bidder. The original Lambda used a heavy aggregate; we use simpler
 *    queries here.
 *
 * 2) Find bids on auctions ending within the next hour where bid hasn't
 *    been notifiedEndingInOneHour=true → create AuctionEnding notification
 *    for each bidder + flip the bid's notifiedEndingInOneHour flag.
 *
 * No on-chain calls. Pure Mongo writes via official driver.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.headers['x-vercel-cron'] && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Cron only' })
  }

  const stats = {
    auctionsEnded: 0,
    auctionsEndedNotificationsSent: 0,
    auctionsEndingInOneHour: 0,
    bidEndingNotificationsSent: 0,
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const nowSec = Math.floor(Date.now() / 1000)
    const oneHourFromNowSec = nowSec + 60 * 60

    // ─── 1. Ended auctions needing AuctionEnded notifications ──────────
    const endedAuctions = await db.collection('auctionitems').find({
      valid: true,
      endingTime: { $lte: nowSec },
    }).limit(200).toArray()

    stats.auctionsEnded = endedAuctions.length

    for (const auction of endedAuctions) {
      const auctionId = (auction as any)._id
      // Skip if AuctionEnded notification already exists for this auction
      const existing = await db.collection('notifications').findOne({
        type: 'AuctionEnded',
        'metadata.auctionId': auctionId,
      })
      if (existing) continue

      // Find highest bid + bidder
      const highestBid: any = await db.collection('bids')
        .find({ auctionId, amount: (auction as any).highestBid })
        .sort({ createdAt: -1 })
        .limit(1)
        .next()

      // Find track by tokenId + nft (contract)
      const track: any = await db.collection('tracks').findOne({
        'nftData.tokenId': (auction as any).tokenId,
        'nftData.contract': (auction as any).nft,
      })
      if (!track) continue

      // Seller = owner address → look up user
      const owner = (auction as any).owner
      const sellerUser: any = owner
        ? await db.collection('users').findOne({
            $or: [
              { hdWalletAddress: { $regex: new RegExp(`^${owner}$`, 'i') } },
              { magicWalletAddress: { $regex: new RegExp(`^${owner}$`, 'i') } },
            ],
          })
        : null

      const buyerUser: any = highestBid?.bidder
        ? await db.collection('users').findOne({
            $or: [
              { hdWalletAddress: { $regex: new RegExp(`^${highestBid.bidder}$`, 'i') } },
              { magicWalletAddress: { $regex: new RegExp(`^${highestBid.bidder}$`, 'i') } },
            ],
          })
        : null

      const price = (auction as any).highestBidToShow || (auction as any).reservePriceToShow || 0

      // Create notifications (one per recipient)
      const recipients: any[] = []
      if (sellerUser?.profileId) {
        recipients.push({
          recipientProfileId: typeof sellerUser.profileId === 'string' ? new ObjectId(sellerUser.profileId) : sellerUser.profileId,
          role: 'seller',
        })
      }
      if (buyerUser?.profileId) {
        recipients.push({
          recipientProfileId: typeof buyerUser.profileId === 'string' ? new ObjectId(buyerUser.profileId) : buyerUser.profileId,
          role: 'buyer',
        })
      }

      for (const r of recipients) {
        await db.collection('notifications').insertOne({
          type: 'AuctionEnded',
          recipientProfileId: r.recipientProfileId,
          trackId: track._id,
          trackName: track.title || '',
          artist: track.artist || '',
          artworkUrl: track.artworkUrl || '',
          price,
          metadata: { auctionId, role: r.role },
          read: false,
          createdAt: new Date(),
        })
        stats.auctionsEndedNotificationsSent += 1
      }
    }

    // ─── 2. Bids on auctions ending in 1hr needing notification ────────
    const endingSoonAuctions = await db.collection('auctionitems').find({
      valid: true,
      endingTime: { $gt: nowSec, $lte: oneHourFromNowSec },
    }).limit(200).toArray()

    stats.auctionsEndingInOneHour = endingSoonAuctions.length

    for (const auction of endingSoonAuctions) {
      const auctionId = (auction as any)._id
      // Bids on this auction that haven't been notified yet, one per bidder
      const bids = await db.collection('bids').find({
        auctionId,
        notifiedEndingInOneHour: { $ne: true },
      }).toArray()

      // Dedup by bidder profileId (or wallet)
      const seen = new Set<string>()
      for (const bid of bids) {
        const key = (bid as any).profileId?.toString() || (bid as any).bidder
        if (!key || seen.has(key)) continue
        seen.add(key)

        const bidder = (bid as any).bidder
        const track: any = await db.collection('tracks').findOne({
          'nftData.tokenId': (auction as any).tokenId,
          'nftData.contract': (auction as any).nft,
        })
        if (!track) continue

        const user: any = bidder
          ? await db.collection('users').findOne({
              $or: [
                { hdWalletAddress: { $regex: new RegExp(`^${bidder}$`, 'i') } },
                { magicWalletAddress: { $regex: new RegExp(`^${bidder}$`, 'i') } },
              ],
            })
          : null
        if (!user?.profileId) continue

        await db.collection('notifications').insertOne({
          type: 'AuctionIsEnding',
          recipientProfileId: typeof user.profileId === 'string' ? new ObjectId(user.profileId) : user.profileId,
          trackId: track._id,
          trackName: track.title || '',
          artist: track.artist || '',
          artworkUrl: track.artworkUrl || '',
          price: (bid as any).amountToShow || 0,
          metadata: { auctionId, bidId: (bid as any)._id },
          read: false,
          createdAt: new Date(),
        })
        stats.bidEndingNotificationsSent += 1

        await db.collection('bids').updateOne(
          { _id: (bid as any)._id },
          { $set: { notifiedEndingInOneHour: true, updatedAt: new Date() } }
        )
      }
    }

    return res.status(200).json({
      success: true,
      runAt: new Date().toISOString(),
      stats,
    })
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
      stats,
    })
  }
}
