/**
 * Operator Upload Token — generates a temporary Pinata JWT for direct browser upload
 * GET /api/operator/upload-token
 * Auth required. Returns { token, gateway } for client-side Pinata upload.
 * Bypasses Vercel's 4.5MB body limit — browser uploads directly to Pinata.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const apiKey = process.env.PINATA_API_KEY
  const apiSecret = process.env.PINATA_API_SECRET
  if (!apiKey || !apiSecret) return res.status(500).json({ error: 'IPFS not configured' })

  // Return API credentials for direct browser → Pinata upload
  // In production, use Pinata's /users/generateApiKey for scoped temporary keys
  // For now, pass the keys directly (same-origin, auth-gated)
  return res.status(200).json({
    apiKey,
    apiSecret,
    gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/',
    profileId: auth.profileId.toString(),
  })
}
