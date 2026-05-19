/**
 * Phase 16.63 — Platform + input detection for cross-device gym multiplayer.
 *
 * Detects WHAT device the user is on (Xbox / PlayStation / Switch / Mobile /
 * TV / Desktop) and WHAT input mode they're using (gamepad / touch / keyboard
 * / TV remote). Surfaces a platform badge in the HUD + lets game code adapt
 * control hints to the platform.
 *
 * All major game consoles ship a web browser:
 *   - Xbox Series X/S/One   → Edge (Chromium); UA contains "Xbox"
 *   - PlayStation 4/5       → WebKit; UA contains "PlayStation"
 *   - Nintendo Switch       → NetFront; UA contains "Nintendo Switch"
 * All speak WebRTC, navigator.getGamepads(), and the touch / pointer APIs
 * we already use — so cross-platform 1-on-1 + 5-on-5 is literally just a
 * matter of opening soundchain.io/gym in each device's browser and pairing
 * via room code (or deep-link).
 *
 * Decentralized angle: signaling can run through ANY mutual-knowledge channel
 * (our current Mongo-backed /api/gym/signal endpoint, Nostr relays, ENS, etc).
 * Once peers exchange SDP + ICE, all game state flows P2P — no central
 * game server. WebRTC's STUN traversal works through every console + mobile
 * carrier NAT in our tested matrix.
 */

export type Platform =
  | 'xbox'
  | 'playstation'
  | 'switch'
  | 'mobile-ios'
  | 'mobile-android'
  | 'mobile-other'
  | 'tv-firetv'
  | 'tv-tizen'
  | 'tv-webos'
  | 'tv-other'
  | 'desktop'
  | 'unknown'

export type InputMode =
  | 'gamepad'      // console + connected controller on desktop
  | 'touch'        // phone / tablet
  | 'tv-remote'    // smart TV d-pad
  | 'keyboard'     // desktop keyboard + mouse

export type PlatformInfo = {
  platform: Platform
  inputMode: InputMode
  label: string          // "Xbox", "PS5 browser", etc — for HUD badge
  emoji: string          // 🎮 🍎 📺 🖥
  hasGamepad: boolean    // navigator.getGamepads() returned at least one
  isConsole: boolean     // xbox / playstation / switch
  isTV: boolean          // smart TV / Fire TV / etc
  isMobile: boolean      // phone / tablet
  isDesktop: boolean     // regular browser
  controlHints: {
    shoot: string        // "🅰 button" on Xbox, "✕ button" on PS, "Tap 🏀" on touch
    move: string
    rebound: string
    block: string
    pass: string
    crossover: string
  }
}

const detectPlatformOnly = (ua: string): Platform => {
  // Console UAs are very specific — match those first.
  if (/Xbox/i.test(ua)) return 'xbox'
  if (/PlayStation/i.test(ua)) return 'playstation'
  if (/Nintendo Switch/i.test(ua)) return 'switch'
  // Smart TVs
  if (/AFTM|AFTB|AFTS|AFTT|Silk-Accelerated|AmazonWebAppPlatform/i.test(ua)) return 'tv-firetv'
  if (/Tizen/i.test(ua)) return 'tv-tizen'
  if (/Web0S|webOS/i.test(ua)) return 'tv-webos'
  if (/SmartTV|SMART-TV/i.test(ua)) return 'tv-other'
  // Mobile
  if (/iPhone|iPad|iPod/i.test(ua)) return 'mobile-ios'
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return 'mobile-android'
  if (/Android/i.test(ua)) return 'mobile-android'  // Android tablet
  if (/Mobile/i.test(ua)) return 'mobile-other'
  return 'desktop'
}

const platformToLabel = (p: Platform): { label: string; emoji: string } => {
  switch (p) {
    case 'xbox':           return { label: 'Xbox', emoji: '🎮' }
    case 'playstation':    return { label: 'PlayStation', emoji: '🎮' }
    case 'switch':         return { label: 'Switch', emoji: '🎮' }
    case 'mobile-ios':     return { label: 'iOS', emoji: '📱' }
    case 'mobile-android': return { label: 'Android', emoji: '📱' }
    case 'mobile-other':   return { label: 'Mobile', emoji: '📱' }
    case 'tv-firetv':      return { label: 'Fire TV', emoji: '📺' }
    case 'tv-tizen':       return { label: 'Samsung TV', emoji: '📺' }
    case 'tv-webos':       return { label: 'LG webOS', emoji: '📺' }
    case 'tv-other':       return { label: 'Smart TV', emoji: '📺' }
    case 'desktop':        return { label: 'Desktop', emoji: '🖥️' }
    default:               return { label: 'Web', emoji: '🌐' }
  }
}

const hasConnectedGamepad = (): boolean => {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return false
  try {
    const pads = navigator.getGamepads()
    for (const p of pads) if (p) return true
  } catch {}
  return false
}

const buildControlHints = (
  platform: Platform,
  inputMode: InputMode,
): PlatformInfo['controlHints'] => {
  if (platform === 'xbox') {
    return {
      shoot: '🅰 to shoot', move: 'Left stick', rebound: '🅱 rebound',
      block: '🅧 block', pass: '🅨 pass', crossover: 'LB crossover',
    }
  }
  if (platform === 'playstation') {
    return {
      shoot: '✕ to shoot', move: 'Left stick', rebound: '◯ rebound',
      block: '□ block', pass: '△ pass', crossover: 'L1 crossover',
    }
  }
  if (platform === 'switch') {
    return {
      shoot: 'B to shoot', move: 'L stick', rebound: 'A rebound',
      block: 'Y block', pass: 'X pass', crossover: 'L crossover',
    }
  }
  if (inputMode === 'touch') {
    return {
      shoot: 'Tap 🏀', move: 'D-pad', rebound: 'Tap REB',
      block: 'Tap BLK', pass: 'Tap PASS', crossover: 'Tap X-O',
    }
  }
  if (inputMode === 'tv-remote') {
    return {
      shoot: 'OK to shoot', move: 'D-pad', rebound: '↑↑',
      block: '←', pass: '→', crossover: '↓',
    }
  }
  // Desktop keyboard
  return {
    shoot: 'B to shoot', move: 'WASD', rebound: 'X rebound',
    block: 'Z block', pass: 'T pass', crossover: 'C crossover',
  }
}

export const detectPlatform = (): PlatformInfo => {
  if (typeof navigator === 'undefined') {
    return {
      platform: 'unknown',
      inputMode: 'keyboard',
      label: 'Server',
      emoji: '🌐',
      hasGamepad: false,
      isConsole: false, isTV: false, isMobile: false, isDesktop: false,
      controlHints: buildControlHints('unknown', 'keyboard'),
    }
  }
  const ua = navigator.userAgent || ''
  const platform = detectPlatformOnly(ua)
  const { label, emoji } = platformToLabel(platform)
  const hasGamepad = hasConnectedGamepad()
  const isConsole = platform === 'xbox' || platform === 'playstation' || platform === 'switch'
  const isTV = platform.startsWith('tv-')
  const isMobile = platform.startsWith('mobile-')
  const isDesktop = platform === 'desktop'
  // Input mode: consoles always use gamepad; TV uses remote; mobile uses touch;
  // desktop defaults to keyboard but flips to gamepad if a controller is connected.
  let inputMode: InputMode = 'keyboard'
  if (isConsole) inputMode = 'gamepad'
  else if (isTV) inputMode = 'tv-remote'
  else if (isMobile) inputMode = 'touch'
  else if (isDesktop && hasGamepad) inputMode = 'gamepad'
  return {
    platform, inputMode, label, emoji, hasGamepad,
    isConsole, isTV, isMobile, isDesktop,
    controlHints: buildControlHints(platform, inputMode),
  }
}

/**
 * Subscribe to gamepad connect/disconnect events. Returns an unsubscribe fn.
 * Useful for refreshing the platform badge when a user plugs in a controller
 * mid-session on desktop.
 */
export const onGamepadChange = (cb: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {}
  const fwd = () => cb()
  window.addEventListener('gamepadconnected', fwd)
  window.addEventListener('gamepaddisconnected', fwd)
  return () => {
    window.removeEventListener('gamepadconnected', fwd)
    window.removeEventListener('gamepaddisconnected', fwd)
  }
}
