/**
 * Operator Status — Live P2P node info for the Operator dashboard
 * GET /api/operator/status
 * Returns: IPFS gateway health, relay count, peer simulation, bandwidth
 */
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  // Check IPFS gateway health
  let ipfsLatency = -1
  let ipfsStatus: 'online' | 'degraded' | 'offline' = 'offline'
  try {
    const start = Date.now()
    const r = await fetch('https://gateway.pinata.cloud/ipfs/QmPChd2hVbrJ6bfo3WBcTW4iZnpHm8TEzWkLHmLpXhF68A', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    ipfsLatency = Date.now() - start
    ipfsStatus = r.ok ? 'online' : 'degraded'
  } catch {
    ipfsStatus = 'offline'
  }

  // Check Nostr relay connectivity (sample 3 relays)
  const relays = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band']
  let relaysOnline = 0
  // We can't do WebSocket in serverless, so just report configured count
  relaysOnline = relays.length

  // Pinata pin count (if API available)
  let pinCount = 0
  const apiKey = process.env.PINATA_API_KEY
  const apiSecret = process.env.PINATA_API_SECRET
  if (apiKey && apiSecret) {
    try {
      const r = await fetch('https://api.pinata.cloud/data/userPinnedDataTotal', {
        headers: { pinata_api_key: apiKey, pinata_secret_api_key: apiSecret },
        signal: AbortSignal.timeout(5000),
      })
      if (r.ok) {
        const data = await r.json()
        pinCount = data.pin_count || 0
      }
    } catch {}
  }

  return res.status(200).json({
    ipfs: { status: ipfsStatus, latency: ipfsLatency, gateway: 'gateway.pinata.cloud', pins: pinCount },
    nostr: { relays: relays.length, configured: relays },
    webrtc: { available: true, protocol: 'DTLS 1.2 + SCTP' },
    bluetooth: { available: false, note: 'Requires native app (Bitchat BLE)' },
    operator: { version: '1.0.0', maxFileSize: '100MB', supportedProtocols: ['IPFS', 'WebRTC', 'Nostr', 'BLE'] },
  })
}
