import type { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import clientPromise from '../../../lib/mongodb'
import { ObjectId } from 'mongodb'

const JWT_SECRET = process.env.JWT_SECRET || 'not-so-secret'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth check
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    jwt.verify(auth.slice(7), JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const follows = db.collection('follows')
    const profiles = db.collection('profiles')

    const totalFollowDocs = await follows.countDocuments()

    // Step 1: Migrate any docs with "followingId" to "followedId" (fix field name mismatch)
    const migratedDocs = await follows.updateMany(
      { followingId: { $exists: true }, followedId: { $exists: false } },
      [{ $set: { followedId: '$followingId' } }, { $unset: 'followingId' }]
    )

    // Step 2: Remove duplicate follow docs (same followerId + followedId)
    const duplicates = await follows.aggregate([
      { $group: {
        _id: { followerId: '$followerId', followedId: '$followedId' },
        count: { $sum: 1 },
        ids: { $push: '$_id' },
      }},
      { $match: { count: { $gt: 1 } } },
    ]).toArray()

    let removedDuplicates = 0
    for (const dup of duplicates) {
      // Keep the first, remove the rest
      const idsToRemove = dup.ids.slice(1)
      const result = await follows.deleteMany({ _id: { $in: idsToRemove } })
      removedDuplicates += result.deletedCount
    }

    // Step 3: Count actual followers per profile from clean data
    const followerCounts = await follows.aggregate([
      { $group: { _id: '$followedId', count: { $sum: 1 } } },
    ]).toArray()

    const followingCounts = await follows.aggregate([
      { $group: { _id: '$followerId', count: { $sum: 1 } } },
    ]).toArray()

    // Build lookup maps
    const followerMap = new Map<string, number>()
    for (const entry of followerCounts) {
      const id = entry._id?.toString()
      if (id) followerMap.set(id, entry.count)
    }

    const followingMap = new Map<string, number>()
    for (const entry of followingCounts) {
      const id = entry._id?.toString()
      if (id) followingMap.set(id, entry.count)
    }

    // Step 4: Reset all profiles and set correct counts
    await profiles.updateMany({}, { $set: { followerCount: 0, followingCount: 0 } })

    let updatedProfiles = 0
    const allProfiles = await profiles.find({}, { projection: { _id: 1 } }).toArray()

    for (const profile of allProfiles) {
      const id = profile._id.toString()
      const fc = followerMap.get(id) || 0
      const fgc = followingMap.get(id) || 0

      if (fc > 0 || fgc > 0) {
        await profiles.updateOne(
          { _id: profile._id },
          { $set: { followerCount: fc, followingCount: fgc } }
        )
        updatedProfiles++
      }
    }

    return res.status(200).json({
      success: true,
      totalFollowDocs,
      migratedFieldNames: migratedDocs.modifiedCount,
      removedDuplicates,
      cleanFollowDocs: await follows.countDocuments(),
      profilesWithFollows: updatedProfiles,
      totalProfiles: allProfiles.length,
    })
  } catch (error: any) {
    console.error('Recalculate follow counts error:', error)
    return res.status(500).json({ error: error.message || 'Failed to recalculate' })
  }
}
