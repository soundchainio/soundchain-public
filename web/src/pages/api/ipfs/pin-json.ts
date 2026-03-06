import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { json, fileName } = req.body

  if (!json || !fileName) {
    return res.status(400).json({ error: 'json and fileName are required' })
  }

  const apiKey = process.env.PINATA_API_KEY
  const apiSecret = process.env.PINATA_API_SECRET

  if (!apiKey || !apiSecret) {
    console.error('PINATA_API_KEY or PINATA_API_SECRET not configured')
    return res.status(500).json({ error: 'IPFS pinning not configured' })
  }

  try {
    const pinResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
      },
      body: JSON.stringify({
        pinataContent: json,
        pinataMetadata: { name: `${fileName}-metadata` },
      }),
    })

    if (!pinResponse.ok) {
      const errorText = await pinResponse.text()
      console.error('Pinata JSON pin error:', pinResponse.status, errorText)
      return res.status(502).json({ error: `Pinata pinning failed: ${pinResponse.status}` })
    }

    const pinResult = await pinResponse.json()
    console.log(`✅ Pinned ${fileName} metadata to IPFS: ${pinResult.IpfsHash}`)
    return res.status(200).json({ cid: pinResult.IpfsHash })
  } catch (error: any) {
    console.error('Pin JSON error:', error)
    return res.status(500).json({ error: error.message || 'Failed to pin JSON' })
  }
}
