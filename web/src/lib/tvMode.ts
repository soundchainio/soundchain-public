/**
 * TV-mode detection
 *
 * Browsers on living-room devices (Fire TV Cube, Apple TV via AirPlay to a Smart
 * TV app, Samsung/LG/Sony WebOS/Tizen, PlayStation/Xbox browsers, etc.) all
 * leak distinctive signals. We combine three weak signals into one confident
 * boolean, then expose it as `data-tv="true"` on <html> so CSS can branch.
 *
 * Signals (strongest first):
 *   1. User-Agent substring — Amazon Silk (AFT*), SmartTV, Tizen, Web0S, BRAVIA,
 *      PlayStation, Xbox, HbbTV. Any match = definitely TV.
 *   2. `pointer: none` media query — Fire TV remote, game-controller browsers.
 *      No touch + no mouse = almost certainly TV d-pad.
 *   3. Large viewport (>= 1920×1080) combined with `hover: none` — modern 4K
 *      smart TVs report their output resolution, not a scaled CSS viewport.
 *
 * Ship confidence: 1 alone = YES. 2 + 3 combined = YES. Either alone = NO.
 */

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

export const detectTvMode = (): boolean => {
  if (typeof window === 'undefined') return false

  const ua = window.navigator?.userAgent || ''
  for (const pattern of TV_UA_PATTERNS) {
    if (pattern.test(ua)) return true
  }

  const pointerNone = window.matchMedia?.('(pointer: none)').matches === true
  const hoverNone = window.matchMedia?.('(hover: none)').matches === true
  const bigViewport = window.innerWidth >= 1920 && window.innerHeight >= 1080

  // d-pad browsers report pointer:none — rock-solid TV signal on its own
  if (pointerNone) return true

  // 1080p+ viewport with no hover capability = smart TV rendering at native res
  if (hoverNone && bigViewport) return true

  return false
}

export const TV_BODY_ATTR = 'tv'
