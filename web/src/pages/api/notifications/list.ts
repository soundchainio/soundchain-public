/**
 * GET /api/notifications/list — Vercel-direct (Phase 7e Apollo strip)
 *
 * ?limit=20&cursor=xxx — pagination
 *
 * Returns notifications shaped to match Apollo's discriminated-union
 * Notification types. Each node has the fields that its renderer
 * (CommentNotificationItem, NewPostNotificationItem, etc) destructures.
 *
 * Type mapping (mongo notification.type → Apollo NotificationType):
 *   'comment'      → COMMENT          {link, body, previewBody, authorName, authorPicture}
 *   'follower'     → FOLLOWER         {link, followerName, followerPicture}
 *   'reaction'     → REACTION         {link, authorName, authorPicture, reactionType, postId}
 *   'newpost'      → NEW_POST         {link, body, previewBody, authorName, authorPicture, track}
 *   'nftsold'      → NFT_SOLD         {price, trackId, trackName, artist, artworkUrl, buyerName,
 *                                       buyerPicture, buyerProfileId, sellType, isPaymentOgun}
 *   'wonauction'   → WON_AUCTION      {price, trackId, trackName, artist, artworkUrl}
 *   'auctionending'→ AUCTION_ENDING   {...}
 *   'auctionended' → AUCTION_ENDED    {...}
 *   'outbid'       → OUTBID           {...}
 *   'newbid'       → NEW_BID          {...}
 *   'verifupdate'  → VERIFICATION_REQUEST_UPDATE  {body, createdAt}
 *   'newverif'     → NEW_VERIFICATION_REQUEST     {verificationRequestId, createdAt}
 *   'deletedpost'  → DELETED_POST     {authorName, authorPicture, body, previewBody, mediaLink, track}
 *   'deletedcomment'→ DELETED_COMMENT {body, previewBody, link, authorName, authorPicture}
 *   default        → GENERIC          {body, link, createdAt}
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

const SITE_BASE = '/posts'

function buildLink(n: any): string {
  if (n.link) return n.link
  if (n.postId) return `${SITE_BASE}/${n.postId.toString()}`
  if (n.trackId) return `/tracks/${n.trackId.toString()}`
  return '/notifications'
}

function previewOf(body: string | null | undefined, max = 140): string {
  if (!body) return ''
  if (body.length <= max) return body
  return body.slice(0, max).trim() + '…'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const auth = await authFromRequest(req)
  if (!auth) return res.status(200).json({ nodes: [], pageInfo: { hasNextPage: false, totalCount: 0 } })

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const cursor = req.query.cursor as string

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const filter: any = { recipientProfileId: auth.profileId }
    if (cursor) {
      try { filter._id = { $lt: new ObjectId(cursor) } } catch {}
    }

    const notifications = await db.collection('notifications')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .toArray()

    const hasNextPage = notifications.length > limit
    if (hasNextPage) notifications.pop()

    // Hydrate sender profiles + referenced tracks in parallel
    const senderIds = [...new Set(notifications.map(n => n.senderProfileId?.toString()).filter(Boolean))]
    const senderOids = senderIds.map(id => { try { return new ObjectId(id) } catch { return null } }).filter(Boolean) as ObjectId[]
    const trackIds = [...new Set(notifications.map(n => n.trackId?.toString()).filter(Boolean))]
    const trackOids = trackIds.map(id => { try { return new ObjectId(id) } catch { return null } }).filter(Boolean) as ObjectId[]

    const [senders, tracks] = await Promise.all([
      senderOids.length > 0
        ? db.collection('profiles').find({ _id: { $in: senderOids } }).project({ displayName: 1, userHandle: 1, profilePicture: 1 }).toArray()
        : Promise.resolve([] as any[]),
      trackOids.length > 0
        ? db.collection('tracks').find({ _id: { $in: trackOids } }).project({ title: 1, playbackUrl: 1, artworkUrl: 1, artist: 1, saleType: 1, price: 1, isFavorite: 1, playbackCountFormatted: 1, favoriteCount: 1 }).toArray()
        : Promise.resolve([] as any[]),
    ])
    const senderMap = new Map(senders.map(s => [s._id.toString(), s]))
    const trackMap = new Map(tracks.map(t => [t._id.toString(), t]))

    const nodes = notifications.map(n => {
      const sender = senderMap.get(n.senderProfileId?.toString())
      const track = n.trackId ? trackMap.get(n.trackId.toString()) : null
      const senderName = sender?.displayName || sender?.userHandle || 'Someone'
      const senderPic = sender?.profilePicture || null
      const body = n.body || n.message || ''
      const preview = previewOf(body)
      const link = buildLink(n)
      const baseFields = {
        id: n._id.toString(),
        type: (n.type || 'GENERIC').toUpperCase(),
        createdAt: n.createdAt || null,
        read: !!n.read,
      }
      const trackProjection = track ? {
        id: n.trackId?.toString(),
        title: track.title || null,
        playbackUrl: track.playbackUrl || '',
        artworkUrl: track.artworkUrl || null,
        artist: track.artist || null,
        isFavorite: track.isFavorite || false,
        playbackCountFormatted: String(track.playbackCount || 0),
        favoriteCount: track.favoriteCount || 0,
        saleType: track.saleType || '',
        price: track.price ? { value: track.price.value || 0, currency: track.price.currency || 'POL' } : { value: 0, currency: 'POL' },
      } : null

      const t = String(n.type || 'general').toLowerCase()
      switch (t) {
        case 'comment':
          return { ...baseFields, type: 'COMMENT', link, body, previewBody: preview, authorName: senderName, authorPicture: senderPic, postId: n.postId?.toString() || '' }
        case 'follower':
        case 'newfollower':
          return { ...baseFields, type: 'FOLLOWER', link, followerName: senderName, followerPicture: senderPic }
        case 'reaction':
          return { ...baseFields, type: 'REACTION', link, authorName: senderName, authorPicture: senderPic, reactionType: n.reactionType || 'LIKE', postId: n.postId?.toString() || '' }
        case 'newpost':
        case 'new_post':
          return { ...baseFields, type: 'NEW_POST', link, body, previewBody: preview, previewLink: n.previewLink || null, authorName: senderName, authorPicture: senderPic, track: trackProjection }
        case 'nftsold':
        case 'nft_sold':
          return {
            ...baseFields,
            type: 'NFT_SOLD',
            price: n.price || 0,
            trackId: n.trackId?.toString() || '',
            trackName: track?.title || '',
            artist: track?.artist || '',
            artworkUrl: track?.artworkUrl || '',
            buyerName: senderName,
            buyerPicture: senderPic || '',
            buyerProfileId: n.senderProfileId?.toString() || '',
            sellType: n.sellType || 'BUY_NOW',
            isPaymentOgun: !!n.isPaymentOgun,
          }
        case 'wonauction':
        case 'won_auction':
          return { ...baseFields, type: 'WON_AUCTION', price: n.price || 0, trackId: n.trackId?.toString() || '', trackName: track?.title || '', artist: track?.artist || '', artworkUrl: track?.artworkUrl || '' }
        case 'auctionending':
        case 'auction_ending':
          return { ...baseFields, type: 'AUCTION_IS_ENDING', price: n.price || 0, trackId: n.trackId?.toString() || '', trackName: track?.title || '', artist: track?.artist || '', artworkUrl: track?.artworkUrl || '' }
        case 'auctionended':
        case 'auction_ended':
          return { ...baseFields, type: 'AUCTION_ENDED', price: n.price || 0, trackId: n.trackId?.toString() || '', trackName: track?.title || '', artist: track?.artist || '', artworkUrl: track?.artworkUrl || '' }
        case 'outbid':
          return { ...baseFields, type: 'OUTBID', price: n.price || 0, trackId: n.trackId?.toString() || '', trackName: track?.title || '', artist: track?.artist || '', artworkUrl: track?.artworkUrl || '' }
        case 'newbid':
        case 'new_bid':
          return { ...baseFields, type: 'NEW_BID', price: n.price || 0, trackId: n.trackId?.toString() || '', trackName: track?.title || '', artist: track?.artist || '', artworkUrl: track?.artworkUrl || '' }
        case 'verifupdate':
        case 'verification_request_update':
          return { ...baseFields, type: 'VERIFICATION_REQUEST_UPDATE', body, createdAt: n.createdAt }
        case 'newverif':
        case 'new_verification_request':
          return { ...baseFields, type: 'NEW_VERIFICATION_REQUEST', verificationRequestId: n.verificationRequestId?.toString() || '' }
        case 'deletedpost':
        case 'deleted_post':
          return { ...baseFields, type: 'DELETED_POST', authorName: senderName, authorPicture: senderPic, body, previewBody: preview, mediaLink: n.mediaLink || null, track: trackProjection ? { title: track?.title, playbackUrl: track?.playbackUrl || '' } : null }
        case 'deletedcomment':
        case 'deleted_comment':
          return { ...baseFields, type: 'DELETED_COMMENT', body, previewBody: preview, link, authorName: senderName, authorPicture: senderPic }
        default:
          return { ...baseFields, type: 'GENERIC', body, link }
      }
    })

    return res.status(200).json({
      nodes,
      pageInfo: { hasNextPage, endCursor: notifications.length > 0 ? notifications[notifications.length - 1]._id.toString() : null, totalCount: nodes.length },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
