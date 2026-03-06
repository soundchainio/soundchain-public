import type { NextApiRequest, NextApiResponse } from 'next'

export const config = {
  maxDuration: 60,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { fileUrl, fileName } = req.body

  if (!fileUrl || !fileName) {
    return res.status(400).json({ error: 'fileUrl and fileName are required' })
  }

  const apiKey = process.env.PINATA_API_KEY
  const apiSecret = process.env.PINATA_API_SECRET

  if (!apiKey || !apiSecret) {
    console.error('PINATA_API_KEY or PINATA_API_SECRET not configured')
    return res.status(500).json({ error: 'IPFS pinning not configured' })
  }

  try {
    // Fetch file from S3 URL
    const fileResponse = await fetch(fileUrl)
    if (!fileResponse.ok) {
      console.error(`Failed to fetch file from ${fileUrl}: ${fileResponse.status}`)
      return res.status(502).json({ error: `Failed to fetch file: ${fileResponse.status}` })
    }

    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer())

    // Build multipart form data for Pinata
    const formData = new FormData()
    formData.append('file', new Blob([fileBuffer]), fileName)
    formData.append('pinataMetadata', JSON.stringify({ name: fileName }))
    formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

    // Pin to Pinata
    const pinResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
      },
      body: formData,
    })

    if (!pinResponse.ok) {
      const errorText = await pinResponse.text()
      console.error('Pinata pin error:', pinResponse.status, errorText)
      return res.status(502).json({ error: `Pinata pinning failed: ${pinResponse.status}` })
    }

    const pinResult = await pinResponse.json()
    console.log(`✅ Pinned ${fileName} to IPFS: ${pinResult.IpfsHash}`)
    return res.status(200).json({ cid: pinResult.IpfsHash })
  } catch (error: any) {
    console.error('Pin file error:', error)
    return res.status(500).json({ error: error.message || 'Failed to pin file' })
  }
}
