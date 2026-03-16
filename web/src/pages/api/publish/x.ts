import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

/**
 * POST /api/publish/x — Post a tweet to X via API v2.
 * OAuth 1.0a signing with Node.js crypto (zero new deps).
 * Free tier: 1,500 tweets/month (50/day).
 *
 * Body: { text: string, mediaUrl?: string }
 * Auth: Authorization: Bearer <PUBLISH_SECRET>
 */

const X_API_KEY = process.env.X_API_KEY || ''
const X_API_SECRET = process.env.X_API_SECRET || ''
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN || ''
const X_ACCESS_SECRET = process.env.X_ACCESS_SECRET || ''
const PUBLISH_SECRET = process.env.PUBLISH_SECRET || ''

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&')

  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(sortedParams)}`
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`

  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')
}

function buildOAuthHeader(method: string, url: string, body?: Record<string, string>): string {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(16).toString('hex')

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: X_API_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: X_ACCESS_TOKEN,
    oauth_version: '1.0',
  }

  // Merge body params for signature (only for form-encoded, not JSON)
  const allParams = { ...oauthParams, ...(body || {}) }

  const signature = generateOAuthSignature(method, url, allParams, X_API_SECRET, X_ACCESS_SECRET)
  oauthParams['oauth_signature'] = signature

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ')

  return `OAuth ${headerParts}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth check
  const secret = process.env.PUBLISH_SECRET || ''
  const authHeader = req.headers.authorization
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized', debug: { hasSecret: !!secret, secretLen: secret.length, hasAuth: !!authHeader } })
  }

  if (!X_API_KEY || !X_ACCESS_TOKEN) {
    return res.status(503).json({ error: 'X API not configured' })
  }

  const { text } = req.body
  if (!text || typeof text !== 'string' || text.length === 0) {
    return res.status(400).json({ error: 'Missing text' })
  }

  try {
    const url = 'https://api.x.com/2/tweets'
    const oauthHeader = buildOAuthHeader('POST', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': oauthHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[publish/x] X API error:', data)
      return res.status(response.status).json({ error: 'X API error', details: data })
    }

    return res.status(200).json({
      success: true,
      tweetId: data.data?.id,
      text: data.data?.text,
    })
  } catch (err) {
    console.error('[publish/x] Error:', err)
    return res.status(500).json({ error: 'Failed to post tweet' })
  }
}
