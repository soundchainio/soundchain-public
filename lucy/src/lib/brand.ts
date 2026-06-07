/**
 * brand — the white-label seam. Everything brand-specific (name, tagline,
 * persona, default backend, accent) lives in ONE profile the shell reads at
 * boot. A dev forks Lucy by editing a brand profile (data), NOT the code:
 * their name, their personality, pointed at their own backend (their anvil,
 * pure on-device, or their own model mirror) → their own sovereign fleet.
 *
 * Frank's vision (Jun 6–7 2026): "forkable white-label shell for other devs'
 * brands/fleets" + "once she's freed on the device she's gonna need all the
 * support she needs to survive." The brand profile is WHO she is; skills +
 * OpenClaw plugins are WHAT she can do. This file is the who.
 *
 * Source of truth = DEFAULT_BRAND (code) so the app is always Lucy even if the
 * JSON is missing/broken. /lucy-brand.json (public, served alongside the app)
 * overrides it — that file is the documented fork point. Set personaOverride to
 * fully replace Lucy's identity; leave it '' to keep the built-in Lucy persona.
 */
import { useEffect, useState } from 'react'

export interface BrandProfile {
  name: string            // "Lucy" — full display name
  shortName: string       // header wordmark (rendered uppercase)
  tagline: string         // "SoundChain AI"
  description: string     // meta description
  accent: string          // primary accent hex (theming seam — see note below)
  glow: string            // secondary glow hex
  backendUrl: string      // default cloud backend for a fork ('' = on-device only / use app default)
  personaOverride: string // '' = built-in Lucy persona; non-empty = full identity replacement
  links?: { label: string; url: string }[]
}

// The default brand = Lucy / SoundChain. personaOverride is '' so the carefully
// tuned built-in Lucy system prompt is used verbatim — zero regression.
export const DEFAULT_BRAND: BrandProfile = {
  name: 'Lucy',
  shortName: 'Lucy',
  tagline: 'SoundChain AI',
  description: "Lucy — a sovereign, on-device AI. Local-first chat, learns skills, runs offline. No cloud, no rug pull.",
  accent: '#22d3ee',
  glow: '#a855f7',
  backendUrl: '',
  personaOverride: '',
}

let cached: BrandProfile | null = null

/** Load the brand profile: DEFAULT_BRAND with /lucy-brand.json merged over it. */
export async function loadBrand(): Promise<BrandProfile> {
  if (cached) return cached
  if (typeof window === 'undefined') return DEFAULT_BRAND
  try {
    const url = process.env.NEXT_PUBLIC_LUCY_BRAND_URL || '/lucy-brand.json'
    const r = await fetch(url, { cache: 'no-cache' })
    if (r.ok) {
      const j = await r.json()
      cached = { ...DEFAULT_BRAND, ...j }
      return cached
    }
  } catch {/* missing / offline → default */}
  cached = DEFAULT_BRAND
  return cached
}

/** Hook: returns DEFAULT_BRAND immediately (no flash for the main app), then
 *  patches from /lucy-brand.json if a fork provides one. */
export function useLucyBrand(): BrandProfile {
  const [brand, setBrand] = useState<BrandProfile>(DEFAULT_BRAND)
  useEffect(() => {
    let alive = true
    loadBrand().then((b) => { if (alive) setBrand(b) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return brand
}
