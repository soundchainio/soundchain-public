/**
 * GET /api/me — Vercel-direct replacement for useMeQuery (Apollo → Lambda)
 *
 * Returns the full user + profile shape that useMe() / useMeQuery expects.
 * JWT auth from cookie or Bearer header.
 * This is the #1 most-called Apollo query — every page load hits it.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

const JWT_SECRET = process.env.JWT_SECRET || ''

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  // Extract JWT
  let token = ''
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7)
  else if (req.cookies?.token) token = req.cookies.token
  if (!token) return res.status(200).json({ me: null })

  let userId: string
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    userId = decoded.sub
    if (!userId) return res.status(200).json({ me: null })
  } catch {
    return res.status(200).json({ me: null })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Fetch user first, then profile via user.profileId. Users reference
    // profiles, not the reverse — there is no `userId` field on profiles.
    // (Earlier version looked up `profiles.userId` and got null for every
    // user; that broke top-nav avatar render + norman gate render.)
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
    if (!user) return res.status(200).json({ me: null })

    let profile = user.profileId
      ? await db.collection('profiles').findOne({ _id: new ObjectId(user.profileId) })
      : null

    // Half-baked signup backfill: some users (Magic-bypass registration path
    // pre-May 17 hotfix) ended up with a `users` doc but no `profiles` doc,
    // which hid the composer on /nodes + broke wall renders. Create a
    // minimal profile on first /api/me hit so the rest of the app behaves
    // as if registration completed cleanly.
    if (!profile) {
      const now = new Date()
      const newProfile = {
        userHandle: user.handle || '',
        displayName: user.displayName || user.handle || '',
        profilePicture: null,
        coverPicture: null,
        socialMedias: {},
        favoriteGenres: [],
        musicianTypes: [],
        bio: '',
        followerCount: 0,
        followingCount: 0,
        tracksCount: 0,
        createdAt: now,
        updatedAt: now,
      }
      const ins = await db.collection('profiles').insertOne(newProfile as any)
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { profileId: ins.insertedId, updatedAt: now } },
      )
      profile = { _id: ins.insertedId, ...newProfile } as any
    }

    const me = {
      id: user._id.toString(),
      handle: user.handle || '',
      email: user.email || '',
      magicWalletAddress: user.magicWalletAddress || null,
      googleWalletAddress: user.googleWalletAddress || null,
      discordWalletAddress: user.discordWalletAddress || null,
      twitchWalletAddress: user.twitchWalletAddress || null,
      emailWalletAddress: user.emailWalletAddress || null,
      metaMaskWalletAddressees: user.metaMaskWalletAddressees || null,
      defaultWallet: user.defaultWallet || null,
      authMethod: user.authMethod || null,
      isApprovedOnMarketplace: user.isApprovedOnMarketplace || false,
      roles: user.roles || [],
      phoneNumber: user.phoneNumber || null,
      notifyOnFollow: user.notifyOnFollow ?? true,
      notifyOnLike: user.notifyOnLike ?? true,
      notifyOnComment: user.notifyOnComment ?? true,
      notifyOnSale: user.notifyOnSale ?? true,
      notifyOnTip: user.notifyOnTip ?? true,
      notifyOnDM: user.notifyOnDM ?? true,
      nostrPubkey: user.nostrPubkey || null,
      notifyViaNostr: user.notifyViaNostr || false,
      hdWalletAddress: user.hdWalletAddress || null,
      hdWalletCreatedAt: user.hdWalletCreatedAt || null,
      primaryWallet: user.primaryWallet || null,
      migrationStatus: user.migrationStatus || null,
      solanaAddress: user.solanaAddress || null,
      profile: profile ? {
        id: profile._id.toString(),
        displayName: profile.displayName || '',
        profilePicture: profile.profilePicture || null,
        coverPicture: profile.coverPicture || null,
        socialMedias: profile.socialMedias || {},
        favoriteGenres: profile.favoriteGenres || [],
        musicianTypes: profile.musicianTypes || [],
        bio: profile.bio || '',
        followerCount: profile.followerCount || 0,
        followingCount: profile.followingCount || 0,
        tracksCount: profile.tracksCount || 0,
        userHandle: profile.userHandle || user.handle || '',
        isFollowed: false, // self — not followed by self
        isSubscriber: false,
        unreadNotificationCount: profile.unreadNotificationCount || 0,
        unreadMessageCount: profile.unreadMessageCount || 0,
        verified: profile.verified || false,
        teamMember: profile.teamMember || false,
        magicWalletAddress: profile.magicWalletAddress || user.magicWalletAddress || null,
        badges: profile.badges || [],
        topFriends: profile.topFriends || [],
        profileViewCount: profile.profileViewCount || 0,
        featuredTrackId: profile.featuredTrackId || '',
        featuredAudioUrl: profile.featuredAudioUrl || '',
        featuredAudioTitle: profile.featuredAudioTitle || '',
        featuredAudioArtist: profile.featuredAudioArtist || '',
        featuredAudioCoverUrl: profile.featuredAudioCoverUrl || '',
        wallAudioPlaylist: (profile.wallAudioPlaylist || []).map((t: any) => ({
          audioUrl: t.audioUrl || '',
          title: t.title || '',
          artist: t.artist || '',
          coverUrl: t.coverUrl || '',
          wallPostId: t.wallPostId || '',
        })),
        createdAt: profile.createdAt || null,
        updatedAt: profile.updatedAt || null,
      } : null,
    }

    res.setHeader('Cache-Control', 'private, no-cache')
    return res.status(200).json({ me })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
