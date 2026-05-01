/**
 * Create Track with SCid — Vercel direct (replaces createTrackWithSCid Lambda mutation)
 * POST { title, assetUrl, artist?, album?, artworkUrl?, description?, genres?, copyright?, releaseYear?, createPost? }
 * Auth required. Returns { track, scid }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export const config = {
  maxDuration: 60,
}

// Pin an S3-hosted asset to IPFS via Pinata. Returns the IPFS CID, or null on failure.
// Restores the pre-Phase-5 (Lambda-era) behavior so SCid playback URLs land on a CORS-
// friendly, decentralized gateway instead of the raw S3 bucket.
async function pinAssetToIPFS(fileUrl: string, fileName: string): Promise<string | null> {
  const apiKey = process.env.PINATA_API_KEY
  const apiSecret = process.env.PINATA_API_SECRET
  if (!apiKey || !apiSecret) return null

  try {
    const fileResponse = await fetch(fileUrl)
    if (!fileResponse.ok) return null
    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer())
    const formData = new FormData()
    formData.append('file', new Blob([fileBuffer]), fileName)
    formData.append('pinataMetadata', JSON.stringify({ name: fileName }))
    formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

    const pinResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { pinata_api_key: apiKey, pinata_secret_api_key: apiSecret },
      body: formData,
    })
    if (!pinResponse.ok) return null
    const pinResult = await pinResponse.json()
    return pinResult.IpfsHash || null
  } catch {
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { title, assetUrl, artist, album, artworkUrl, description, genres, copyright, releaseYear, createPost } = req.body || {}
  if (!title || !assetUrl) return res.status(400).json({ error: 'title and assetUrl required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const now = new Date()

    // Pin asset to IPFS so playbackUrl lands on the decentralized gateway path the
    // AudioEngine already knows how to route. Falls back to the raw S3 URL if Pinata
    // is unreachable so the upload still completes.
    const ipfsCid = await pinAssetToIPFS(assetUrl, title)
    const playbackUrl = ipfsCid ? `https://soundchain.mypinata.cloud/ipfs/${ipfsCid}` : assetUrl

    // Create track document
    const track = {
      profileId: auth.profileId,
      title,
      assetUrl,
      playbackUrl,
      ipfsCid: ipfsCid || undefined,
      artist: artist || '',
      album: album || '',
      artworkUrl: artworkUrl || '',
      description: description || '',
      genres: genres || [],
      copyright: copyright || '',
      releaseYear: releaseYear || new Date().getFullYear(),
      deleted: false,
      playbackCount: 0,
      favoriteCount: 0,
      listingCount: 0,
      createdAt: now,
      updatedAt: now,
    }

    const trackResult = await db.collection('tracks').insertOne(track)
    const trackId = trackResult.insertedId

    // Generate SCid — format: SC-POL-XXXX-XXXXXXX
    const count = await db.collection('scids').estimatedDocumentCount()
    const scidNumber = count + 2600001
    const prefix = 'SC-POL'
    const block = Math.floor(scidNumber / 1000000).toString().padStart(4, '0').slice(-4)
    const seq = (scidNumber % 1000000).toString().padStart(7, '0')
    const scidCode = `${prefix}-${block}-${seq}`

    const scid = {
      trackId,
      profileId: auth.profileId,
      code: scidCode,
      streamCount: 0,
      totalOgunEarned: 0,
      claimedOgun: 0,
      unclaimedOgun: 0,
      isNFT: false,
      createdAt: now,
      updatedAt: now,
    }

    await db.collection('scids').insertOne(scid)

    // Auto-post to feed if requested
    if (createPost !== false) {
      const post = {
        profileId: auth.profileId,
        trackId,
        body: `🎵 New track: ${title}`,
        deleted: false,
        commentCount: 0,
        repostCount: 0,
        totalReactions: 0,
        createdAt: now,
        updatedAt: now,
      }
      const postResult = await db.collection('posts').insertOne(post)

      // Fan-out to author's feed
      await db.collection('feeditems').insertOne({
        profileId: auth.profileId,
        postId: postResult.insertedId,
        postedAt: now,
      })

      // Fan-out to followers
      const followers = await db.collection('follows')
        .find({ followingProfileId: auth.profileId })
        .project({ followerProfileId: 1 })
        .toArray()

      if (followers.length > 0) {
        const feedItems = followers.map(f => ({
          profileId: f.followerProfileId,
          postId: postResult.insertedId,
          postedAt: now,
        }))
        await db.collection('feeditems').insertMany(feedItems)
      }
    }

    // Bust the OGUN Radio playlist cache so this newly-uploaded track lands in
    // rotation immediately instead of waiting up to REFRESH_INTERVAL_MS (5 min).
    // Fire-and-forget — we don't want the upload response blocked on this.
    const baseUrl = process.env.NEXT_PUBLIC_URL || `https://${req.headers.host}`
    fetch(`${baseUrl}/api/agent/radio?action=invalidate`, { method: 'POST' }).catch(() => {})

    return res.status(200).json({
      track: { ...track, id: trackId.toString(), _id: undefined },
      scid: { ...scid, id: scidCode },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
