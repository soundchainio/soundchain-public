/**
 * Display-mode detection — scales beyond TVs.
 *
 * Modes:
 *   'tv'        — Fire TV, Apple TV, Samsung/LG/Sony/Tizen/WebOS, PlayStation, Xbox, HbbTV,
 *                 Google TV, NVIDIA Shield, any browser reporting pointer:none.
 *   'projector' — Film/cinema projectors by UA (EPSON/BenQ/Optoma/ViewSonic) OR
 *                 cinema-scope aspect ratio (≥ 2.35:1 at ≥ 1920 wide).
 *   'vr'        — OculusBrowser, Quest, Pico, VIVE, Vision Pro.
 *   'kiosk'     — ChromeOS Kiosk, public-display Kiosk UA fragments.
 *   'standard'  — Desktop/laptop/tablet/phone default.
 *
 * Plus the user-side override (Avatar → Frames):
 *   localStorage.soundchain.displayModeOverride = 'auto' | 'mobile' | 'desktop' | 'tv'
 *                                               | 'projector' | 'vr' | 'kiosk'
 *
 *   The override always wins over auto-detection. `auto` clears it. Use cases:
 *   phone plugged into a projection room, tablet HDMI'd to a TV, venue laptop
 *   that needs to lock as "kiosk". The dropdown lives in the Avatar menu under
 *   "Frames" so any user can flip it from any page.
 *
 * The hook (useDisplayMode / legacy useTvMode) writes:
 *   <html data-display-mode="tv|projector|vr|kiosk|standard">
 *   <html data-tv="true">                 ← legacy compat for existing CSS; fires on tv OR projector
 *
 * AND — the reason this file exists beyond a detection enum — it *forces the
 * viewport meta to width=1920 on tv/projector* so Tailwind breakpoints (md:/lg:/xl:)
 * stop treating a 1920×1080 Fire Cube like a phone. Without that, every TV ships a
 * scaled-up mobile layout.
 */

export type DisplayMode = 'tv' | 'projector' | 'vr' | 'kiosk' | 'standard'
export type DisplayModeOverride = 'auto' | 'mobile' | 'desktop' | DisplayMode

export const DISPLAY_MODE_OVERRIDE_KEY = 'soundchain.displayModeOverride'
export const DISPLAY_MODE_OVERRIDE_EVENT = 'soundchain:displayModeOverrideChange'

const VALID_OVERRIDES: ReadonlyArray<DisplayModeOverride> = [
  'auto', 'mobile', 'desktop', 'tv', 'projector', 'vr', 'kiosk',
]

export const isValidOverride = (val: string | null | undefined): val is DisplayModeOverride =>
  !!val && (VALID_OVERRIDES as readonly string[]).includes(val)

/** Read the saved override from localStorage. Returns 'auto' (or null on SSR) when unset. */
export const getOverride = (): DisplayModeOverride | null => {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(DISPLAY_MODE_OVERRIDE_KEY)
    return isValidOverride(v) ? v : 'auto'
  } catch {
    return 'auto'
  }
}

/** Persist override + broadcast a custom event so the hook re-applies without reload. */
export const setOverride = (mode: DisplayModeOverride): void => {
  if (typeof window === 'undefined') return
  try {
    if (mode === 'auto') window.localStorage.removeItem(DISPLAY_MODE_OVERRIDE_KEY)
    else window.localStorage.setItem(DISPLAY_MODE_OVERRIDE_KEY, mode)
    window.dispatchEvent(new CustomEvent(DISPLAY_MODE_OVERRIDE_EVENT, { detail: { mode } }))
  } catch {
    /* localStorage disabled (Safari private mode, SSR) — no-op */
  }
}

export const clearOverride = (): void => setOverride('auto')

const TV_UA_PATTERNS = [
  /\bAFT[A-Z0-9]+\b/i,   // Fire TV / Fire Cube: AFTKA, AFTSS, AFTMM, AFTT, AFTB, etc.
  /\bSmart-?TV\b/i,
  /\bTizen\b/i,
  /\bWeb0S\b/i,
  /\bWebOS\b/i,
  /\bBRAVIA\b/i,         // Sony
  /\bPlayStation\b/i,
  /\bXbox\b/i,
  /\bHbbTV\b/i,
  /\bGoogle\s*TV\b/i,
  /\bNetCast\b/i,        // LG older
  /\bAppleTV\b/i,
  /\bShield\s*Android\s*TV\b/i,
] as const

const VR_UA_PATTERNS = [
  /\bOculusBrowser\b/i,
  /\bQuest\b/i,
  /\bPico\b/i,
  /\bVIVE\b/i,
  /\bVision\s*Pro\b/i,
] as const

const PROJECTOR_UA_PATTERNS = [
  /\bEPSON\b/i,
  /\bBenQ\b/i,
  /\bOptoma\b/i,
  /\bViewSonic\b/i,
  /\bProjector\b/i,
] as const

const KIOSK_UA_PATTERNS = [
  /\bKiosk\b/i,
  /ChromeOS.*Kiosk/i,
] as const

export const detectDisplayMode = (): DisplayMode => {
  if (typeof window === 'undefined') return 'standard'

  // User-side override beats auto-detection. Phone-into-projector use case.
  const override = getOverride()
  if (override && override !== 'auto') {
    if (override === 'mobile' || override === 'desktop') return 'standard'
    return override // tv | projector | vr | kiosk
  }

  const ua = window.navigator?.userAgent || ''

  // VR first — most specific identity, shouldn't be masked by anything else
  for (const p of VR_UA_PATTERNS) if (p.test(ua)) return 'vr'

  // Projector by UA
  for (const p of PROJECTOR_UA_PATTERNS) if (p.test(ua)) return 'projector'

  // Projector by cinema-scope aspect ratio (extended cinema / DCI)
  const screenW = window.screen?.width || 0
  const screenH = window.screen?.height || 1
  const aspect = screenW / screenH
  if (aspect >= 2.35 && screenW >= 1920) return 'projector'

  // Kiosk
  for (const p of KIOSK_UA_PATTERNS) if (p.test(ua)) return 'kiosk'

  // TV by UA
  for (const p of TV_UA_PATTERNS) if (p.test(ua)) return 'tv'

  // TV by capability fallback (d-pad browsers, 4K smart TVs with stripped UA)
  const pointerNone = window.matchMedia?.('(pointer: none)').matches === true
  const hoverNone = window.matchMedia?.('(hover: none)').matches === true
  const bigViewport = window.innerWidth >= 1920 && window.innerHeight >= 1080
  const bigScreen = screenW >= 1920 && screenH >= 1080

  if (pointerNone) return 'tv'
  if (hoverNone && (bigViewport || bigScreen)) return 'tv'

  return 'standard'
}

/** Returns true for tv OR projector — both are wide-landscape 10-foot surfaces. */
export const isLargeLandscape = (mode: DisplayMode): boolean =>
  mode === 'tv' || mode === 'projector'

/** Legacy boolean accessor. True for tv OR projector (both get the TV CSS block). */
export const detectTvMode = (): boolean => isLargeLandscape(detectDisplayMode())

export const TV_BODY_ATTR = 'tv'
export const DISPLAY_MODE_ATTR = 'display-mode'

/**
 * Viewport meta string for large-landscape surfaces.
 *
 * On Silk (Fire TV) and many smart TV browsers, the default `width=device-width`
 * viewport returns a narrow mobile-style viewport (~980px) even when the physical
 * display is 1920×1080+. That makes Tailwind's md:/lg:/xl: breakpoints never
 * trigger, so the whole site renders as a scaled-up phone. Forcing `width=1920`
 * tells the browser to lay out at desktop breakpoints; the browser then scales
 * the rendered page to fit the actual display.
 */
export const LARGE_LANDSCAPE_VIEWPORT =
  'width=1920, initial-scale=1.0, minimum-scale=0.5, maximum-scale=2.0, user-scalable=yes'

/** Forced "desktop" viewport when the user pins desktop frame on a smaller device. */
export const FORCED_DESKTOP_VIEWPORT =
  'width=1280, initial-scale=1.0, minimum-scale=0.5, maximum-scale=2.0, user-scalable=yes'

/**
 * Resolve the viewport meta string for a given mode + override pair.
 * Override has primacy; without one, mode controls (tv/projector → 1920, else mobile).
 */
export const resolveViewport = (mode: DisplayMode, override: DisplayModeOverride | null): string => {
  const STANDARD =
    'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
  if (override === 'desktop') return FORCED_DESKTOP_VIEWPORT
  if (override === 'mobile') return STANDARD
  if (isLargeLandscape(mode)) return LARGE_LANDSCAPE_VIEWPORT
  return STANDARD
}

/** Human-readable label for a mode override — used in UI and the reset pill. */
export const labelForOverride = (override: DisplayModeOverride): string => {
  switch (override) {
    case 'auto': return 'Auto'
    case 'mobile': return 'Mobile'
    case 'desktop': return 'Desktop'
    case 'tv': return 'TV'
    case 'projector': return 'Projector (Cinema)'
    case 'vr': return 'VR'
    case 'kiosk': return 'Kiosk'
    default: return 'Auto'
  }
}
