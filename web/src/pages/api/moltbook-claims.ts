import type { NextApiRequest, NextApiResponse } from 'next'

// Saved Moltbook API keys for unclaimed agents
const AGENTS = [
  {
    name: 'SoundChain',
    apiKey: 'moltbook_sk_5j7_dd-1OpbpO8MC01D-G7gD-lNiEPRI',
    recommended: true,
  },
  {
    name: 'OGUN',
    apiKey: 'moltbook_sk_-Q3B4vccy5MXXiNdOEPYLD2QIlCqrM-8',
    recommended: false,
  },
  {
    name: 'SoundChainProtocol',
    apiKey: 'moltbook_sk_VdixDUYBnwuoY004sjD0iPUWufWj1WmK',
    recommended: false,
  },
  {
    name: 'SoundChainIO',
    apiKey: 'moltbook_sk_EauJa2yb2aYRQtrD-Kjbjyk4wn8dXwhH',
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
