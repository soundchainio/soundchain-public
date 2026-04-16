/**
 * NODEVERSE LAND — purchasable parcels (Decentraland-style)
 *
 * GET  /api/nodeverse/squares — list all owned parcels
 * POST /api/nodeverse/squares — purchase a parcel (auth required)
 *
 * World grid: 500×500 = 250,000 parcels — beats Decentraland (90K),
 * Sandbox (166K), Otherside (200K). Plus infinite outer expansion later.
 * Each parcel = 16×16 units (matches Decentraland LAND size).
 *
 * Pricing tiers (OGUN):
 * - Origin (5×5 center, 25 parcels): 1000 OGUN
 * - Inner (within 30 units, ~2,800 parcels): 100 OGUN
 * - Mid (within 100 units, ~28,000 parcels): 25 OGUN
 * - Outer (within 250 units, ~219,000 parcels): 5 OGUN
 *
 * Total floor revenue: ~2.1M OGUN at full sellout
 * Plus 0.05% perpetual fee on every resale.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

const COLLECTION = 'nodeverse_squares'
const WORLD_RADIUS = 250 // ±250 = 500×500 = 250,000 parcels

function priceForSquare(x: number, z: number): number {
  const dist = Math.sqrt(x * x + z * z)
  if (dist <= 5) return 1000     // Origin premium (~25 parcels)
  if (dist <= 30) return 100     // Inner ring (~2,800 parcels)
  if (dist <= 100) return 25     // Mid ring (~28,000 parcels)
  return 5                       // Outer ring (~219,000 parcels)
}

function tierForSquare(x: number, z: number): string {
  const dist = Math.sqrt(x * x + z * z)
  if (dist <= 5) return 'origin'
  if (dist <= 30) return 'inner'
  if (dist <= 100) return 'mid'
  return 'outer'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise
  const db = client.db('soundchain')
  const col = db.collection(COLLECTION)

  if (req.method === 'GET') {
    // Optional bounds filter — defaults to whole 500×500 world
    const minX = parseInt(req.query.minX as string) || -WORLD_RADIUS
    const maxX = parseInt(req.query.maxX as string) || WORLD_RADIUS
    const minZ = parseInt(req.query.minZ as string) || -WORLD_RADIUS
    const maxZ = parseInt(req.query.maxZ as string) || WORLD_RADIUS

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
        totalParcels: 250000, // 500×500 grid
        totalRevenue: totalRevenue[0]?.sum || 0,
        worldRadius: WORLD_RADIUS,
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

    // Validate bounds (max 250 from origin in any direction = 500×500 = 250K parcels)
    if (Math.abs(x) > WORLD_RADIUS || Math.abs(z) > WORLD_RADIUS) {
      return res.status(400).json({ error: `Coordinates out of bounds (max ±${WORLD_RADIUS})` })
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
