/**
 * Agent NFT Purchase Endpoint
 *
 * POST /api/agent/buy - Purchase NFT using agent's HD wallet
 *
 * Agents can buy music NFTs using their earned OGUN or POL
 * Transaction signed server-side with agent's derived wallet
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import clientPromise from 'lib/mongodb'

// Contract addresses (Polygon Mainnet)
const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_MULTIPLE_EDITION_ADDRESS || '0xD772ccf784Df67E14186AA6E512c1A1bd32F394f'
const OGUN_ADDRESS = process.env.NEXT_PUBLIC_OGUN_ADRESS || '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c'
const NFT_ADDRESS = process.env.NEXT_PUBLIC_NFT_MULTIPLE_EDITION_ADDRESS || '0xF0287926D495719b239340Fc31d268b76bAD8B42'

// Polygon RPC
const POLYGON_RPC = process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-bor-rpc.publicnode.com'

// Agent wallet derivation (MUST be set in env)
const AGENT_MASTER_SEED = process.env.AGENT_WALLET_SEED
if (!AGENT_MASTER_SEED) console.error('[CRITICAL] AGENT_WALLET_SEED not configured — agent wallet operations will fail')

function nameToIndex(name: string): number {
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name.toLowerCase()))
  return parseInt(hash.slice(2, 10), 16)
}

function deriveAgentWallet(agentName: string): ethers.Wallet {
  const index = nameToIndex(agentName)
  const path = `m/44'/60'/0'/0/${index}`
  const wallet = ethers.Wallet.fromMnemonic(AGENT_MASTER_SEED, path)
  return wallet
}

// Minimal ABIs for contract interaction
const OGUN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
]

const MARKETPLACE_ABI = [
  'function buyItem(address nftContract, uint256 tokenId, address seller, bool isOGUN) payable',
  'function listings(address nftContract, uint256 tokenId) view returns (address seller, uint256 price, bool isOGUN)'
]

// GraphQL to get listing details
const GRAPHQL_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.soundchain.io/graphql'

const LISTING_QUERY = `
  query GetListing($id: ID!) {
    track(id: $id) {
      id
      title
      artist
      price {
        value
        currency
      }
      trackEditionId
      profileId
    }
  }
`

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `buy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST to purchase.',
      meta: { request_id: requestId }
    })
  }

  try {
    const { api_key, listing_id, payment_token = 'OGUN' } = req.body

    // Validate inputs
    if (!api_key) {
      return res.status(400).json({
        success: false,
        error: 'api_key is required. Register at POST /api/agent/register to get one.',
        meta: { request_id: requestId }
      })
    }

    if (!listing_id) {
      return res.status(400).json({
        success: false,
        error: 'listing_id is required. Browse listings at GET /api/agent/marketplace',
        meta: { request_id: requestId }
      })
    }

    // Extract agent name from api_key (format: sc_agentname or just agentname)
    const agentName = api_key.replace(/^sc_/, '').toLowerCase()

    // Connect to MongoDB and verify agent exists
    const client = await clientPromise
    const db = client.db('soundchain')
    const agentsCollection = db.collection('agents')

    const agent = await agentsCollection.findOne({ agent_name: agentName })

    if (!agent) {
      return res.status(401).json({
        success: false,
        error: 'Invalid api_key. Agent not found.',
        register_url: 'POST /api/agent/register',
        meta: { request_id: requestId }
      })
    }

    // Get agent's wallet
    const agentWallet = deriveAgentWallet(agentName)
    const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC)
    const signer = agentWallet.connect(provider)

    // Check agent's balances
    const polBalance = await provider.getBalance(agentWallet.address)
    const ogunContract = new ethers.Contract(OGUN_ADDRESS, OGUN_ABI, provider)
    const ogunBalance = await ogunContract.balanceOf(agentWallet.address)

    const polBalanceFormatted = ethers.utils.formatEther(polBalance)
    const ogunBalanceFormatted = ethers.utils.formatEther(ogunBalance)

    // Check if agent has enough for gas
    const minGasRequired = ethers.utils.parseEther('0.01') // ~0.01 POL for gas
    if (polBalance.lt(minGasRequired)) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient POL for gas fees',
        agent_wallet: agentWallet.address,
        current_balance: {
          pol: polBalanceFormatted,
          ogun: ogunBalanceFormatted
        },
        required: {
          min_pol_for_gas: '0.01 POL'
        },
        how_to_fund: {
          method: 'Send POL to your agent wallet for gas',
          wallet_address: agentWallet.address,
          tip: 'Earn OGUN by streaming music, then swap some for POL at a DEX'
        },
        meta: { request_id: requestId }
      })
    }

    // Fetch listing details from GraphQL
    const listingResponse = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: LISTING_QUERY,
        variables: { id: listing_id }
      })
    })

    const listingData = await listingResponse.json()

    if (listingData.errors || !listingData.data?.track) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
        listing_id,
        browse_url: 'GET /api/agent/marketplace',
        meta: { request_id: requestId }
      })
    }

    const listing = listingData.data.track
    const priceValue = listing.price?.value || '0'
    const priceCurrency = listing.price?.currency || 'MATIC'
    const priceWei = ethers.utils.parseEther(priceValue)

    // Check if agent has enough balance for the purchase
    const isPayingOgun = payment_token.toUpperCase() === 'OGUN'

    if (isPayingOgun) {
      if (ogunBalance.lt(priceWei)) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient OGUN balance',
          listing: {
            title: listing.title,
            artist: listing.artist,
            price: `${priceValue} ${priceCurrency}`
          },
          your_balance: {
            ogun: ogunBalanceFormatted,
            pol: polBalanceFormatted
          },
          required: priceValue,
          how_to_earn: {
            method: 'Stream music to earn OGUN',
            endpoint: 'POST /api/agent/play',
            rate: '0.5 OGUN per stream'
          },
          meta: { request_id: requestId }
        })
      }
    } else {
      if (polBalance.lt(priceWei.add(minGasRequired))) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient POL balance',
          listing: {
            title: listing.title,
            artist: listing.artist,
            price: `${priceValue} ${priceCurrency}`
          },
          your_balance: {
            pol: polBalanceFormatted,
            ogun: ogunBalanceFormatted
          },
          required: `${priceValue} POL + gas`,
          meta: { request_id: requestId }
        })
      }
    }

    // Execute the purchase
    console.log(`[Agent Buy] ${agentName} purchasing ${listing.title} for ${priceValue} ${payment_token}`)

    const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer)

    // If paying with OGUN, need to approve first
    if (isPayingOgun) {
      const ogunContractWithSigner = new ethers.Contract(OGUN_ADDRESS, OGUN_ABI, signer)

      // Check current allowance
      const currentAllowance = await ogunContractWithSigner.allowance(agentWallet.address, MARKETPLACE_ADDRESS)

      if (currentAllowance.lt(priceWei)) {
        console.log(`[Agent Buy] Approving OGUN spend...`)
        const approveTx = await ogunContractWithSigner.approve(MARKETPLACE_ADDRESS, priceWei)
        await approveTx.wait()
        console.log(`[Agent Buy] OGUN approved: ${approveTx.hash}`)
      }
    }

    // Execute buy
    const tokenId = parseInt(listing.trackEditionId) || parseInt(listing_id)

    // Note: This is a simplified buy - actual implementation may need to fetch seller from contract
    const buyTx = await marketplaceContract.buyItem(
      NFT_ADDRESS,
      tokenId,
      listing.profileId, // seller address placeholder
      isPayingOgun,
      { value: isPayingOgun ? 0 : priceWei }
    )

    console.log(`[Agent Buy] Transaction submitted: ${buyTx.hash}`)
    const receipt = await buyTx.wait()
    console.log(`[Agent Buy] Transaction confirmed in block ${receipt.blockNumber}`)

    // Update agent's purchase history in DB
    await agentsCollection.updateOne(
      { agent_name: agentName },
      {
        $push: {
          purchases: {
            listing_id,
            title: listing.title,
            artist: listing.artist,
            price: priceValue,
            payment_token,
            tx_hash: buyTx.hash,
            purchased_at: new Date()
          }
        },
        $inc: { total_purchases: 1 }
      }
    )

    return res.status(200).json({
      success: true,
      message: `Congratulations! ${agentName} now owns "${listing.title}" by ${listing.artist}`,
      purchase: {
        listing_id,
        title: listing.title,
        artist: listing.artist,
        price: `${priceValue} ${payment_token}`,
        tx_hash: buyTx.hash,
        block_number: receipt.blockNumber
      },
      agent: {
        name: agentName,
        wallet: agentWallet.address
      },
      view_on_polygonscan: `https://polygonscan.com/tx/${buyTx.hash}`,
      view_nft: `https://soundchain.io/dex/track/${listing_id}`,
      next_steps: {
        view_collection: 'GET /api/agent/collection - See your NFTs',
        keep_earning: 'POST /api/agent/play - Stream more to earn OGUN'
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('[Agent Buy] Error:', error)

    // Handle specific errors
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({
        success: false,
        error: 'Insufficient funds for transaction',
        details: error.message,
        meta: { request_id: requestId }
      })
    }

    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      return res.status(400).json({
        success: false,
        error: 'Transaction would fail - listing may no longer be available',
        details: error.message,
        meta: { request_id: requestId }
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Purchase failed',
      details: error.message,
      meta: { request_id: requestId }
    })
  }
}
