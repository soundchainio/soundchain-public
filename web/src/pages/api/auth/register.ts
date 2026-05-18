/**
 * POST /api/auth/register
 *
 * Vercel direct → Atlas registration. Bypasses Lambda entirely (Phase 6 pattern).
 * Account creation was 504-ing because the GraphQL register mutation hits
 * api.soundchain.io which is currently flaky (custom-domain → API Gateway hop).
 *
 * Mirrors api/src/services/AuthService.ts `register()` logic but writes
 * directly to Mongo. Returns the same shape the Apollo `useRegisterMutation`
 * consumer expects: { data: { register: { jwt } } }.
 *
 * Trust model: the frontend has already proven Magic auth (`magic.user.isLoggedIn()`
 * gate before submit), so we accept the email + publicAddress it pulled from
 * `magic.user.getInfo()`. The login route uses the same pattern.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { ObjectId } from 'mongodb'
import clientPromise from 'lib/mongodb'

const JWT_SECRET = process.env.JWT_SECRET || ''
const JWT_NAMESPACE = process.env.JWT_NAMESPACE || 'https://soundchain.io/graphql'
const HUMAN_WALLET_SEED = process.env.HUMAN_WALLET_SEED || ''

const HANDLE_REGEX = /^[A-Za-z0-9]+$/
const HANDLE_MAX = 24

const PROFILE_PICS = [
  '/default-pictures/profile/red.png',
  '/default-pictures/profile/orange.png',
  '/default-pictures/profile/yellow.png',
  '/default-pictures/profile/green.png',
  '/default-pictures/profile/teal.png',
  '/default-pictures/profile/blue.png',
  '/default-pictures/profile/purple.png',
  '/default-pictures/profile/pink.png',
]
const COVER_PICS = [
  '/default-pictures/cover/birds.jpeg',
  '/default-pictures/cover/cells.jpeg',
  '/default-pictures/cover/fog.jpeg',
  '/default-pictures/cover/net.jpeg',
  '/default-pictures/cover/rings.jpeg',
  '/default-pictures/cover/waves.jpeg',
]
const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

function deriveHd(profileId: string): { address: string; privateKey: string } | null {
  if (!HUMAN_WALLET_SEED) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ethers } = require('ethers')
    const hash = crypto.createHash('sha256').update(profileId.toLowerCase()).digest('hex')
    const index = parseInt(hash.slice(0, 8), 16)
    const path = `m/44'/60'/1'/0/${index}`
    const w = ethers.Wallet.fromMnemonic(HUMAN_WALLET_SEED, path)
    return { address: w.address, privateKey: w.privateKey }
  } catch (e) {
    console.warn('[register] HD wallet derivation failed:', (e as Error).message)
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { handle, displayName, email, magicWalletAddress, oauthProvider } = req.body || {}

  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'email required' })
  if (!handle || typeof handle !== 'string') return res.status(400).json({ error: 'handle required' })
  if (!displayName || typeof displayName !== 'string') return res.status(400).json({ error: 'displayName required' })
  if (handle.length < 2 || handle.length > HANDLE_MAX || !HANDLE_REGEX.test(handle)) {
    return res.status(400).json({ error: 'Invalid characters. Only letters and numbers are accepted.' })
  }
  if (displayName.length < 3 || displayName.length > 255) {
    return res.status(400).json({ error: 'Name must be between 3 and 255 characters' })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const normalizedHandle = handle.trim()

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const existingByEmail = await db.collection('users').findOne(
      { email: normalizedEmail },
      { projection: { _id: 1 } },
    )
    if (existingByEmail) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' })
    }
    const existingByHandle = await db.collection('users').findOne(
      { handle: { $regex: new RegExp(`^${normalizedHandle}$`, 'i') } },
      { projection: { _id: 1 } },
    )
    if (existingByHandle) {
      return res.status(409).json({ error: 'That username is already taken. Please choose another.' })
    }

    // Profile — fill all `required: true` defaults from api/src/models/Profile.ts
    const now = new Date()
    const profileId = new ObjectId()
    await db.collection('profiles').insertOne({
      _id: profileId,
      displayName,
      profilePicture: pickRandom(PROFILE_PICS),
      coverPicture: pickRandom(COVER_PICS),
      socialMedias: {},
      favoriteGenres: [],
      musicianTypes: [],
      followerCount: 0,
      followingCount: 0,
      unreadNotificationCount: 0,
      unreadMessageCount: 0,
      verified: false,
      badges: [],
      wallAudioPlaylist: [],
      topFriends: [],
      createdAt: now,
      updatedAt: now,
    })

    // Wallet fields — HD wallet first (free, multi-chain), Magic fallback
    const hd = deriveHd(profileId.toString())
    const walletFields: Record<string, any> = {}
    if (hd) {
      walletFields.hdWalletAddress = hd.address
      walletFields.hdWalletCreatedAt = now
      walletFields.primaryWallet = 'HD'
      walletFields.migrationStatus = 'NONE'
    } else if (magicWalletAddress && typeof magicWalletAddress === 'string') {
      walletFields.magicWalletAddress = magicWalletAddress
      switch (oauthProvider) {
        case 'google': walletFields.googleWalletAddress = magicWalletAddress; break
        case 'discord': walletFields.discordWalletAddress = magicWalletAddress; break
        case 'twitch': walletFields.twitchWalletAddress = magicWalletAddress; break
        default: walletFields.emailWalletAddress = magicWalletAddress; break
      }
    }

    // Nostr keypair — best-effort, non-blocking shape
    const nostrPriv = crypto.randomBytes(32)
    const nostrPub = crypto.createHash('sha256').update(nostrPriv).digest('hex')

    const userId = new ObjectId()
    await db.collection('users').insertOne({
      _id: userId,
      email: normalizedEmail,
      handle: normalizedHandle,
      profileId,
      emailVerificationToken: crypto.randomBytes(16).toString('hex'),
      authMethod: oauthProvider || 'magicLink',
      roles: [],
      nostrPubkey: nostrPub,
      nostrPrivateKey: nostrPriv.toString('hex'),
      notifyViaNostr: true,
      isApprovedOnMarketplace: false,
      createdAt: now,
      updatedAt: now,
      ...walletFields,
    })

    // Seed feed with latest posts (best-effort — registration succeeds either way)
    try {
      const recentPosts = await db.collection('posts')
        .find({}, { projection: { _id: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()
      if (recentPosts.length > 0) {
        await db.collection('feeditems').insertMany(
          recentPosts.map(p => ({ profileId, postId: p._id, postedAt: p.createdAt || now })),
        )
      }
    } catch (seedErr) {
      console.warn('[register] feed seed failed (non-fatal):', (seedErr as Error).message)
    }

    // JWT — same shape as JwtService.create() so Lambda accepts it too
    const token = jwt.sign(
      { [JWT_NAMESPACE]: { roles: [] } },
      JWT_SECRET,
      { algorithm: 'HS256', subject: userId.toString(), expiresIn: '30d' },
    )

    // Set cookie at HTTP layer so it survives the post-register redirect
    // deterministically. Client-side js-cookie writes drop on Safari/Chrome iOS
    // when followed by window.location navigation.
    // Non-httpOnly so Apollo's authLink can read it for cross-origin /graphql.
    const isProd = process.env.NODE_ENV === 'production'
    const cookieParts = [
      `token=${token}`,
      'Path=/',
      `Max-Age=${30 * 24 * 60 * 60}`,
      'SameSite=Lax',
    ]
    if (isProd) cookieParts.push('Secure')
    res.setHeader('Set-Cookie', cookieParts.join('; '))

    return res.status(200).json({
      data: { register: { jwt: token } },
    })
  } catch (err: any) {
    console.error('[register] error:', err)
    return res.status(500).json({ error: err?.message || 'Registration failed' })
  }
}
