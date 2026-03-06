/**
 * Agent FORGE — Status Endpoint
 * GET /api/agent/forge/status
 *
 * Returns FORGE engine status, search stats, registry health.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const REGISTRIES = [
  { name: 'GITHUB', url: 'https://api.github.com', repoCount: '200M+' },
  { name: 'NPM', url: 'https://registry.npmjs.org', packageCount: '2M+' },
  { name: 'PYPI', url: 'https://pypi.org', packageCount: '500K+' },
  { name: 'CRATES_IO', url: 'https://crates.io', packageCount: '140K+' },
  { name: 'GO_MODULES', url: 'https://pkg.go.dev', packageCount: '1M+' },
  { name: 'OPENCLAW', url: 'local', extensionCount: '37+' },
]

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const searchLog: any[] = (global as any).__forgeSearchLog || []

  // Category distribution
  const categoryCounts: Record<string, number> = {}
  for (const entry of searchLog) {
    const cat = entry.category || 'UTILITY'
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  }

  return res.status(200).json({
    agent: 'FORGE',
    version: '1.0.0',
    description: 'Source code search engine — scans every open source repo on Earth',
    mode: 'SCANNING',
    registries: REGISTRIES,
    searchStats: {
      totalSearches: searchLog.length,
      totalResults: searchLog.reduce((sum: number, e: any) => sum + (e.resultCount || 0), 0),
      categoryCounts,
    },
    licensePriority: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense'],
    clientSideFirst: 'ALWAYS',
    timestamp: Date.now(),
  })
}
