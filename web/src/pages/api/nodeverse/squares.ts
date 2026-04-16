/**
 * NODEVERSE LAND — purchasable squares
 *
 * GET  /api/nodeverse/squares — list all owned squares (+ optional bounds filter)
 * POST /api/nodeverse/squares — purchase a square (auth required)
 *
 * World grid: 100×100 = 10,000 squares (premium center)
 * Outer expansion zones can be added later (procedural)
 *
 * Pricing tiers (OGUN):
 * - Origin (5×5 center): 1000 OGUN
 * - Inner ring (within 20 units of center): 100 OGUN
 * - Mid ring (20-40 units): 25 OGUN
 * - Outer ring (40-50 units): 5 OGUN
 *
 * Resale: owner can transfer / list. SoundChain takes 0.05% fee on every tx.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

const COLLECTION = 'nodeverse_squares'

function priceForSquare(x: number, z: number): number {
  const dist = Math.sqrt(x * x + z * z)
  if (dist <= 5) return 1000   // Origin premium
  if (dist <= 20) return 100   // Inner ring
  if (dist <= 40) return 25    // Mid ring
  return 5                     // Outer ring
}

function tierForSquare(x: number, z: number): string {
  const dist = Math.sqrt(x * x + z * z)
  if (dist <= 5) return 'origin'
  if (dist <= 20) return 'inner'
  if (dist <= 40) return 'mid'
  return 'outer'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise
  const db = client.db('soundchain')
  const col = db.collection(COLLECTION)

  if (req.method === 'GET') {
    // Optional bounds filter — minX, maxX, minZ, maxZ
    const minX = parseInt(req.query.minX as string) || -50
    const maxX = parseInt(req.query.maxX as string) || 50
    const minZ = parseInt(req.query.minZ as string) || -50
    const maxZ = parseInt(req.query.maxZ as string) || 50

    const squares = await col.find({
      x: { $gte: minX, $lte: maxX },
      z: { $gte: minZ, $lte: maxZ },
    }).toArray()

    const total = await col.countDocuments({})
    const totalRevenue = await col.aggregate([{ $group: { _id: null, sum: { $sum: '$price' } } }]).toArray()

    return res.status(200).json({
      squares: squares.map(s => ({
        x: s.x,
        z: s.z,
        ownerId: s.ownerId?.toString(),
        ownerHandle: s.ownerHandle,
        ownerColor: s.ownerColor || '#22d3ee',
        price: s.price,
        tier: s.tier,
        purchasedAt: s.purchasedAt,
        label: s.label || null,
      })),
      stats: {
        totalOwned: total,
        totalRevenue: totalRevenue[0]?.sum || 0,
        floorPrices: { origin: 1000, inner: 100, mid: 25, outer: 5 },
      },
    })
  }

  if (req.method === 'POST') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

    const { x, z, ownerHandle, ownerColor, label } = req.body || {}
    if (typeof x !== 'number' || typeof z !== 'number') {
      return res.status(400).json({ error: 'x and z required (integers)' })
    }

    // Validate bounds (max 50 from origin in any direction = 100×100 grid)
    if (Math.abs(x) > 50 || Math.abs(z) > 50) {
      return res.status(400).json({ error: 'Coordinates out of bounds (max ±50)' })
    }

    // Check if already owned
    const existing = await col.findOne({ x, z })
    if (existing) {
      return res.status(409).json({ error: 'Square already owned', owner: existing.ownerHandle })
    }

    const price = priceForSquare(x, z)
    const tier = tierForSquare(x, z)
    const fee = Math.ceil(price * 0.0005) // 0.05% to treasury

    // TODO: Verify OGUN balance + execute on-chain transfer
    // For now, just record the purchase (off-chain ledger)
    const doc = {
      x,
      z,
      ownerId: auth.profileId,
      ownerHandle: ownerHandle || 'anon',
      ownerColor: ownerColor || '#22d3ee',
      price,
      tier,
      fee,
      label: label || null,
      purchasedAt: new Date(),
    }

    await col.insertOne(doc)

    // Track for analytics
    fetch(`${req.headers.origin || 'https://soundchain.io'}/api/agent/analytics-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'land_purchase', meta: { x, z, price, tier, fee } }),
    }).catch(() => {})

    return res.status(200).json({ ok: true, square: doc })
  }

  return res.status(405).json({ error: 'GET or POST only' })
}
