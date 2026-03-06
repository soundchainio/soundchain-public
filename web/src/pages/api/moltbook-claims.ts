import type { NextApiRequest, NextApiResponse } from 'next'

// Moltbook API keys loaded from environment variables
const AGENTS = [
  {
    name: 'SoundChain',
    apiKey: process.env.MOLTBOOK_SOUNDCHAIN_API_KEY || '',
    recommended: true,
  },
  {
    name: 'OGUN',
    apiKey: process.env.MOLTBOOK_OGUN_API_KEY || '',
    recommended: false,
  },
  {
    name: 'SoundChainProtocol',
    apiKey: process.env.MOLTBOOK_PROTOCOL_API_KEY || '',
    recommended: false,
  },
  {
    name: 'SoundChainIO',
    apiKey: process.env.MOLTBOOK_IO_API_KEY || '',
    recommended: false,
  },
]

interface MoltbookClaimResponse {
  success: boolean
  error?: string
  hint?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const results = await Promise.all(
    AGENTS.map(async (agent) => {
      try {
        const response = await fetch('https://www.moltbook.com/api/v1/agents/me', {
          headers: {
            Authorization: `Bearer ${agent.apiKey}`,
          },
        })
        const data: MoltbookClaimResponse = await response.json()

        // Extract claim URL from hint
        const claimUrlMatch = data.hint?.match(/https:\/\/moltbook\.com\/claim\/[a-zA-Z0-9_-]+/)

        return {
          name: agent.name,
          recommended: agent.recommended,
          claimed: data.success === true,
          claimUrl: claimUrlMatch ? claimUrlMatch[0] : null,
          error: data.error,
        }
      } catch (error) {
        return {
          name: agent.name,
          recommended: agent.recommended,
          claimed: false,
          claimUrl: null,
          error: 'Failed to fetch',
        }
      }
    })
  )

  res.status(200).json({
    success: true,
    generated_at: new Date().toISOString(),
    note: 'Claim links expire quickly! Open immediately after loading.',
    agents: results,
  })
}
