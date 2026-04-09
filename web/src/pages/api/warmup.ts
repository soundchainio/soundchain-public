/**
 * /api/warmup — Keep Atlas connection warm
 *
 * Called every 5 minutes via Vercel cron. Makes a lightweight GraphQL
 * query to the Lambda backend, which keeps:
 * 1. Lambda container warm (no cold start)
 * 2. MongoDB Atlas connection pool alive (minPoolSize=2)
 * 3. DNS resolution cached
 *
 * Returns timing data for monitoring.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://19ne212py4.execute-api.us-east-1.amazonaws.com/production'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const start = Date.now()

  try {
    // Lightweight introspection query — touches DB connection but minimal work
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ __typename }',
      }),
    })

    const data = await response.json()
    const lambdaMs = Date.now() - start

    res.status(200).json({
      success: true,
      warm: true,
      lambda_ms: lambdaMs,
      status: response.status,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    const lambdaMs = Date.now() - start
    res.status(200).json({
      success: false,
      warm: false,
      lambda_ms: lambdaMs,
      error: err.message,
      timestamp: new Date().toISOString(),
    })
  }
}
