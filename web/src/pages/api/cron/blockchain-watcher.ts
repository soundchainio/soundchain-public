/**
 * GET /api/cron/blockchain-watcher — Vercel Cron (Phase 7i)
 *
 * Replaces soundchain-api-production-blockchainwatcher AWS Lambda.
 * Runs every 1 minute (per vercel.json).
 *
 * Polls Polygon for new events from 6 contracts (V1+V2 NFT/Marketplace/
 * Auction) since the last processed block, dispatches each to a handler,
 * advances the block tracker.
 *
 * Handlers port the business logic from api/src/lambda/processEvents.ts.
 * Direct Mongo writes, no GraphQL middleware, no Mongoose.
 *
 * Block range capped at MAX_BLOCKS_PER_RUN (10000) to stay under public
 * RPC `eth_getLogs` limits. If we fall behind, the next tick continues
 * from where we left off.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { ethers } from 'ethers'

import SoundchainCollectible from 'contract/Soundchain721.sol/Soundchain721.json'
import SoundchainAuctionV1 from 'contract/Auction.sol/SoundchainAuction.json'
import SoundchainMarketplaceV1 from 'contract/Marketplace.sol/SoundchainMarketplace.json'
import SoundchainCollectibleEditions from 'contract/Soundchain721Editions.sol/Soundchain721Editions.json'
import SoundchainAuctionV2 from 'contract/v2/SoundchainAuction.json'
import SoundchainMarketplaceEditions from 'contract/v2/SoundchainMarketplaceEditions.json'

import { config } from 'config'

const ZERO_ADDR = '0x0000000000000000000000000000000000000000'
const MAX_BLOCKS_PER_RUN = 10_000
const POLYGON_RPC = process.env.POLYGON_RPC
  || process.env.NEXT_PUBLIC_POLYGON_RPC
  || (process.env.ALCHEMY_POLYGON_KEY ? `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_POLYGON_KEY}` : 'https://polygon-bor-rpc.publicnode.com')

const C = config.web3
const ADDR = {
  v1Marketplace: C.contractsV1.marketplaceAddress.toLowerCase(),
  v1Auction: C.contractsV1.auctionAddress.toLowerCase(),
  v1Nft: (process.env.NEXT_PUBLIC_NFT_ADDRESS || '0x01E2ae47ba5dB4938A8eC75c8E1f60AD0F1d1D78').toLowerCase(),
  v2Marketplace: C.contractsV2.marketplaceAddress.toLowerCase(),
  v2Auction: C.contractsV2.auctionAddress.toLowerCase(),
  v2Nft: C.contractsV2.contractAddress.toLowerCase(),
}

// Convert wei string → human-readable price string (matches Web3.utils.fromWei)
const priceToShow = (wei: ethers.BigNumberish): number => {
  try { return Number(ethers.utils.formatEther(wei.toString())) } catch { return 0 }
}

// ─── Mongo helpers ───────────────────────────────────────────────────────

const findUserByWallet = async (db: any, wallet: string): Promise<any | null> => {
  if (!wallet) return null
  const w = wallet.toLowerCase()
  return db.collection('users').findOne({
    $or: [
      { hdWalletAddress: { $regex: new RegExp(`^${w}$`, 'i') } },
      { magicWalletAddress: { $regex: new RegExp(`^${w}$`, 'i') } },
    ],
  })
}

const findTrackByTokenId = async (db: any, tokenId: number, nft: string): Promise<any | null> => {
  return db.collection('tracks').findOne({
    'nftData.tokenId': tokenId,
    'nftData.contract': { $regex: new RegExp(`^${nft}$`, 'i') },
  })
}

const setTrackPendingNone = async (db: any, tokenId: number, nft: string): Promise<any | null> => {
  await db.collection('tracks').updateOne(
    { 'nftData.tokenId': tokenId, 'nftData.contract': { $regex: new RegExp(`^${nft}$`, 'i') } },
    { $set: { 'nftData.pendingRequest': 'None', updatedAt: new Date() } }
  )
  return findTrackByTokenId(db, tokenId, nft)
}

const wasListedBefore = async (db: any, tokenId: number, nft: string): Promise<boolean> => {
  const count = await db.collection('listingitems').countDocuments({
    tokenId, nft: { $regex: new RegExp(`^${nft}$`, 'i') },
  })
  return count > 0
}

// ─── EVENT HANDLERS ─────────────────────────────────────────────────────

const onItemListed = async (db: any, ev: any, address: string) => {
  const { owner, nft, tokenId, pricePerItem, OGUNPricePerItem, acceptsMATIC, acceptsOGUN, startingTime } = ev.args
  const tokenIdNum = Number(tokenId)
  const user = await findUserByWallet(db, owner)
  if (!user?.profileId) return
  const profile = await db.collection('profiles').findOne({ _id: typeof user.profileId === 'string' ? new ObjectId(user.profileId) : user.profileId })
  const listedBefore = await wasListedBefore(db, tokenIdNum, nft)
  if (!profile?.verified && !listedBefore) {
    await setTrackPendingNone(db, tokenIdNum, nft)
    return
  }
  const track = await setTrackPendingNone(db, tokenIdNum, nft)
  if (!track) return
  await db.collection('listingitems').updateOne(
    { tokenId: tokenIdNum, nft: nft.toLowerCase(), contract: address.toLowerCase() },
    {
      $set: {
        owner, nft, contract: address, tokenId: tokenIdNum,
        pricePerItem: pricePerItem.toString(),
        pricePerItemToShow: priceToShow(pricePerItem),
        OGUNPricePerItem: OGUNPricePerItem?.toString() || '0',
        OGUNPricePerItemToShow: priceToShow(OGUNPricePerItem || 0),
        acceptsMATIC, acceptsOGUN,
        startingTime: Number(startingTime),
        trackId: track._id, trackEditionId: track.trackEditionId || null,
        sellerAddress: owner,
        active: true, valid: true,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  )
}

const onItemSold = async (db: any, ev: any, address: string) => {
  const { tokenId, seller, buyer, pricePerItem, nft } = ev.args
  const tokenIdNum = Number(tokenId)
  await db.collection('listingitems').updateMany(
    { tokenId: tokenIdNum, nft: { $regex: new RegExp(`^${nft}$`, 'i') }, contract: { $regex: new RegExp(`^${address}$`, 'i') } },
    { $set: { active: false, valid: false, soldAt: new Date(), buyerAddress: buyer, soldPriceToShow: priceToShow(pricePerItem), updatedAt: new Date() } }
  )
  await db.collection('tracks').updateOne(
    { 'nftData.tokenId': tokenIdNum, 'nftData.contract': { $regex: new RegExp(`^${nft}$`, 'i') } },
    { $set: { 'nftData.owner': buyer, 'nftData.pendingRequest': 'None', updatedAt: new Date() } }
  )
}

const onItemUpdated = async (db: any, ev: any, address: string) => {
  const { tokenId, newPrice, newOGUNPrice, acceptsMATIC, acceptsOGUN, startingTime, nft } = ev.args
  const tokenIdNum = Number(tokenId)
  await db.collection('listingitems').updateOne(
    { tokenId: tokenIdNum, nft: { $regex: new RegExp(`^${nft}$`, 'i') }, contract: { $regex: new RegExp(`^${address}$`, 'i') }, active: true },
    {
      $set: {
        pricePerItem: newPrice.toString(),
        pricePerItemToShow: priceToShow(newPrice),
        OGUNPricePerItem: newOGUNPrice?.toString() || '0',
        OGUNPricePerItemToShow: priceToShow(newOGUNPrice || 0),
        acceptsMATIC, acceptsOGUN,
        startingTime: Number(startingTime),
        updatedAt: new Date(),
      },
    }
  )
  await setTrackPendingNone(db, tokenIdNum, nft)
}

const onItemCanceled = async (db: any, ev: any, address: string) => {
  const { tokenId, nft } = ev.args
  const tokenIdNum = Number(tokenId)
  await db.collection('listingitems').updateMany(
    { tokenId: tokenIdNum, nft: { $regex: new RegExp(`^${nft}$`, 'i') }, contract: { $regex: new RegExp(`^${address}$`, 'i') } },
    { $set: { active: false, valid: false, cancelledAt: new Date(), updatedAt: new Date() } }
  )
  await setTrackPendingNone(db, tokenIdNum, nft)
}

const onEditionListed = async (db: any, ev: any, address: string) => {
  const { editionId, nft } = ev.args
  await db.collection('trackeditions').updateOne(
    { editionId: Number(editionId), contract: { $regex: new RegExp(`^${nft}$`, 'i') } },
    { $set: { listed: true, marketplace: address, updatedAt: new Date() } }
  )
}

const onEditionCanceled = async (db: any, ev: any) => {
  const { editionId, nft } = ev.args
  await db.collection('trackeditions').updateOne(
    { editionId: Number(editionId), contract: { $regex: new RegExp(`^${nft}$`, 'i') } },
    { $set: { listed: false, updatedAt: new Date() } }
  )
}

const onTransfer = async (db: any, ev: any, address: string) => {
  const { from, to, tokenId } = ev.args
  const tokenIdNum = Number(tokenId)
  if (from === ZERO_ADDR) {
    // Mint — set tokenId + contract on the track row that has the matching tx hash
    await db.collection('tracks').updateOne(
      { 'nftData.transactionHash': ev.transactionHash },
      { $set: { 'nftData.tokenId': tokenIdNum, 'nftData.contract': address, 'nftData.pendingRequest': 'None', updatedAt: new Date() } }
    )
  } else if (to === ZERO_ADDR) {
    // Burn — soft delete the track
    await db.collection('tracks').updateOne(
      { 'nftData.tokenId': tokenIdNum, 'nftData.contract': { $regex: new RegExp(`^${address}$`, 'i') } },
      { $set: { deleted: true, deletedAt: new Date(), updatedAt: new Date() } }
    )
  } else {
    // Standard transfer — update owner
    await db.collection('tracks').updateOne(
      { 'nftData.tokenId': tokenIdNum, 'nftData.contract': { $regex: new RegExp(`^${address}$`, 'i') } },
      { $set: { 'nftData.owner': to, updatedAt: new Date() } }
    )
  }
}

const onEditionCreated = async (db: any, ev: any, address: string) => {
  const { editionNumber, owner } = ev.args
  await db.collection('trackeditions').updateOne(
    { transactionHash: ev.transactionHash },
    {
      $set: {
        editionId: Number(editionNumber),
        contract: address,
        editionData: { pendingRequest: 'None', transactionHash: ev.transactionHash, contract: address, owner },
        updatedAt: new Date(),
      },
    }
  )
}

const onAuctionCreated = async (db: any, ev: any, address: string) => {
  const { nftAddress, tokenId, owner, reservePrice, startTimestamp, endTimestamp } = ev.args
  const tokenIdNum = Number(tokenId)
  const user = await findUserByWallet(db, owner)
  if (!user?.profileId) return
  const profile = await db.collection('profiles').findOne({ _id: typeof user.profileId === 'string' ? new ObjectId(user.profileId) : user.profileId })
  const listedBefore = await wasListedBefore(db, tokenIdNum, nftAddress)
  if (!profile?.verified && !listedBefore) {
    await setTrackPendingNone(db, tokenIdNum, nftAddress)
    return
  }
  const track = await setTrackPendingNone(db, tokenIdNum, nftAddress)
  if (!track) return
  await db.collection('auctionitems').updateOne(
    { tokenId: tokenIdNum, nft: nftAddress.toLowerCase(), contract: address.toLowerCase() },
    {
      $set: {
        owner, nft: nftAddress, contract: address, tokenId: tokenIdNum,
        startingTime: Number(startTimestamp),
        endingTime: Number(endTimestamp),
        reservePrice: reservePrice.toString(),
        reservePriceToShow: priceToShow(reservePrice),
        trackId: track._id, trackEditionId: track.trackEditionId || null,
        valid: true, active: true,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  )
}

const onBidPlaced = async (db: any, ev: any) => {
  const { nftAddress, tokenId, bidder, bid } = ev.args
  const tokenIdNum = Number(tokenId)
  const auction = await db.collection('auctionitems').findOne({
    tokenId: tokenIdNum, nft: { $regex: new RegExp(`^${nftAddress}$`, 'i') }, valid: true,
  })
  if (!auction) return
  const user = await findUserByWallet(db, bidder)
  if (!user?.profileId) return
  const track = await findTrackByTokenId(db, tokenIdNum, nftAddress)
  const seller = await findUserByWallet(db, auction.owner)
  // Outbid notification needs previous highest bidder before we overwrite
  const previousHighest = await db.collection('bids').find({ auctionId: auction._id }).sort({ amount: -1 }).limit(1).next()
  // Insert bid
  await db.collection('bids').insertOne({
    nft: nftAddress, tokenId: tokenIdNum, bidder,
    userId: user._id, profileId: typeof user.profileId === 'string' ? new ObjectId(user.profileId) : user.profileId,
    amount: bid.toString(), amountToShow: priceToShow(bid),
    auctionId: auction._id,
    notifiedEndingInOneHour: false,
    createdAt: new Date(),
  })
  // Update auction highest bid
  await db.collection('auctionitems').updateOne(
    { _id: auction._id },
    { $set: { highestBid: bid.toString(), highestBidToShow: priceToShow(bid), updatedAt: new Date() } }
  )
  // Notify seller of new bid
  if (seller?.profileId && track) {
    await db.collection('notifications').insertOne({
      type: 'NewBid',
      recipientProfileId: typeof seller.profileId === 'string' ? new ObjectId(seller.profileId) : seller.profileId,
      trackId: track._id, trackName: track.title || '', artist: track.artist || '', artworkUrl: track.artworkUrl || '',
      price: priceToShow(bid),
      metadata: { auctionId: auction._id },
      read: false, createdAt: new Date(),
    })
  }
  // Notify outbid (previous highest)
  if (previousHighest && previousHighest.profileId && track) {
    await db.collection('notifications').insertOne({
      type: 'Outbid',
      recipientProfileId: previousHighest.profileId,
      trackId: track._id, trackName: track.title || '', artist: track.artist || '', artworkUrl: track.artworkUrl || '',
      price: priceToShow(bid),
      metadata: { auctionId: auction._id },
      read: false, createdAt: new Date(),
    })
  }
}

const onAuctionResulted = async (db: any, ev: any) => {
  const { tokenId, winner, oldOwner, winningBid, nftAddress } = ev.args
  const tokenIdNum = Number(tokenId)
  await db.collection('auctionitems').updateMany(
    { tokenId: tokenIdNum, nft: { $regex: new RegExp(`^${nftAddress}$`, 'i') } },
    { $set: { valid: false, active: false, finalizedAt: new Date(), winner, finalPriceToShow: priceToShow(winningBid), updatedAt: new Date() } }
  )
  await db.collection('tracks').updateOne(
    { 'nftData.tokenId': tokenIdNum, 'nftData.contract': { $regex: new RegExp(`^${nftAddress}$`, 'i') } },
    { $set: { 'nftData.owner': winner, 'nftData.pendingRequest': 'None', updatedAt: new Date() } }
  )
}

const onAuctionCancelled = async (db: any, ev: any) => {
  const { tokenId, nftAddress } = ev.args
  const tokenIdNum = Number(tokenId)
  await db.collection('auctionitems').updateMany(
    { tokenId: tokenIdNum },
    { $set: { valid: false, active: false, cancelledAt: new Date(), updatedAt: new Date() } }
  )
  await setTrackPendingNone(db, tokenIdNum, nftAddress)
}

const onUpdateAuction = async (db: any, ev: any) => {
  const { tokenId, reservePrice, startTime, endTime, nftAddress } = ev.args
  const tokenIdNum = Number(tokenId)
  await db.collection('auctionitems').updateOne(
    { tokenId: tokenIdNum, nft: { $regex: new RegExp(`^${nftAddress}$`, 'i') }, valid: true },
    {
      $set: {
        reservePrice: reservePrice.toString(),
        reservePriceToShow: priceToShow(reservePrice),
        startingTime: Number(startTime),
        endingTime: Number(endTime),
        updatedAt: new Date(),
      },
    }
  )
  await setTrackPendingNone(db, tokenIdNum, nftAddress)
}

// ─── DISPATCHER ─────────────────────────────────────────────────────────

const dispatch = async (db: any, kind: 'marketplace' | 'nft' | 'auction', ev: any, address: string, stats: any) => {
  try {
    const name = ev.event || ev.eventName
    if (kind === 'marketplace') {
      switch (name) {
        case 'ItemListed': await onItemListed(db, ev, address); stats.itemListed++; break
        case 'ItemSold': await onItemSold(db, ev, address); stats.itemSold++; break
        case 'ItemUpdated': await onItemUpdated(db, ev, address); stats.itemUpdated++; break
        case 'ItemCanceled': await onItemCanceled(db, ev, address); stats.itemCanceled++; break
        case 'EditionListed': await onEditionListed(db, ev, address); stats.editionListed++; break
        case 'EditionCanceled': await onEditionCanceled(db, ev); stats.editionCanceled++; break
      }
    } else if (kind === 'nft') {
      switch (name) {
        case 'Transfer': await onTransfer(db, ev, address); stats.transfer++; break
        case 'EditionCreated': await onEditionCreated(db, ev, address); stats.editionCreated++; break
      }
    } else if (kind === 'auction') {
      switch (name) {
        case 'AuctionCreated': await onAuctionCreated(db, ev, address); stats.auctionCreated++; break
        case 'BidPlaced': await onBidPlaced(db, ev); stats.bidPlaced++; break
        case 'AuctionResulted': await onAuctionResulted(db, ev); stats.auctionResulted++; break
        case 'AuctionCancelled': await onAuctionCancelled(db, ev); stats.auctionCancelled++; break
        case 'UpdateAuction': await onUpdateAuction(db, ev); stats.updateAuction++; break
      }
    }
  } catch (err: any) {
    stats.errors++
    try {
      await db.collection('failedevents').insertOne({
        kind, name: ev.event || ev.eventName,
        error: err.message,
        txHash: ev.transactionHash,
        blockNumber: ev.blockNumber,
        args: JSON.parse(JSON.stringify(ev.args || {}, (_k, v) => typeof v === 'bigint' || (v && typeof v === 'object' && v._isBigNumber) ? v.toString() : v)),
        createdAt: new Date(),
      })
    } catch {}
  }
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.headers['x-vercel-cron'] && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Cron only' })
  }

  const stats: any = {
    fromBlock: 0, toBlock: 0, blockRange: 0,
    itemListed: 0, itemSold: 0, itemUpdated: 0, itemCanceled: 0,
    editionListed: 0, editionCanceled: 0,
    transfer: 0, editionCreated: 0,
    auctionCreated: 0, bidPlaced: 0, auctionResulted: 0, auctionCancelled: 0, updateAuction: 0,
    errors: 0,
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC)

    // Last processed block from tracker — single doc keyed by name
    const trackerDoc = await db.collection('blocktrackers').findOne({ name: 'vercel-cron' })
    const currentBlock = await provider.getBlockNumber()
    const fromBlock = trackerDoc?.blockNumber || currentBlock - 50
    const toBlock = Math.min(currentBlock, fromBlock + MAX_BLOCKS_PER_RUN)

    stats.fromBlock = fromBlock
    stats.toBlock = toBlock
    stats.blockRange = toBlock - fromBlock

    if (fromBlock >= toBlock) {
      return res.status(200).json({ success: true, message: 'No new blocks', stats })
    }

    // Load contracts
    const v1Marketplace = new ethers.Contract(ADDR.v1Marketplace, (SoundchainMarketplaceV1 as any).abi, provider)
    const v1Auction = new ethers.Contract(ADDR.v1Auction, (SoundchainAuctionV1 as any).abi, provider)
    const v1Nft = new ethers.Contract(ADDR.v1Nft, (SoundchainCollectible as any).abi, provider)
    const v2Marketplace = new ethers.Contract(ADDR.v2Marketplace, (SoundchainMarketplaceEditions as any).abi, provider)
    const v2Auction = new ethers.Contract(ADDR.v2Auction, (SoundchainAuctionV2 as any).abi, provider)
    const v2Nft = new ethers.Contract(ADDR.v2Nft, (SoundchainCollectibleEditions as any).abi, provider)

    // Fetch events in parallel
    const [
      v1MarketplaceEvents, v2MarketplaceEvents,
      v1NftEvents, v2NftEvents,
      v1AuctionEvents, v2AuctionEvents,
    ] = await Promise.all([
      v1Marketplace.queryFilter('*' as any, fromBlock, toBlock).catch(() => [] as any[]),
      v2Marketplace.queryFilter('*' as any, fromBlock, toBlock).catch(() => [] as any[]),
      v1Nft.queryFilter('*' as any, fromBlock, toBlock).catch(() => [] as any[]),
      v2Nft.queryFilter('*' as any, fromBlock, toBlock).catch(() => [] as any[]),
      v1Auction.queryFilter('*' as any, fromBlock, toBlock).catch(() => [] as any[]),
      v2Auction.queryFilter('*' as any, fromBlock, toBlock).catch(() => [] as any[]),
    ])

    // Marketplace events (V1 + V2)
    for (const ev of v1MarketplaceEvents) await dispatch(db, 'marketplace', ev, ADDR.v1Marketplace, stats)
    for (const ev of v2MarketplaceEvents) await dispatch(db, 'marketplace', ev, ADDR.v2Marketplace, stats)

    // NFT events (V1 + V2)
    for (const ev of v1NftEvents) await dispatch(db, 'nft', ev, ADDR.v1Nft, stats)
    for (const ev of v2NftEvents) await dispatch(db, 'nft', ev, ADDR.v2Nft, stats)

    // Auction events (V1 + V2)
    for (const ev of v1AuctionEvents) await dispatch(db, 'auction', ev, ADDR.v1Auction, stats)
    for (const ev of v2AuctionEvents) await dispatch(db, 'auction', ev, ADDR.v2Auction, stats)

    // Advance block tracker
    await db.collection('blocktrackers').updateOne(
      { name: 'vercel-cron' },
      { $set: { name: 'vercel-cron', blockNumber: toBlock + 1, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    )

    return res.status(200).json({ success: true, runAt: new Date().toISOString(), stats })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message, stats })
  }
}
