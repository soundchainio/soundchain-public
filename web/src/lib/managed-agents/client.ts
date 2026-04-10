/**
 * Managed Agents — Anthropic SDK Client Singleton
 *
 * Server-side only. Reuses connection across Vercel serverless invocations.
 * Supports BYOK (user key) and platform key fallback.
 *
 * Zero booleans.
 */

import Anthropic from '@anthropic-ai/sdk'

const KEY_SOURCE = {
  USER_BYOK: 'USER_BYOK',
  PLATFORM: 'PLATFORM',
  NONE: 'NONE',
} as const

type KeySource = typeof KEY_SOURCE[keyof typeof KEY_SOURCE]

interface ClientResult {
  client: Anthropic
  keySource: KeySource
}

// Platform client singleton (reused across requests)
let platformClient: Anthropic | null = null

function getPlatformClient(): Anthropic | null {
  if (platformClient) return platformClient
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  platformClient = new Anthropic({ apiKey: key })
  return platformClient
}

/**
 * Resolve an Anthropic client — BYOK first, platform fallback.
 * Returns null keySource if no key available.
 */
export function resolveClient(userKey?: string): ClientResult | null {
  // 1. BYOK — user's key, user's bill
  if (userKey && typeof userKey === 'string' && userKey.startsWith('sk-ant-')) {
    return {
      client: new Anthropic({ apiKey: userKey }),
      keySource: KEY_SOURCE.USER_BYOK,
    }
  }

  // 2. Platform key
  const platform = getPlatformClient()
  if (platform) {
    return {
      client: platform,
      keySource: KEY_SOURCE.PLATFORM,
    }
  }

  // 3. No key
  return null
}

export { KEY_SOURCE }
export type { KeySource }
