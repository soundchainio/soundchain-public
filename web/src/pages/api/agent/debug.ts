/**
 * Debug endpoint for agent API troubleshooting
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const TRACKS_QUERY = `
  query RadioTracks($limit: Int) {
    exploreTracks(page: { first: $limit }) {
      nodes {
        id
        title
        artist
      }
      pageInfo {
        totalCount
      }
    }
  }
`

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'NOT SET'

  // Try to fetch from API - basic test
  let fetchResult = 'not tested'
  let fetchError = null

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' })
    })
    const text = await response.text()
    fetchResult = `${response.status}: ${text.substring(0, 200)}`
  } catch (e: any) {
    fetchError = e.message || String(e)
  }

  // Try to fetch tracks - same as radio
  let tracksResult = 'not tested'
  let tracksError = null
  let trackCount = 0

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: TRACKS_QUERY,
        variables: { limit: 5 }
      })
    })
    const text = await response.text()
    tracksResult = `${response.status}: ${text.substring(0, 500)}`

    try {
      const json = JSON.parse(text)
      trackCount = json.data?.exploreTracks?.pageInfo?.totalCount || 0
    } catch (e) {
      // ignore parse error
    }
  } catch (e: any) {
    tracksError = e.message || String(e)
  }

  return res.status(200).json({
    env: {
      NEXT_PUBLIC_API_URL: apiUrl,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL || 'false'
    },
    fetch_test: {
      url: apiUrl,
      result: fetchResult,
      error: fetchError
    },
    tracks_test: {
      result: tracksResult,
      error: tracksError,
      track_count: trackCount
    },
    timestamp: new Date().toISOString()
  })
}
