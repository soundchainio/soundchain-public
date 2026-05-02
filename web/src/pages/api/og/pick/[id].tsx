/**
 * /api/og/pick/[id] — paused OG thumbnail (May 2, 2026).
 *
 * Original 294-line dynamic matchup-card image is preserved in
 * /Users/soundchain/backup/arena-picks-takedown-2026-05-02/. Already-shared external
 * links (iMessage/X/Discord) keep rendering a clean preview instead of 404-ing —
 * just a "paused" thumbnail with the SoundChain Arena hologram lockup.
 */
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const contentType = 'image/png'

export default async function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #000000 0%, #0a0a1a 50%, #000000 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          padding: 80,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: '0.4em',
            marginBottom: 32,
            background: 'linear-gradient(90deg, #22d3ee, #a855f7, #ec4899)',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          SOUNDCHAIN ARENA
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 84,
            fontWeight: 900,
            lineHeight: 1.05,
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          Picks paused
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            color: '#9ca3af',
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.4,
            marginBottom: 40,
          }}
        >
          Fantasy leagues and friendly 1v1 challenges are still live for fun.
        </div>
        <div
          style={{
            display: 'flex',
            padding: '18px 44px',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #22d3ee, #a855f7, #ec4899)',
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: '0.18em',
          }}
        >
          OPEN ARENA →
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
