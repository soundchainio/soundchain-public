/**
 * Dynamic OG image for Arena picks — renders on Edge.
 *
 * Pure cosmetic: takes pick metadata via query params (set by /pick/[id] getServerSideProps)
 * and returns a 1200x630 PNG-style image so iMessage/WhatsApp/X/Discord show a dope
 * matchup card preview when the share link is sent externally.
 *
 * URL: /api/og/pick/[id]?home=ATL&away=NYK&homeLogo=...&awayLogo=...&fee=10&token=OGUN&pot=20&status=open&creator=furda&taker=&pick=home
 */
import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'
export const contentType = 'image/png'

export default async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const home = searchParams.get('home') || 'HOME'
  const away = searchParams.get('away') || 'AWAY'
  const homeLogo = searchParams.get('homeLogo') || ''
  const awayLogo = searchParams.get('awayLogo') || ''
  const fee = searchParams.get('fee') || '0'
  const token = searchParams.get('token') || 'POL'
  const pot = searchParams.get('pot') || '0'
  const status = (searchParams.get('status') || 'open').toLowerCase()
  const creator = searchParams.get('creator') || ''
  const taker = searchParams.get('taker') || ''
  const creatorPick = searchParams.get('pick') || 'home'
  const sport = (searchParams.get('sport') || '').toUpperCase()

  const tokenLabel = token === 'MATIC' ? 'POL' : token

  const statusLabel =
    status === 'live' ? 'LIVE' :
    status === 'matched' ? 'LOCKED IN' :
    status === 'settled' ? 'FINAL' :
    status === 'pending_deposit' ? 'AWAITING STAKE' : 'OPEN PICK'

  const statusColor =
    status === 'live' ? '#ef4444' :
    status === 'matched' ? '#f59e0b' :
    status === 'settled' ? '#eab308' :
    status === 'pending_deposit' ? '#a855f7' : '#22d3ee'

  const creatorIsHome = creatorPick === 'home'
  const creatorTeam = creatorIsHome ? home : away
  const takerTeam = creatorIsHome ? away : home
  const creatorLogo = creatorIsHome ? homeLogo : awayLogo
  const takerLogo = creatorIsHome ? awayLogo : homeLogo

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #000000 0%, #0a0a1a 50%, #000000 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Mesh background accent */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-100px',
          left: '-100px',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(34,211,238,0.25) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Header bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '32px 56px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              fontSize: '28px',
              fontWeight: 900,
              letterSpacing: '0.2em',
              background: 'linear-gradient(90deg, #22d3ee, #a855f7, #ec4899)',
              backgroundClip: 'text',
              color: 'transparent',
              display: 'flex',
            }}>
              SOUNDCHAIN ARENA
            </div>
            {sport && (
              <div style={{
                fontSize: '18px',
                color: '#9ca3af',
                fontWeight: 700,
                letterSpacing: '0.15em',
                display: 'flex',
              }}>
                · {sport}
              </div>
            )}
          </div>
          <div style={{
            padding: '10px 22px',
            borderRadius: '999px',
            background: `${statusColor}22`,
            border: `1px solid ${statusColor}66`,
            color: statusColor,
            fontWeight: 900,
            fontSize: '20px',
            letterSpacing: '0.15em',
            display: 'flex',
          }}>
            {statusLabel}
          </div>
        </div>

        {/* Main matchup */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 64px',
          zIndex: 1,
        }}>
          {/* Creator side */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            {creatorLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creatorLogo} alt={creatorTeam} width={180} height={180} style={{ objectFit: 'contain' }} />
            ) : (
              <div style={{
                width: '180px',
                height: '180px',
                borderRadius: '999px',
                background: 'rgba(34,211,238,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '80px',
                fontWeight: 900,
                color: '#22d3ee',
              }}>
                {creatorTeam.charAt(0)}
              </div>
            )}
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#22d3ee', marginTop: '20px', display: 'flex' }}>
              @{creator}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#9ca3af',
              fontWeight: 700,
              letterSpacing: '0.2em',
              marginTop: '6px',
              display: 'flex',
            }}>
              PICKED · {creatorTeam}
            </div>
          </div>

          {/* VS / Pot */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 32px' }}>
            <div style={{
              fontSize: '88px',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #22d3ee, #a855f7, #ec4899)',
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '0.05em',
              lineHeight: 1,
              display: 'flex',
            }}>
              VS
            </div>
            <div style={{
              marginTop: '20px',
              padding: '14px 28px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: '14px', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.2em', display: 'flex' }}>
                POT
              </div>
              <div style={{ fontSize: '40px', fontWeight: 900, color: 'white', marginTop: '4px', display: 'flex' }}>
                {pot} {tokenLabel}
              </div>
            </div>
          </div>

          {/* Taker side */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            {takerLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={takerLogo}
                alt={takerTeam}
                width={180}
                height={180}
                style={{ objectFit: 'contain', opacity: taker ? 1 : 0.4 }}
              />
            ) : (
              <div style={{
                width: '180px',
                height: '180px',
                borderRadius: '999px',
                background: taker ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '80px',
                fontWeight: 900,
                color: taker ? '#a855f7' : '#4b5563',
              }}>
                {taker ? takerTeam.charAt(0) : '?'}
              </div>
            )}
            <div style={{
              fontSize: '32px',
              fontWeight: 900,
              color: taker ? '#a855f7' : '#6b7280',
              marginTop: '20px',
              display: 'flex',
            }}>
              {taker ? `@${taker}` : 'YOU?'}
            </div>
            <div style={{
              fontSize: '14px',
              color: taker ? '#9ca3af' : '#22d3ee',
              fontWeight: 700,
              letterSpacing: '0.2em',
              marginTop: '6px',
              display: 'flex',
            }}>
              {taker ? `PICKED · ${takerTeam}` : `TAKE · ${takerTeam}`}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{
          padding: '24px 56px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1,
        }}>
          <div style={{ fontSize: '20px', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.1em', display: 'flex' }}>
            STAKE: {fee} {tokenLabel}
          </div>
          <div style={{
            fontSize: '22px',
            fontWeight: 900,
            background: 'linear-gradient(90deg, #22d3ee, #a855f7, #ec4899)',
            backgroundClip: 'text',
            color: 'transparent',
            letterSpacing: '0.15em',
            display: 'flex',
          }}>
            {status === 'open' ? 'TAP TO TAKE THIS PICK →' : 'VIEW ON SOUNDCHAIN →'}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      },
    },
  )
}
