/**
 * GET /api/profiles/wallet?profileId=xxx
 *
 * Resolves a profile's primary on-chain wallet address.
 * Used by tip flow to know who to send OGUN to.
 *
 * Resolution order matches useMagicContext.getUserWalletAddress():
 *   hdWalletAddress → magicWalletAddress → googleWalletAddress
 *   → discordWalletAddress → twitchWalletAddress → emailWalletAddress
 *
 * Returns: { walletAddress: string | null }
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60')

  const profileId = (req.query.profileId as string) || ''
  if (!profileId) return res.status(400).json({ error: 'profileId required' })

  let profileOid: ObjectId
  try { profileOid = new ObjectId(profileId) } catch { return res.status(400).json({ error: 'Invalid profileId' }) }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Profile → User → wallet. Profile has userId; User has wallet fields.
    const profile = await db.collection('profiles').findOne(
      { _id: profileOid },
      { projection: { userId: 1 } }
    )
    if (!profile?.userId) return res.status(404).json({ error: 'Profile not found' })

    const user = await db.collection('users').findOne(
      { _id: profile.userId },
      { projection: {
        hdWalletAddress: 1,
        magicWalletAddress: 1,
        googleWalletAddress: 1,
        discordWalletAddress: 1,
        twitchWalletAddress: 1,
        emailWalletAddress: 1,
      } }
    )
    if (!user) return res.status(404).json({ error: 'User not found' })

    const walletAddress =
      user.hdWalletAddress ||
      user.magicWalletAddress ||
      user.googleWalletAddress ||
      user.discordWalletAddress ||
      user.twitchWalletAddress ||
      user.emailWalletAddress ||
      null

    return res.status(200).json({ walletAddress })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
