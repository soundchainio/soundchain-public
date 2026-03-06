/**
 * Admin endpoint to soft-delete tracks via GraphQL
 * POST /api/admin/delete-tracks
 *
 * Body: { trackIds: string[], adminKey: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// Simple admin key check
const ADMIN_KEY = process.env.ADMIN_DELETE_KEY || 'soundchain-admin-2026'
const GRAPHQL_URL = process.env.NEXT_PUBLIC_API_URL || 'https://19ne212py4.execute-api.us-east-1.amazonaws.com/production'

// Delete track mutation (admin version doesn't require owner check)
const DELETE_TRACK_MUTATION = `
  mutation DeleteTrack($trackId: String!) {
    deleteTrack(trackId: $trackId) {
      id
      title
      deleted
    }
  }
`

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

  const results: { trackId: string; success: boolean; title?: string; error?: string }[] = []

  for (const trackId of trackIds) {
    try {
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: DELETE_TRACK_MUTATION,
          variables: { trackId },
        }),
      })

      const json = await response.json()

      if (json.errors) {
        results.push({ trackId, success: false, error: json.errors[0]?.message })
      } else if (json.data?.deleteTrack) {
        results.push({ trackId, success: true, title: json.data.deleteTrack.title })
      } else {
        results.push({ trackId, success: false, error: 'Unknown error' })
      }
    } catch (error: any) {
      results.push({ trackId, success: false, error: error.message })
    }
  }

  const successCount = results.filter(r => r.success).length

  return res.status(200).json({
    success: successCount > 0,
    message: `Deleted ${successCount}/${trackIds.length} tracks`,
    results,
  })
}
