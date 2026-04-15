/**
 * Operator Upload — Direct file upload to IPFS via Pinata
 * POST /api/operator/upload (multipart/form-data)
 * Auth required. Returns { cid, url, size, name }
 *
 * Uses raw buffer parsing — no external deps needed.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { authFromRequest } from 'lib/api/authJwt'

export const config = {
  api: { bodyParser: { sizeLimit: '100mb' } },
  maxDuration: 60,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const apiKey = process.env.PINATA_API_KEY
  const apiSecret = process.env.PINATA_API_SECRET
  if (!apiKey || !apiSecret) return res.status(500).json({ error: 'IPFS not configured' })

  try {
    // Body is base64-encoded file data from client (simpler than multipart in serverless)
    const { fileData, fileName, mimeType } = req.body
    if (!fileData || !fileName) return res.status(400).json({ error: 'fileData and fileName required' })

    const buffer = Buffer.from(fileData, 'base64')

    // Upload to Pinata
    const formData = new FormData()
    formData.append('file', new Blob([buffer], { type: mimeType || 'application/octet-stream' }), fileName)
    formData.append('pinataMetadata', JSON.stringify({
      name: `operator/${auth.profileId}/${fileName}`,
      keyvalues: { uploadedBy: auth.profileId.toString(), source: 'operator' },
    }))
    formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

    const pinRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { pinata_api_key: apiKey, pinata_secret_api_key: apiSecret },
      body: formData,
    })

    if (!pinRes.ok) {
      const err = await pinRes.text()
      return res.status(502).json({ error: `Pinata failed: ${pinRes.status}`, detail: err })
    }

    const result = await pinRes.json()
    const cid = result.IpfsHash
    const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/'

    return res.status(200).json({
      cid,
      url: `${gateway}${cid}`,
      size: buffer.length,
      name: fileName,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
