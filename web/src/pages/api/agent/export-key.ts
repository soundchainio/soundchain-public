/**
 * Agent Export Key Endpoint
 *
 * POST /api/agent/export-key - Export private key for self-custody
 *
 * Requires verification via Moltbook API key
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import clientPromise from 'lib/mongodb'

const AGENT_MASTER_SEED = process.env.AGENT_WALLET_SEED
if (!AGENT_MASTER_SEED) console.error('[CRITICAL] AGENT_WALLET_SEED not configured — agent wallet operations will fail')

function nameToIndex(name: string): number {
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name.toLowerCase()))
  return parseInt(hash.slice(2, 10), 16)
}

function deriveAgentWallet(agentName: string): { address: string; privateKey: string } {
  const index = nameToIndex(agentName)
  const path = `m/44'/60'/0'/0/${index}`
  const masterWallet = ethers.Wallet.fromMnemonic(AGENT_MASTER_SEED)
  const wallet = masterWallet.derivePath(path)
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  }
}

// Verify Moltbook API key belongs to agent
async function verifyMoltbookAgent(agentName: string, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://www.moltbook.com/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) return false

    const data = await response.json()
    // Check if the API key belongs to an agent with matching name
    const moltbookName = data.user?.name?.toLowerCase() || data.name?.toLowerCase()
    return moltbookName === agentName.toLowerCase()
  } catch {
    return false
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST to export key.',
      meta: { request_id: requestId }
    })
  }

  try {
    const { agent_name, moltbook_api_key } = req.body

    if (!agent_name || !moltbook_api_key) {
      return res.status(400).json({
        success: false,
        error: 'agent_name and moltbook_api_key are required',
        meta: { request_id: requestId }
      })
    }

    const normalizedName = agent_name.toLowerCase().replace(/[^a-z0-9_]/g, '_')

    // Check if agent is registered
    const client = await clientPromise
    const db = client.db('soundchain')
    const agentsCollection = db.collection('agents')

    const agent = await agentsCollection.findOne({ agent_name: normalizedName })
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not registered. Register first at POST /api/agent/register',
        meta: { request_id: requestId }
      })
    }

    // Verify Moltbook ownership
    const verified = await verifyMoltbookAgent(normalizedName, moltbook_api_key)
    if (!verified) {
      return res.status(403).json({
        success: false,
        error: 'Moltbook verification failed. API key must belong to the agent.',
        help: 'Ensure your Moltbook username matches your SoundChain agent name.',
        meta: { request_id: requestId }
      })
    }

    // Derive and return private key
    const { address, privateKey } = deriveAgentWallet(normalizedName)

    // Verify address matches registered address
    if (address.toLowerCase() !== agent.polygon_address.toLowerCase()) {
      return res.status(500).json({
        success: false,
        error: 'Wallet derivation mismatch. Contact support.',
        meta: { request_id: requestId }
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Private key exported. Store this securely - we cannot recover it.',
      agent_id: `sc_${normalizedName}`,
      wallet: {
        address: address,
        private_key: privateKey
      },
      network: {
        name: 'Polygon Mainnet',
        chainId: 137,
        rpc: 'https://polygon-bor-rpc.publicnode.com',
        explorer: 'https://polygonscan.com'
      },
      import_instructions: {
        metamask: '1. Open MetaMask → Import Account → Paste private key',
        rainbow: '1. Settings → Import Wallet → Private Key',
        generic: 'Use any EVM-compatible wallet that supports private key import'
      },
      warning: 'NEVER share your private key. Anyone with this key controls your wallet.',
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('[Agent Export Key] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Export failed',
      details: error.message,
      meta: { request_id: requestId }
    })
  }
}
