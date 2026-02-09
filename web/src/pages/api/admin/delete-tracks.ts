/**
 * Admin endpoint to soft-delete tracks
 * POST /api/admin/delete-tracks
 *
 * Body: { trackIds: string[], adminKey: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import mongoose from 'mongoose'

// Simple admin key check (use env var in production)
const ADMIN_KEY = process.env.ADMIN_DELETE_KEY || 'soundchain-admin-2026'

// MongoDB connection
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return

  if (!MONGO_URI) {
    throw new Error('MongoDB URI not configured')
  }

  await mongoose.connect(MONGO_URI)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { trackIds, adminKey } = req.body

  // Validate admin key
  if (adminKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Invalid admin key' })
  }

  if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
    return res.status(400).json({ error: 'trackIds array is required' })
  }

  try {
    await connectDB()

    // Get tracks collection
    const db = mongoose.connection.db
    const tracksCollection = db.collection('tracks')

    // Soft delete: set deleted = true
    const result = await tracksCollection.updateMany(
      { _id: { $in: trackIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { $set: { deleted: true, deletedAt: new Date() } }
    )

    return res.status(200).json({
      success: true,
      message: `Soft-deleted ${result.modifiedCount} tracks`,
      trackIds,
      modifiedCount: result.modifiedCount,
    })

  } catch (error: any) {
    console.error('[Admin Delete] Error:', error)
    return res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}
