import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }
  return res.status(200).json({
    app: 'mint',
    phase: 2,
    status: 'shell-live',
    reownConfigured: !!process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
    mongoConfigured: !!process.env.MONGODB_URI,
    sessionSecretConfigured: !!process.env.MINT_SESSION_SECRET,
    builtAt: new Date().toISOString(),
  })
}
