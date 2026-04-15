/**
 * Operator Upload — Direct file upload to IPFS via Pinata
 * POST /api/operator/upload (multipart/form-data)
 * Auth required. Returns { cid, url, size, name }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { authFromRequest } from 'lib/api/authJwt'

export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
}

async function parseMultipart(req: NextApiRequest): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const body = Buffer.concat(chunks)
      const contentType = req.headers['content-type'] || ''
      const boundaryMatch = contentType.match(/boundary=(.+)/)
      if (!boundaryMatch) return reject(new Error('No boundary in content-type'))

      const boundary = boundaryMatch[1]
      const parts = body.toString('binary').split(`--${boundary}`)

      for (const part of parts) {
        if (part.includes('Content-Disposition: form-data') && part.includes('filename=')) {
          const nameMatch = part.match(/filename="([^"]*)"/)
          const typeMatch = part.match(/Content-Type:\s*(.+)\r?\n/)
          const fileName = nameMatch?.[1] || 'upload'
          const mimeType = typeMatch?.[1]?.trim() || 'application/octet-stream'

          // Extract binary data after double newline
          const headerEnd = part.indexOf('\r\n\r\n')
          if (headerEnd === -1) continue
          const dataStr = part.slice(headerEnd + 4).replace(/\r\n$/, '')
          const buffer = Buffer.from(dataStr, 'binary')
          return resolve({ buffer, fileName, mimeType })
        }
      }
      reject(new Error('No file found in multipart body'))
    })
    req.on('error', reject)
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const apiKey = process.env.PINATA_API_KEY
  const apiSecret = process.env.PINATA_API_SECRET
  if (!apiKey || !apiSecret) return res.status(500).json({ error: 'IPFS not configured' })

  try {
    const { buffer, fileName, mimeType } = await parseMultipart(req)

    // Upload to Pinata
    const formData = new FormData()
    formData.append('file', new Blob([buffer], { type: mimeType }), fileName)
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
