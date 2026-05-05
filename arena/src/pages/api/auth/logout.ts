/**
 * POST /api/auth/logout — clear arena session cookie.
 *
 * Reverts the user to guest (deviceId-pseudonymous) mode. Their
 * `arena_handles` row keyed on appleSub/googleSub remains intact so
 * signing back in restores the same handle/avatar.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { clearSessionCookie } from '@/lib/auth'

export const config = { runtime: 'nodejs' }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  clearSessionCookie(res)
  return res.status(200).json({ ok: true })
}
