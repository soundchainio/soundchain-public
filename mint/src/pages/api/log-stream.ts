/**
 * POST /api/log-stream
 *
 * Proxies SC's WIN-WIN streaming-reward logStream GraphQL mutation. Mint plays
 * audio inline on NFT cards + detail modals — past 30s of playback should
 * trigger OGUN rewards (70% creator / 30% listener) just like soundchain.io.
 *
 * Body:
 *   {
 *     scid: string,                  // SoundChain ID — required
 *     duration: number,              // seconds played (≥30 to qualify)
 *     listenerWallet?: string,       // EVM address of listener (for listener reward)
 *     listenerProfileId?: string,    // SC profile id (rarely set from mint)
 *   }
 *
 * Returns SC's logStream response: { success, totalStreams, creatorReward,
 *   listenerReward, creatorDailyLimitReached, listenerDailyLimitReached, trackTitle }
 *
 * Implementation: server-side fetch to SC's GraphQL endpoint. CORS-safe.
 * Listener wallet attribution requires SC's GraphQL resolver to honor
 * wallet-only auth (currently anonymous mint users get creator reward
 * only — listener reward path needs SC-side wallet→profile lookup if
 * we want listener rewards from mint).
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const SC_GRAPHQL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://19ne212py4.execute-api.us-east-1.amazonaws.com/production'

const LOG_STREAM_MUTATION = `
  mutation LogStream($input: LogStreamInput!) {
    logStream(input: $input) {
      success
      totalStreams
      creatorReward
      listenerReward
      creatorDailyLimitReached
      listenerDailyLimitReached
      trackTitle
    }
  }
`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  const { scid, duration, listenerWallet, listenerProfileId } = (req.body || {}) as {
    scid?: string
    duration?: number
    listenerWallet?: string
    listenerProfileId?: string
  }

  if (!scid || typeof scid !== 'string') {
    return res.status(400).json({ error: 'scid required' })
  }
  if (typeof duration !== 'number' || duration < 30) {
    return res.status(400).json({ error: 'duration must be ≥30 seconds' })
  }

  const input: Record<string, unknown> = { scid, duration }
  if (listenerWallet && listenerWallet.startsWith('0x') && listenerWallet.length === 42) {
    input.listenerWallet = listenerWallet
  }
  if (listenerProfileId) {
    input.listenerProfileId = listenerProfileId
  }

  try {
    const upstream = await fetch(SC_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: LOG_STREAM_MUTATION, variables: { input } }),
    })

    const data = await upstream.json()
    if (data.errors) {
      return res.status(502).json({ error: 'GraphQL error', graphqlErrors: data.errors })
    }
    return res.status(200).json(data.data?.logStream || { success: false })
  } catch (err: any) {
    return res.status(502).json({ error: err?.message || 'proxy failed' })
  }
}
