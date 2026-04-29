/**
 * GET /api/display-info — agent introspection for which frame the site is rendering in.
 *
 * Returns BOTH server-side (UA-based) and client-side (must be passed via ?clientMode= +
 * ?clientWidth= + ?clientOverride=) signals so an automation can flag mismatches.
 *
 * Server-side detection mirrors `lib/tvMode.ts` UA patterns. Client values are echoed back
 * untouched so a Playwright/agent test can compare what it observed in the DOM vs what the
 * server thinks. Mismatch = forced override or aspect-ratio detection kicked in.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const TV_UA_PATTERNS: RegExp[] = [
  /\bAFT[A-Z0-9]+\b/i, /\bSmart-?TV\b/i, /\bTizen\b/i, /\bWeb0?S\b/i, /\bBRAVIA\b/i,
  /\bPlayStation\b/i, /\bXbox\b/i, /\bHbbTV\b/i, /\bGoogle\s*TV\b/i, /\bNetCast\b/i,
  /\bAppleTV\b/i, /\bShield\s*Android\s*TV\b/i,
]
const VR_UA_PATTERNS: RegExp[] = [/\bOculusBrowser\b/i, /\bQuest\b/i, /\bPico\b/i, /\bVIVE\b/i, /\bVision\s*Pro\b/i]
const PROJECTOR_UA_PATTERNS: RegExp[] = [/\bEPSON\b/i, /\bBenQ\b/i, /\bOptoma\b/i, /\bViewSonic\b/i, /\bProjector\b/i]
const KIOSK_UA_PATTERNS: RegExp[] = [/\bKiosk\b/i, /ChromeOS.*Kiosk/i]
const MOBILE_UA_PATTERNS: RegExp[] = [/iPhone/i, /Android.*Mobile/i, /Mobile Safari/i]

type ServerMode = 'tv' | 'projector' | 'vr' | 'kiosk' | 'mobile' | 'standard'

const detectFromUA = (ua: string): ServerMode => {
  for (const p of VR_UA_PATTERNS) if (p.test(ua)) return 'vr'
  for (const p of PROJECTOR_UA_PATTERNS) if (p.test(ua)) return 'projector'
  for (const p of KIOSK_UA_PATTERNS) if (p.test(ua)) return 'kiosk'
  for (const p of TV_UA_PATTERNS) if (p.test(ua)) return 'tv'
  for (const p of MOBILE_UA_PATTERNS) if (p.test(ua)) return 'mobile'
  return 'standard'
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const ua = (req.headers['user-agent'] as string) || ''
  const accept = (req.headers['accept'] as string) || ''
  const referer = (req.headers['referer'] as string) || ''

  const serverMode = detectFromUA(ua)
  const clientMode = typeof req.query.clientMode === 'string' ? req.query.clientMode : null
  const clientWidth = typeof req.query.clientWidth === 'string' ? parseInt(req.query.clientWidth, 10) : null
  const clientOverride = typeof req.query.clientOverride === 'string' ? req.query.clientOverride : null

  const mismatch =
    clientMode &&
    clientMode !== 'standard' &&
    serverMode !== clientMode &&
    !(serverMode === 'mobile' && clientMode === 'standard') // mobile UA → standard mode is normal

  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({
    server: {
      mode: serverMode,
      ua,
      acceptHeader: accept,
      referer,
    },
    client: {
      mode: clientMode,
      viewportWidth: clientWidth,
      override: clientOverride,
    },
    mismatch: !!mismatch,
    notes: mismatch
      ? 'Server UA + client viewport disagree — likely a forced override (clientOverride active) or aspect-ratio detection (cinema-scope screen).'
      : 'Server UA and client mode agree (or client did not pass introspection params).',
    helpForAgents: {
      htmlAttribute: 'document.documentElement.dataset.displayMode',
      overrideAttribute: 'document.documentElement.dataset.displayOverride',
      legacyTvAttribute: 'document.documentElement.dataset.tv',
      callExample: '/api/display-info?clientMode=tv&clientWidth=1920&clientOverride=auto',
    },
  })
}
