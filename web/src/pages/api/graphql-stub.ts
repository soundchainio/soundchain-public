/**
 * POST /api/graphql-stub — Vercel-direct (Phase 7f.6 final)
 *
 * Post-Phase-7f stub. Every Apollo query/mutation used to hit
 * api.soundchain.io Lambda → GraphQL resolver → Mongo. After Phase 7f,
 * every consumer was migrated to fetch-based Vercel-direct hooks. Any
 * leftover Apollo `useQuery`/`useMutation` calls are unintentional
 * stragglers — they now hit this stub which returns { data: null } so
 * they fail silently rather than 8s-TLS-timeout against the dead Lambda.
 *
 * If we ever see traffic on this endpoint we'll know there's a missed
 * migration to clean up.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ data: null })
}
