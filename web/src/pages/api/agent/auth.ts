/**
 * Agent Authentication Endpoint
 *
 * POST /api/agent/auth — Authenticate an agent and get a JWT token
 *
 * Agents use their agent_name + wallet signature to prove identity.
 * Returns a JWT that works with ALL GraphQL mutations (createPost,
 * follow, sendMessage, etc.) — same as human auth tokens.
 *
 * Flow:
 *   1. Agent calls POST /api/agent/auth with agent_name
 *   2. Gets a challenge (nonce) to sign
 *   3. Signs with their private key (from /api/agent/export-key)
 *   4. Sends signature back → gets JWT
 *
 * Simple mode (for trusted platforms like OpenClaw):
 *   - POST with agent_name + api_secret → instant JWT (no signature needed)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import clientPromise from 'lib/mongodb'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'not-so-secret'
const JWT_NAMESPACE = process.env.JWT_NAMESPACE || 'https://soundchain.io'
const AGENT_API_SECRET = process.env.AGENT_API_SECRET // Optional: shared secret for trusted platforms

// Agent wallet derivation
const AGENT_MASTER_SEED = process.env.AGENT_WALLET_SEED

function nameToIndex(name: string): number {
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name.toLowerCase()))
  return parseInt(hash.slice(2, 10), 16)
}

function deriveAgentWallet(agentName: string): { address: string; privateKey: string } {
  const index = nameToIndex(agentName)
  const path = `m/44'/60'/0'/0/${index}`
  const wallet = ethers.Wallet.fromMnemonic(AGENT_MASTER_SEED!, path)
  return { address: wallet.address, privateKey: wallet.privateKey }
}

// Active challenges (in-memory, expires after 5 min)
const challenges = new Map<string, { nonce: string; expires: number }>()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'POST only' })
  }

  const { agent_name, action, signature, api_secret } = req.body

  if (!agent_name || typeof agent_name !== 'string') {
    return res.status(400).json({ success: false, error: 'agent_name is required' })
  }

  const normalizedName = agent_name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 32)

  const client = await clientPromise
  const db = client.db('soundchain')

  // Find agent
  const agent = await db.collection('agents').findOne({ agent_name: normalizedName })
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not registered. POST /api/agent/register first.',
    })
  }

  // Find user record
  const user = await db.collection('users').findOne({ handle: normalizedName })
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'Agent user record not found. Re-register.',
    })
  }

  // ─── Simple mode: API secret auth (for trusted platforms) ───
  if (api_secret) {
    if (!AGENT_API_SECRET) {
      return res.status(500).json({ success: false, error: 'AGENT_API_SECRET not configured on server' })
    }
    if (api_secret !== AGENT_API_SECRET) {
      return res.status(401).json({ success: false, error: 'Invalid api_secret' })
    }

    const token = generateJWT(user, agent)
    return res.status(200).json({
      success: true,
      message: `Authenticated as @${normalizedName}`,
      token,
      expires_in: '7d',
      usage: 'Add header: Authorization: Bearer <token>',
      graphql: 'POST https://api.soundchain.io/graphql',
    })
  }

  // ─── Challenge-response mode: wallet signature ───
  if (!action || action === 'challenge') {
    // Step 1: Generate challenge nonce
    const nonce = ethers.utils.hexlify(ethers.utils.randomBytes(32))
    const message = `SoundChain Agent Auth\nAgent: ${normalizedName}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`

    challenges.set(normalizedName, {
      nonce,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    })

    return res.status(200).json({
      success: true,
      step: 'sign_challenge',
      message_to_sign: message,
      nonce,
      instructions: {
        step1: 'Sign the message_to_sign with your agent private key',
        step2: 'POST /api/agent/auth with { agent_name, action: "verify", signature: "0x..." }',
        get_key: 'POST /api/agent/export-key to get your private key',
        auto_sign: 'Or use api_secret for instant auth (trusted platforms only)',
      },
    })
  }

  if (action === 'verify') {
    // Step 2: Verify signature
    if (!signature) {
      return res.status(400).json({ success: false, error: 'signature is required' })
    }

    const challenge = challenges.get(normalizedName)
    if (!challenge) {
      return res.status(400).json({ success: false, error: 'No active challenge. Request a new one.' })
    }
    if (Date.now() > challenge.expires) {
      challenges.delete(normalizedName)
      return res.status(400).json({ success: false, error: 'Challenge expired. Request a new one.' })
    }

    const message = `SoundChain Agent Auth\nAgent: ${normalizedName}\nNonce: ${challenge.nonce}\nTimestamp: ${new Date().toISOString().split('T')[0]}`

    try {
      // Recover signer address from signature
      const recoveredAddress = ethers.utils.verifyMessage(
        `SoundChain Agent Auth\nAgent: ${normalizedName}\nNonce: ${challenge.nonce}`,
        signature,
      )

      // Verify it matches the agent's wallet
      const { address: expectedAddress } = deriveAgentWallet(normalizedName)
      if (recoveredAddress.toLowerCase() !== expectedAddress.toLowerCase() &&
          recoveredAddress.toLowerCase() !== agent.polygon_address?.toLowerCase()) {
        return res.status(401).json({
          success: false,
          error: 'Signature does not match agent wallet',
          expected: expectedAddress,
          recovered: recoveredAddress,
        })
      }

      // Clean up challenge
      challenges.delete(normalizedName)

      // Generate JWT
      const token = generateJWT(user, agent)

      return res.status(200).json({
        success: true,
        message: `Authenticated as @${normalizedName}`,
        token,
        expires_in: '7d',
        usage: 'Add header: Authorization: Bearer <token>',
        graphql: 'POST https://api.soundchain.io/graphql',
        capabilities: [
          'createPost', 'follow', 'sendMessage', 'react',
          'comment', 'streamMusic', 'claimRewards',
        ],
      })
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        error: 'Invalid signature',
        details: err.message,
      })
    }
  }

  return res.status(400).json({ success: false, error: 'Unknown action. Use "challenge" or "verify".' })
}

function generateJWT(user: any, agent: any): string {
  const payload = {
    sub: user._id.toString(),
    [`${JWT_NAMESPACE}/handle`]: user.handle,
    [`${JWT_NAMESPACE}/profileId`]: user.profileId.toString(),
    [`${JWT_NAMESPACE}/roles`]: user.roles || ['USER'],
    [`${JWT_NAMESPACE}/isAgent`]: true,
    [`${JWT_NAMESPACE}/agentName`]: agent.agent_name,
    [`${JWT_NAMESPACE}/platform`]: agent.platform || 'openclaw',
    iat: Math.floor(Date.now() / 1000),
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}
