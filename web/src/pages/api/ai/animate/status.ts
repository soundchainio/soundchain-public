import type { NextApiRequest, NextApiResponse } from 'next'

function isAuthenticated(req: NextApiRequest): boolean {
  const jwt = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '')
  return !!jwt && jwt.length > 10
}

const IMAGINE_SERVER_URL = process.env.IMAGINE_SERVER_URL || 'http://localhost:8190'

// Poll a Wan i2v job. Returns { done, video?(data-url), failed?, error? }.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAuthenticated(req)) {
    return res.status(403).json({ error: 'Animate is in beta. Stay tuned.' })
  }
  const jobId = (req.query.job_id || req.body?.job_id) as string
  if (!jobId) {
    return res.status(400).json({ error: 'job_id is required' })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 40_000)
  try {
    const r = await fetch(`${IMAGINE_SERVER_URL}/api/animate/status?job_id=${encodeURIComponent(jobId)}`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const data = await r.json()
    return res.status(200).json(data)
  } catch (err: any) {
    clearTimeout(timeout)
    // Transient poll failure — tell the client to keep waiting, not to error out.
    return res.status(200).json({ done: false, transient: true })
  }
}

export const config = {
  api: { responseLimit: '60mb' },
  maxDuration: 60,
}
