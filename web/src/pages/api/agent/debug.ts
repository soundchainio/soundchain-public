/**
 * Debug endpoint for agent API troubleshooting
 */

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'NOT SET'

  // Try to fetch from API
  let fetchResult = 'not tested'
  let fetchError = null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
      signal: controller.signal
    })

    clearTimeout(timeout)
    const text = await response.text()
    fetchResult = `${response.status}: ${text.substring(0, 200)}`
  } catch (e: any) {
    fetchError = e.message || String(e)
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
    timestamp: new Date().toISOString()
  })
}
