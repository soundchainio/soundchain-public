import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * POST /api/publish/instagram — Post to Instagram via Graph API.
 * Two-step: create media container → publish.
 * Image URL must be publicly accessible (IPFS/Pinata URLs work).
 *
 * Body: { imageUrl: string, caption: string }
 * Auth: Authorization: Bearer <PUBLISH_SECRET>
 */

const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID || ''
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || ''
const PUBLISH_SECRET = process.env.PUBLISH_SECRET || ''

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth check
  const authHeader = req.headers.authorization
  if (!PUBLISH_SECRET || authHeader !== `Bearer ${PUBLISH_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!INSTAGRAM_USER_ID || !INSTAGRAM_ACCESS_TOKEN) {
    return res.status(503).json({ error: 'Instagram API not configured' })
  }

  const { imageUrl, caption } = req.body
  if (!imageUrl || !caption) {
    return res.status(400).json({ error: 'Missing imageUrl or caption' })
  }

  try {
    // Step 1: Create media container
    const createUrl = `https://graph.facebook.com/v19.0/${INSTAGRAM_USER_ID}/media`
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    })

    const createData = await createResponse.json()
    if (!createResponse.ok || !createData.id) {
      console.error('[publish/instagram] Create error:', createData)
      return res.status(createResponse.status).json({ error: 'Failed to create media', details: createData })
    }

    const containerId = createData.id

    // Step 2: Publish the container
    const publishUrl = `https://graph.facebook.com/v19.0/${INSTAGRAM_USER_ID}/media_publish`
    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    })

    const publishData = await publishResponse.json()
    if (!publishResponse.ok) {
      console.error('[publish/instagram] Publish error:', publishData)
      return res.status(publishResponse.status).json({ error: 'Failed to publish', details: publishData })
    }

    return res.status(200).json({
      success: true,
      mediaId: publishData.id,
    })
  } catch (err) {
    console.error('[publish/instagram] Error:', err)
    return res.status(500).json({ error: 'Failed to post to Instagram' })
  }
}
