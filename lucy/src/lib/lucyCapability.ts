/**
 * lucyCapability — device capability detection + model recommendation.
 *
 * Frank's vision (Jun 7 2026): Lucy should look at the device and say "noticed
 * you're on a <device> — this can run a <bigger> brain." This is the engine for
 * the UPGRADABLE AI-OS: detect the REAL limits, map them to the biggest model
 * the device can run, and let new devices/models qualify over time via a remote
 * manifest (data, not code) — so a 2027 phone or a freshly-released model lights
 * up automatically with no app update.
 *
 * HONESTY (why we detect limits, not the chip name): browsers deliberately hide
 * the exact silicon for privacy — iOS Safari won't tell us "iPhone 17 Pro Max"
 * or even expose navigator.deviceMemory. What we CAN read is what actually
 * decides what runs: the WebGPU adapter's max buffer size (the true ceiling on
 * weight size), free storage, RAM (Android/desktop), GPU vendor/arch, and
 * mobile-vs-desktop. That's a better gate than a marketing name.
 *
 * THE PWA CEILING (load-bearing): on a phone the browser sandbox — not the chip
 * — caps usable model size at ~3B (iOS jetsam + WebGPU buffer limits). So even a
 * monster phone stays at the locked 3B floor IN THE BROWSER; bigger brains
 * (7B/8B/…/70B) unlock on capable desktops today and in the native/Electron
 * build (full RAM + Neural Engine) tomorrow. We never auto-pull a bigger model:
 * the recommendation is surfaced, the download stays an explicit user choice.
 */

export type Platform = 'ios' | 'ipados' | 'android' | 'mac' | 'windows' | 'linux' | 'chromeos' | 'unknown'

export interface DeviceCapability {
  platform: Platform
  isMobile: boolean
  deviceLabel: string            // best-effort human label ("Mac · Apple GPU", "iPhone (Safari)", …)
  deviceMemoryGB: number | null  // navigator.deviceMemory — Chrome/Android/desktop only (null on Safari)
  gpuVendor: string | null
  gpuArchitecture: string | null
  gpuMaxBufferGB: number | null  // adapter.limits.maxBufferSize — the REAL model-size ceiling
  hasF16: boolean                // WebGPU shader-f16 (false on iOS Safari → must use f32 weights)
  storageFreeGB: number | null   // navigator.storage.estimate: quota - usage
  webgpu: boolean
}

export interface ModelTier {
  id: string                     // WebLLM model id (must exist in prebuiltAppConfig.model_list)
  label: string                  // human label ("Lucy 8B · desktop")
  params: string                 // "3B" | "8B" | …
  approxGB: number               // download + resident footprint (rough)
  tier: 'baseline' | 'plus' | 'desktop' | 'workstation'
  needsF16?: boolean
  desktopOnly?: boolean          // never offered on mobile (browser ceiling)
  minDeviceMemoryGB?: number
  minGpuBufferGB?: number
  contextWindow?: number
  note?: string
}

export interface ModelManifest {
  version: number
  updated: string
  models: ModelTier[]
}

// The guaranteed-present baseline (matches useLucyLocal's hardcoded fallback).
// 3B is the locked phone floor (Frank, Jun 1: "3B minimum, never lower").
export const BASELINE_F16 = 'Llama-3.2-3B-Instruct-q4f16_1-MLC'
export const BASELINE_F32 = 'Llama-3.2-3B-Instruct-q4f32_1-MLC'

function inferPlatform(ua: string, uaData: any): Platform {
  const p = (uaData?.platform || '').toLowerCase()
  if (/iphone/i.test(ua)) return 'ios'
  if (/ipad/i.test(ua) || (/mac/i.test(ua) && (navigator as any).maxTouchPoints > 1)) return 'ipados'
  if (/android/i.test(ua) || p === 'android') return 'android'
  if (/cros/i.test(ua)) return 'chromeos'
  if (p.includes('mac') || /mac os x|macintosh/i.test(ua)) return 'mac'
  if (p.includes('win') || /windows/i.test(ua)) return 'windows'
  if (p.includes('linux') || /linux/i.test(ua)) return 'linux'
  return 'unknown'
}

function labelDevice(c: { platform: Platform; gpuArchitecture: string | null; gpuVendor: string | null }): string {
  const gpu = c.gpuArchitecture || c.gpuVendor || ''
  switch (c.platform) {
    case 'ios': return 'iPhone'
    case 'ipados': return 'iPad'
    case 'android': return 'Android device'
    case 'mac': return gpu ? `Mac · ${gpu}` : 'Mac'
    case 'windows': return gpu ? `Windows PC · ${gpu}` : 'Windows PC'
    case 'linux': return gpu ? `Linux · ${gpu}` : 'Linux'
    case 'chromeos': return 'Chromebook'
    default: return 'this device'
  }
}

/** Probe the device for the limits that actually gate on-device model size. */
export async function detectCapability(): Promise<DeviceCapability> {
  const empty: DeviceCapability = {
    platform: 'unknown', isMobile: false, deviceLabel: 'this device', deviceMemoryGB: null,
    gpuVendor: null, gpuArchitecture: null, gpuMaxBufferGB: null, hasF16: false, storageFreeGB: null, webgpu: false,
  }
  if (typeof navigator === 'undefined') return empty
  const ua = navigator.userAgent || ''
  const uaData = (navigator as any).userAgentData
  const platform = inferPlatform(ua, uaData)
  const isMobile = (typeof uaData?.mobile === 'boolean' ? uaData.mobile : /Mobi|Android|iPhone|iPod/i.test(ua)) || platform === 'ios' || platform === 'android'
  const deviceMemoryGB = typeof (navigator as any).deviceMemory === 'number' ? (navigator as any).deviceMemory : null

  let gpuVendor: string | null = null
  let gpuArchitecture: string | null = null
  let gpuMaxBufferGB: number | null = null
  let hasF16 = false
  let webgpu = false
  try {
    const adapter = await (navigator as any).gpu?.requestAdapter?.()
    if (adapter) {
      webgpu = true
      hasF16 = !!adapter.features?.has?.('shader-f16')
      const lim = adapter.limits
      const maxBuf = lim?.maxBufferSize || lim?.maxStorageBufferBindingSize || 0
      gpuMaxBufferGB = maxBuf ? +(maxBuf / 1e9).toFixed(2) : null
      let info: any = null
      try { info = await adapter.requestAdapterInfo?.() } catch {/* not all browsers */}
      info = info || (adapter as any).info
      gpuVendor = info?.vendor || null
      gpuArchitecture = info?.architecture || null
    }
  } catch {/* WebGPU absent → webgpu stays false */}

  let storageFreeGB: number | null = null
  try {
    const est = await (navigator as any).storage?.estimate?.()
    if (est && typeof est.quota === 'number') storageFreeGB = +(((est.quota || 0) - (est.usage || 0)) / 1e9).toFixed(1)
  } catch {/* best-effort */}

  const deviceLabel = labelDevice({ platform, gpuArchitecture, gpuVendor })
  return { platform, isMobile, deviceLabel, deviceMemoryGB, gpuVendor, gpuArchitecture, gpuMaxBufferGB, hasF16, storageFreeGB, webgpu }
}

/** Can this device actually run this model? `availableIds` = the ids WebLLM truly has. */
export function modelQualifies(m: ModelTier, cap: DeviceCapability, availableIds?: Set<string>): boolean {
  if (availableIds && !availableIds.has(m.id)) return false   // never offer a model WebLLM doesn't ship
  if (m.needsF16 && !cap.hasF16) return false
  if (m.desktopOnly && cap.isMobile) return false             // browser ceiling — desktop/native only
  if (typeof m.minDeviceMemoryGB === 'number' && cap.deviceMemoryGB != null && cap.deviceMemoryGB < m.minDeviceMemoryGB) return false
  if (typeof m.minGpuBufferGB === 'number' && cap.gpuMaxBufferGB != null && cap.gpuMaxBufferGB < m.minGpuBufferGB) return false
  if (typeof cap.storageFreeGB === 'number' && cap.storageFreeGB > 0 && cap.storageFreeGB < m.approxGB * 1.15) return false
  return true
}

/**
 * Pick the baseline (always-runs) model for this device, and the list of bigger
 * "upgrade" models it qualifies for. Baseline is NEVER below 3B; upgrades only
 * appear on capable non-mobile devices (or, later, the native build).
 */
export function recommendModels(
  manifest: ModelManifest | null,
  cap: DeviceCapability,
  availableIds?: Set<string>,
): { baseline: ModelTier | null; upgrades: ModelTier[] } {
  const f16ok = cap.hasF16
  const fallbackBaseline: ModelTier = {
    id: f16ok ? BASELINE_F16 : BASELINE_F32,
    label: 'Lucy 3B',
    params: '3B',
    approxGB: f16ok ? 2.3 : 3.0,
    tier: 'baseline',
    needsF16: f16ok,
    contextWindow: 1024,
  }
  if (!manifest?.models?.length) return { baseline: fallbackBaseline, upgrades: [] }

  const qualifying = manifest.models.filter((m) => modelQualifies(m, cap, availableIds))
  const baselines = qualifying.filter((m) => m.tier === 'baseline')
  // Prefer the f16 baseline where supported (smaller+faster), else f32.
  const baseline =
    baselines.find((m) => m.needsF16 && f16ok) ||
    baselines.find((m) => !m.needsF16) ||
    baselines[0] ||
    fallbackBaseline
  // Upgrades = qualifying non-baseline tiers, biggest first.
  const order = { baseline: 0, plus: 1, desktop: 2, workstation: 3 } as const
  const upgrades = qualifying
    .filter((m) => m.tier !== 'baseline')
    .sort((a, b) => (order[b.tier] - order[a.tier]) || (b.approxGB - a.approxGB))
  return { baseline, upgrades }
}

/** The friendly "noticed you're on a <device>…" announcement Lucy surfaces. */
export function describeDevice(
  cap: DeviceCapability,
  rec: { baseline: ModelTier | null; upgrades: ModelTier[] },
): { headline: string; detail: string; canUpgrade: boolean } {
  const best = rec.upgrades[0]
  const bufNote = cap.gpuMaxBufferGB ? ` (~${cap.gpuMaxBufferGB}GB GPU buffer)` : ''
  if (!cap.webgpu) {
    return {
      headline: `Noticed you're on ${cap.deviceLabel}.`,
      detail: 'This browser has no WebGPU, so on-device Lucy can’t run here yet. Try Safari 18+, Chrome, or Edge — or the desktop app.',
      canUpgrade: false,
    }
  }
  if (cap.isMobile) {
    return {
      headline: `Noticed you're on ${cap.deviceLabel}${bufNote}.`,
      detail: 'In the browser Lucy runs her 3B brain fully on-device — private, offline. Your chip may be capable of more, but the browser caps it here; the desktop app unlocks the bigger brains (up to 70B on the right hardware).',
      canUpgrade: false,
    }
  }
  if (best) {
    return {
      headline: `Noticed you're on ${cap.deviceLabel}${bufNote}.`,
      detail: `This can run Lucy's ${best.params} brain (${best.label}) fully on-device — want her at full strength? Her 3B runs instantly either way.`,
      canUpgrade: true,
    }
  }
  return {
    headline: `Noticed you're on ${cap.deviceLabel}${bufNote}.`,
    detail: 'Lucy runs her 3B brain fully on-device here — private and offline. Bigger brains unlock on higher-VRAM GPUs and in the desktop app.',
    canUpgrade: false,
  }
}
