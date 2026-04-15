/**
 * Operator Upload — Direct file upload to IPFS via Pinata
 * POST /api/operator/upload (multipart/form-data)
 * Auth via cookie (bodyParser disabled — auth reads from cookies/headers, not body)
 * Returns { cid, url, size, name }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { authFromRequest } from 'lib/api/authJwt'

export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  // Auth works from cookies/Authorization header — doesn't need parsed body
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const apiKey = process.env.PINATA_API_KEY
  const apiSecret = process.env.PINATA_API_SECRET
  if (!apiKey || !apiSecret) return res.status(500).json({ error: 'IPFS not configured' })

  try {
    // Read raw body
    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', resolve)
      req.on('error', reject)
    })
    const rawBody = Buffer.concat(chunks)

    const contentType = req.headers['content-type'] || ''
    let buffer: Buffer
    let fileName: string
    let mimeType: string

    if (contentType.includes('multipart/form-data')) {
      // Parse multipart
      const boundaryMatch = contentType.match(/boundary=(.+?)(?:;|$)/)
      if (!boundaryMatch) return res.status(400).json({ error: 'Missing boundary' })

      const boundary = boundaryMatch[1].trim()
      const bodyStr = rawBody.toString('latin1')
      const parts = bodyStr.split(`--${boundary}`)

      let found = false
      for (const part of parts) {
        if (!part.includes('Content-Disposition')) continue
        const nameMatch = part.match(/filename="([^"]*)"/)
        if (!nameMatch) continue

        fileName = nameMatch[1] || 'upload'
        const typeMatch = part.match(/Content-Type:\s*([^\r\n]+)/)
        mimeType = typeMatch?.[1]?.trim() || 'application/octet-stream'

        const headerEnd = part.indexOf('\r\n\r\n')
        if (headerEnd === -1) continue
        // Binary data starts after \r\n\r\n, ends before \r\n
        const dataStart = headerEnd + 4
        const dataEnd = part.lastIndexOf('\r\n')
        const binaryStr = dataEnd > dataStart ? part.slice(dataStart, dataEnd) : part.slice(dataStart)
        buffer = Buffer.from(binaryStr, 'latin1')
        found = true
        break
      }
      if (!found) return res.status(400).json({ error: 'No file in multipart body' })
    } else {
      // JSON fallback
      const json = JSON.parse(rawBody.toString('utf-8'))
      if (!json.fileData || !json.fileName) return res.status(400).json({ error: 'fileData and fileName required' })
      buffer = Buffer.from(json.fileData, 'base64')
      fileName = json.fileName
      mimeType = json.mimeType || 'application/octet-stream'
    }

    // Upload to Pinata
    const formData = new FormData()
    formData.append('file', new Blob([buffer!], { type: mimeType! }), fileName!)
    formData.append('pinataMetadata', JSON.stringify({
      name: `operator/${auth.profileId}/${fileName!}`,
      keyvalues: { uploadedBy: auth.profileId.toString(), source: 'operator' },
    }))
    formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

    const pinRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { pinata_api_key: apiKey, pinata_secret_api_key: apiSecret },
      body: formData,
    })

    if (!pinRes.ok) {
      const errText = await pinRes.text()
      return res.status(502).json({ error: `Pinata: ${pinRes.status}`, detail: errText })
    }

    const result = await pinRes.json()
    const cid = result.IpfsHash
    const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/'

    return res.status(200).json({ cid, url: `${gateway}${cid}`, size: buffer!.length, name: fileName! })
  } catch (err: any) {
    console.error('[Operator Upload]', err)
    return res.status(500).json({ error: err.message })
  }
}
