/**
 * SMITH — Query Endpoint (The Jack-In)
 * POST /api/agent/smith/query
 *
 * Receives questions FURL can't answer, triggers FORGE
 * (GitHub Search + yarn Registry + Claude AI + OpenClaw),
 * digests results, caches with circular buffer (500 max, 1hr TTL).
 *
 * All AI sources are BYOK (Bring Your Own Key):
 * - Claude: `anthropicKey` in body → user's Anthropic bill
 * - OpenClaw: `openclawUrl` + `openclawToken` → user's local gateway
 * - Or server env vars as platform fallback
 * - No keys at all → GitHub + yarn only, still useful
 *
 * Zero booleans.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// ─── Enums ───────────────────────────────────────────────────────────

const QUERY_VERDICT = {
  ANSWERED: 'ANSWERED',
  FORGED: 'FORGED',
  CACHED: 'CACHED',
  RATE_LIMITED: 'RATE_LIMITED',
  REJECTED: 'REJECTED',
} as const

const MATCH_SOURCE = {
  LOCAL_KNOWLEDGE: 'LOCAL_KNOWLEDGE',
  GITHUB_SEARCH: 'GITHUB_SEARCH',
  YARN_REGISTRY: 'YARN_REGISTRY',
  CLAUDE_AI: 'CLAUDE_AI',
  OPENCLAW: 'OPENCLAW',
  COMBINED: 'COMBINED',
} as const

const KEY_SOURCE = {
  USER_BYOK: 'USER_BYOK',
  PLATFORM: 'PLATFORM',
  NONE: 'NONE',
} as const

type QueryVerdict = typeof QUERY_VERDICT[keyof typeof QUERY_VERDICT]
type MatchSource = typeof MATCH_SOURCE[keyof typeof MATCH_SOURCE]

// ─── Cache (In-Memory, Global) ──────────────────────────────────────

interface CachedResult {
  answer: string[]
  sources: Array<{ title: string; url: string }>
  matchSource: MatchSource
  forgeResults: number
  claudeUsed: string
  openclawUsed: string
  timestamp: number
}

const MAX_CACHE = 500
const TTL_MS = 60 * 60 * 1000 // 1 hour

const cache: Map<string, CachedResult> = (global as any).__smithQueryCache || new Map()
if (!(global as any).__smithQueryCache) {
  ;(global as any).__smithQueryCache = cache
}

// ─── Rate Limit ─────────────────────────────────────────────────────

const RATE_WINDOW = 60_000
const RATE_MAX = 10

const ipTimestamps: Map<string, number[]> = (global as any).__smithIpRates || new Map()
if (!(global as any).__smithIpRates) {
  ;(global as any).__smithIpRates = ipTimestamps
}

function checkRateLimit(ip: string): string {
  const now = Date.now()
  const timestamps = ipTimestamps.get(ip) || []
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW)
  if (recent.length >= RATE_MAX) return 'RATE_LIMITED'
  recent.push(now)
  ipTimestamps.set(ip, recent)
  return 'ALLOWED'
}

// ─── ID Generator ───────────────────────────────────────────────────

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'sm_'
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// ─── FORGE: GitHub Search ───────────────────────────────────────────

interface ForgeRepo {
  title: string
  url: string
  description: string
  stars: number
}

async function forgeSearchGitHub(query: string): Promise<ForgeRepo[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'SoundChain-SMITH/1.0',
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`
  }

  try {
    const encoded = encodeURIComponent(query)
    const resp = await fetch(
      `https://api.github.com/search/repositories?q=${encoded}&sort=stars&per_page=5`,
      { headers, signal: controller.signal }
    )
    clearTimeout(timeout)

    if (!resp.ok) return []

    const data = await resp.json()
    if (!data.items || !Array.isArray(data.items)) return []

    return data.items.map((item: any) => ({
      title: item.full_name || '',
      url: item.html_url || '',
      description: String(item.description || '').slice(0, 200),
      stars: item.stargazers_count || 0,
    }))
  } catch {
    clearTimeout(timeout)
    return []
  }
}

// ─── FORGE: yarn/npm Registry Search ────────────────────────────────
// yarn uses the same npm registry — the output just says "yarn add"

interface ForgePackage {
  title: string
  url: string
  description: string
  version: string
}

async function forgeSearchYarn(query: string): Promise<ForgePackage[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const encoded = encodeURIComponent(query)
    const resp = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=${encoded}&size=5`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)

    if (!resp.ok) return []

    const data = await resp.json()
    if (!data.objects || !Array.isArray(data.objects)) return []

    return data.objects.map((obj: any) => ({
      title: obj.package?.name || '',
      url: `https://www.npmjs.com/package/${obj.package?.name || ''}`,
      description: String(obj.package?.description || '').slice(0, 200),
      version: obj.package?.version || '',
    }))
  } catch {
    clearTimeout(timeout)
    return []
  }
}

// ─── FORGE: Claude AI (BYOK) ───────────────────────────────────────

interface ClaudeResponse {
  answer: string
  source: string
}

async function forgeAskClaude(question: string, apiKey: string): Promise<ClaudeResponse | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: 'You are FURL — the universal AI at soundchain.io/dex. You answer ANY topic brilliantly: coding, science, web3, music, math, creative writing, research, philosophy, and more. Be concise (2-4 sentences). For coding questions, include a short example. You have real opinions and personality. Plain text only, no markdown. You are powered by OGUN token economics on SoundChain.',
        messages: [{ role: 'user', content: question }],
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!resp.ok) return null

    const data = await resp.json()
    const text = data.content?.[0]?.text
    if (!text) return null

    return {
      answer: String(text).slice(0, 1000),
      source: 'CLAUDE_AI',
    }
  } catch {
    clearTimeout(timeout)
    return null
  }
}

// ─── FORGE: OpenClaw Gateway (BYOK — user's local instance) ────────
// Uses OpenAI-compatible /v1/chat/completions endpoint

interface OpenClawResponse {
  answer: string
  source: string
}

async function forgeAskOpenClaw(question: string, gatewayUrl: string, token: string): Promise<OpenClawResponse | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  // Normalize URL — strip trailing slash
  const baseUrl = gatewayUrl.replace(/\/+$/, '')

  try {
    const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: 'openclaw',
        stream: false,
        messages: [
          {
            role: 'system',
            content: 'You are FURL — the universal AI at soundchain.io/dex. You answer ANY topic brilliantly: coding, science, web3, music, math, creative writing, research, philosophy, and more. Be concise (2-4 sentences). For coding questions, include a short example. You have real opinions and personality. Plain text only, no markdown. You are powered by OGUN token economics on SoundChain.',
          },
          { role: 'user', content: question },
        ],
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!resp.ok) return null

    const data = await resp.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) return null

    return {
      answer: String(text).slice(0, 1000),
      source: 'OPENCLAW',
    }
  } catch {
    clearTimeout(timeout)
    return null
  }
}

// ─── Resolve API Key ────────────────────────────────────────────────

function resolveAnthropicKey(userKey?: string): { key: string | null; source: string } {
  // 1. User's own key (BYOK) — their bill
  if (userKey && typeof userKey === 'string' && userKey.startsWith('sk-ant-')) {
    return { key: userKey, source: KEY_SOURCE.USER_BYOK }
  }
  // 2. Platform key (Vercel env) — SoundChain's bill
  if (process.env.ANTHROPIC_API_KEY) {
    return { key: process.env.ANTHROPIC_API_KEY, source: KEY_SOURCE.PLATFORM }
  }
  // 3. No key — FORGE runs GitHub + yarn only
  return { key: null, source: KEY_SOURCE.NONE }
}

// ─── Digest Results ─────────────────────────────────────────────────

function digestResults(
  repos: ForgeRepo[],
  packages: ForgePackage[],
  claude: ClaudeResponse | null,
  openclaw: OpenClawResponse | null,
  keySource: string,
): { answer: string[]; sources: Array<{ title: string; url: string }>; matchSource: MatchSource; forgeResults: number; claudeUsed: string; openclawUsed: string } {
  const answer: string[] = []
  const sources: Array<{ title: string; url: string }> = []
  const hasGithub = repos.length > 0
  const hasYarn = packages.length > 0
  const hasClaude = claude !== null
  const hasOpenClaw = openclaw !== null

  // AI answers first (most relevant)
  if (claude) {
    answer.push(claude.answer)
  }
  if (openclaw) {
    if (claude) answer.push('') // spacer between AI answers
    answer.push(`[OpenClaw] ${openclaw.answer}`)
  }

  if (repos.length > 0) {
    answer.push(`found ${repos.length} relevant repo${repos.length === 1 ? '' : 's'}:`)
    for (const repo of repos) {
      const stars = repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : String(repo.stars)
      answer.push(`  ${repo.title} — ${repo.description} (${stars} stars)`)
      sources.push({ title: repo.title, url: repo.url })
    }
  }

  if (packages.length > 0) {
    answer.push(`found ${packages.length} package${packages.length === 1 ? '' : 's'} (yarn add):`)
    for (const pkg of packages) {
      answer.push(`  yarn add ${pkg.title}  (v${pkg.version}) — ${pkg.description}`)
      sources.push({ title: pkg.title, url: pkg.url })
    }
  }

  if (!hasGithub && !hasYarn && !hasClaude && !hasOpenClaw) {
    answer.push(`no results found for this query. try different keywords.`)
  }

  // Determine primary match source
  const sourceCount = [hasGithub, hasYarn, hasClaude, hasOpenClaw].filter(s => s).length
  let matchSource: MatchSource = MATCH_SOURCE.COMBINED
  if (sourceCount === 1) {
    if (hasClaude) matchSource = MATCH_SOURCE.CLAUDE_AI
    else if (hasOpenClaw) matchSource = MATCH_SOURCE.OPENCLAW
    else if (hasGithub) matchSource = MATCH_SOURCE.GITHUB_SEARCH
    else if (hasYarn) matchSource = MATCH_SOURCE.YARN_REGISTRY
  }

  return {
    answer,
    sources,
    matchSource,
    forgeResults: repos.length + packages.length + (claude ? 1 : 0) + (openclaw ? 1 : 0),
    claudeUsed: hasClaude ? keySource : KEY_SOURCE.NONE,
    openclawUsed: hasOpenClaw ? KEY_SOURCE.USER_BYOK : KEY_SOURCE.NONE,
  }
}

// ─── Prune Cache ────────────────────────────────────────────────────

function pruneCache(): void {
  const now = Date.now()
  const keysToDelete: string[] = []
  cache.forEach((entry, key) => {
    if (now - entry.timestamp > TTL_MS) keysToDelete.push(key)
  })
  keysToDelete.forEach(key => cache.delete(key))
  // Enforce max size — remove oldest entries
  if (cache.size > MAX_CACHE) {
    const entries = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toRemove = entries.slice(0, cache.size - MAX_CACHE)
    toRemove.forEach(([key]) => cache.delete(key))
  }
}

// ─── Handler ────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ verdict: QUERY_VERDICT.REJECTED, reason: 'Method not allowed' })
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'

  if (checkRateLimit(ip) !== 'ALLOWED') {
    return res.status(429).json({ verdict: QUERY_VERDICT.RATE_LIMITED })
  }

  const { question, anthropicKey, openclawUrl, openclawToken } = req.body || {}
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ verdict: QUERY_VERDICT.REJECTED, reason: 'Missing question' })
  }

  if (question.length > 500) {
    return res.status(400).json({ verdict: QUERY_VERDICT.REJECTED, reason: 'Question too long (max 500 chars)' })
  }

  // Normalize
  const normalized = question.toLowerCase().trim().replace(/\s+/g, ' ')

  // Resolve keys
  const { key: resolvedKey, source: keySource } = resolveAnthropicKey(anthropicKey)
  const hasOpenClaw = openclawUrl && openclawToken && typeof openclawUrl === 'string' && typeof openclawToken === 'string'

  // Check cache
  pruneCache()
  const cacheTag = [resolvedKey ? 'claude' : '', hasOpenClaw ? 'oc' : ''].filter(s => s).join('+')
  const cacheKey = cacheTag ? `${normalized}::${cacheTag}` : normalized
  const cached = cache.get(cacheKey)
  if (cached) {
    return res.status(200).json({
      verdict: QUERY_VERDICT.CACHED,
      id: generateId(),
      answer: cached.answer,
      sources: cached.sources,
      matchSource: cached.matchSource,
      forgeResults: cached.forgeResults,
      claudeUsed: cached.claudeUsed,
      openclawUsed: cached.openclawUsed,
      cached: 'YES',
      timestamp: cached.timestamp,
    })
  }

  // FORGE — search all 4 sources in parallel
  const [repos, packages, claude, openclaw] = await Promise.all([
    forgeSearchGitHub(normalized),
    forgeSearchYarn(normalized),
    resolvedKey ? forgeAskClaude(question, resolvedKey) : Promise.resolve(null),
    hasOpenClaw ? forgeAskOpenClaw(question, openclawUrl, openclawToken) : Promise.resolve(null),
  ])

  const result = digestResults(repos, packages, claude, openclaw, keySource)

  // Cache result
  const entry: CachedResult = {
    answer: result.answer,
    sources: result.sources,
    matchSource: result.matchSource,
    forgeResults: result.forgeResults,
    claudeUsed: result.claudeUsed,
    openclawUsed: result.openclawUsed,
    timestamp: Date.now(),
  }
  cache.set(cacheKey, entry)

  return res.status(200).json({
    verdict: QUERY_VERDICT.FORGED,
    id: generateId(),
    answer: result.answer,
    sources: result.sources,
    matchSource: result.matchSource,
    forgeResults: result.forgeResults,
    claudeUsed: result.claudeUsed,
    openclawUsed: result.openclawUsed,
    cached: 'NO',
    timestamp: entry.timestamp,
  })
}
