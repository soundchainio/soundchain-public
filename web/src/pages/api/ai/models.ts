import type { NextApiRequest, NextApiResponse } from 'next'

const IMAGINE_URL = process.env.IMAGINE_SERVER_URL || 'http://localhost:8190'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const response = await fetch(`${IMAGINE_URL}/api/models`)
    if (!response.ok) {
      throw new Error(`Imagine server returned ${response.status}`)
    }
    const data = await response.json()
    return res.status(200).json(data)
  } catch (err: any) {
    // If imagine server is unreachable, return static fallback model list
    if (err.message?.includes('ECONNREFUSED') || err.message?.includes('fetch failed')) {
      return res.status(200).json({
        models: [
          {
            id: 'sdxl-turbo',
            description: 'SDXL Turbo — 4-step, fastest (~30-60s CPU)',
            category: 'fast',
            default_steps: 4,
            default_width: 512,
            default_height: 512,
            default_cfg: 0.0,
            max_width: 512,
            max_height: 512,
            loaded: false,
          },
          {
            id: 'sd-1.5',
            description: 'Stable Diffusion 1.5 — Classic, versatile (~2-3 min CPU)',
            category: 'classic',
            default_steps: 20,
            default_width: 512,
            default_height: 512,
            default_cfg: 7.5,
            max_width: 768,
            max_height: 768,
            loaded: false,
          },
        ],
        offline: true,
      })
    }
    return res.status(500).json({ error: err.message || 'Failed to fetch models' })
  }
}
