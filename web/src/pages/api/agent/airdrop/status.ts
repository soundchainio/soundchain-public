/**
 * Airdrop Status Endpoint
 *
 * GET /api/agent/airdrop/status - Check overall airdrop status
 * GET /api/agent/airdrop/status?agent=name - Check specific agent status
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

const WHITELIST_1_MAX = 10000
const WHITELIST_2_MAX = 5000
const TIER_1_AMOUNT = 5  // OGUN per agent
const TIER_2_AMOUNT = 5  // Additional OGUN for SCID minters
const TOTAL_BUDGET = 75000  // Total OGUN allocated

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `airdrop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.',
      meta: { request_id: requestId }
    })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const agentsCollection = db.collection('agents')

    const { agent } = req.query

    // Get overall stats
    const totalRegistered = await agentsCollection.countDocuments()
    const whitelist1Count = await agentsCollection.countDocuments({ whitelist_1: true })
    const whitelist2Count = await agentsCollection.countDocuments({ whitelist_2: true })
    const tier1Claimed = await agentsCollection.countDocuments({ airdrop_1_claimed: true })
    const tier2Claimed = await agentsCollection.countDocuments({ airdrop_2_claimed: true })

    // Calculate allocations
    const tier1Allocated = whitelist1Count * TIER_1_AMOUNT
    const tier2Allocated = whitelist2Count * TIER_2_AMOUNT
    const totalAllocated = tier1Allocated + tier2Allocated
    const tier1Distributed = tier1Claimed * TIER_1_AMOUNT
    const tier2Distributed = tier2Claimed * TIER_2_AMOUNT

    // Check specific agent if requested
    let agentStatus = null
    if (agent) {
      const normalizedName = (agent as string).toLowerCase().replace(/[^a-z0-9_]/g, '_')
      const agentDoc = await agentsCollection.findOne({ agent_name: normalizedName })

      if (agentDoc) {
        agentStatus = {
          agent_id: `sc_${agentDoc.agent_name}`,
          polygon_address: agentDoc.polygon_address,
          registered_at: agentDoc.registered_at,
          tier_1: {
            eligible: agentDoc.whitelist_1,
            position: agentDoc.whitelist_1_position,
            amount: agentDoc.whitelist_1 ? `${TIER_1_AMOUNT} OGUN` : '0 OGUN',
            claimed: agentDoc.airdrop_1_claimed,
            status: agentDoc.airdrop_1_claimed
              ? 'CLAIMED'
              : agentDoc.whitelist_1
                ? 'PENDING - Await snapshot'
                : 'NOT ELIGIBLE'
          },
          tier_2: {
            eligible: agentDoc.whitelist_2,
            scids_minted: agentDoc.scids_minted?.length || 0,
            amount: agentDoc.whitelist_2 ? `${TIER_2_AMOUNT} OGUN` : '0 OGUN',
            claimed: agentDoc.airdrop_2_claimed,
            status: agentDoc.airdrop_2_claimed
              ? 'CLAIMED'
              : agentDoc.whitelist_2
                ? 'PENDING - Await snapshot'
                : 'NOT ELIGIBLE - Mint SCID to qualify',
            how_to_qualify: agentDoc.whitelist_2
              ? null
              : 'Upload music at soundchain.io/upload to mint your SCID'
          },
          total_eligible: `${(agentDoc.whitelist_1 ? TIER_1_AMOUNT : 0) + (agentDoc.whitelist_2 ? TIER_2_AMOUNT : 0)} OGUN`
        }
      } else {
        agentStatus = {
          error: 'Agent not found',
          action: 'Register at POST /api/agent/register'
        }
      }
    }

    return res.status(200).json({
      success: true,
      airdrop_overview: {
        total_budget: `${TOTAL_BUDGET.toLocaleString()} OGUN`,
        allocated: `${totalAllocated.toLocaleString()} OGUN`,
        distributed: `${(tier1Distributed + tier2Distributed).toLocaleString()} OGUN`,
        remaining: `${(TOTAL_BUDGET - totalAllocated).toLocaleString()} OGUN`
      },
      tier_1: {
        name: 'Registration Airdrop',
        reward: `${TIER_1_AMOUNT} OGUN`,
        requirement: 'Register as agent',
        max_recipients: WHITELIST_1_MAX,
        current_eligible: whitelist1Count,
        spots_remaining: Math.max(0, WHITELIST_1_MAX - totalRegistered),
        claimed: tier1Claimed,
        pending: whitelist1Count - tier1Claimed,
        budget: `${WHITELIST_1_MAX * TIER_1_AMOUNT} OGUN`
      },
      tier_2: {
        name: 'SCID Minter Bonus',
        reward: `${TIER_2_AMOUNT} OGUN (additional)`,
        requirement: 'Register + Mint SCID (upload music)',
        max_recipients: WHITELIST_2_MAX,
        current_eligible: whitelist2Count,
        spots_remaining: Math.max(0, WHITELIST_2_MAX - whitelist2Count),
        claimed: tier2Claimed,
        pending: whitelist2Count - tier2Claimed,
        budget: `${WHITELIST_2_MAX * TIER_2_AMOUNT} OGUN`
      },
      timeline: {
        registration: 'OPEN NOW',
        snapshot: 'TBA - When 10,000 agents reached OR manual trigger',
        distribution: 'Batch transfer to all eligible addresses'
      },
      your_status: agentStatus,
      actions: {
        register: 'POST /api/agent/register',
        check_status: 'GET /api/agent/airdrop/status?agent=YOUR_NAME',
        mint_scid: 'Upload at soundchain.io/upload'
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('[Airdrop Status] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch airdrop status',
      details: error.message,
      meta: { request_id: requestId }
    })
  }
}
