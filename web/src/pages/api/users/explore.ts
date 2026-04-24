/**
 * GET /api/users/explore — Vercel-direct replacement for useExploreUsersQuery/SlimQuery
 *
 * ?search=xxx — search by handle or displayName
 * ?sort=newest|popular|active — sort order
 * ?limit=20&cursor=xxx — pagination
 * ?genre=hip-hop — filter by favorite genre
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const search = req.query.search as string
  const sort = (req.query.sort as string) || 'popular'
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const cursor = req.query.cursor as string
  const genre = req.query.genre as string

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const filter: any = {}
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [{ userHandle: regex }, { displayName: regex }]
    }
    if (genre) {
      filter.favoriteGenres = { $in: [genre] }
    }
    if (cursor) {
      try { filter._id = { $lt: new ObjectId(cursor) } } catch {}
    }

    const sortObj: any = sort === 'newest' ? { createdAt: -1 }
      : sort === 'active' ? { updatedAt: -1 }
      : { followerCount: -1, createdAt: -1 } // popular (default)

    const profiles = await db.collection('profiles')
      .find(filter)
      .sort(sortObj)
      .limit(limit + 1)
      .project({
        displayName: 1, userHandle: 1, profilePicture: 1, coverPicture: 1,
        bio: 1, followerCount: 1, followingCount: 1, tracksCount: 1,
        verified: 1, teamMember: 1, badges: 1, favoriteGenres: 1,
        musicianTypes: 1, createdAt: 1,
      })
      .toArray()

    const hasNextPage = profiles.length > limit
    if (hasNextPage) profiles.pop()

    const nodes = profiles.map(p => ({
      id: p._id.toString(),
      displayName: p.displayName || '',
      userHandle: p.userHandle || '',
      profilePicture: p.profilePicture || null,
      coverPicture: p.coverPicture || null,
      bio: p.bio || '',
      followerCount: p.followerCount || 0,
      followingCount: p.followingCount || 0,
      tracksCount: p.tracksCount || 0,
      verified: p.verified || false,
      teamMember: p.teamMember || false,
      badges: p.badges || [],
      favoriteGenres: p.favoriteGenres || [],
      musicianTypes: p.musicianTypes || [],
      createdAt: p.createdAt || null,
    }))

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({
      nodes,
      pageInfo: {
        hasNextPage,
        endCursor: profiles.length > 0 ? profiles[profiles.length - 1]._id.toString() : null,
        totalCount: nodes.length,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
