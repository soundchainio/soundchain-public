/**
 * /pick/[id] — Shareable pick landing page.
 *
 * Crawlers (iMessage, WhatsApp, X, Discord, Slack, FB) hit this URL and read the SSR-rendered
 * <Head> meta tags. The OG image is generated dynamically via /api/og/pick/[id]?...
 *
 * Browsers get a meta-refresh + client-side router push to /arena/picks?take=[id] so the user
 * lands on the actual take-flow UI with the pick pre-selected.
 *
 * Why a dedicated landing page (not just /arena/picks?take=...):
 *   - Clean shareable URL (no query soup in iMessage previews)
 *   - SSR meta tags are evaluated by every social crawler reliably
 *   - Cache-control on the OG image route means the preview renders instantly when shared
 */
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { config } from 'config'

interface PickMeta {
  id: string
  sport: string
  homeTeam: string
  awayTeam: string
  homeTeamFull: string
  awayTeamFull: string
  homeLogo: string
  awayLogo: string
  creatorHandle: string
  creatorPick: 'home' | 'away'
  takerHandle: string | null
  entryToken: string
  entryFee: number
  pot: number
  status: string
}

interface Props {
  pick: PickMeta | null
  origin: string
}

export default function PickSharePage({ pick, origin }: Props) {
  const router = useRouter()

  useEffect(() => {
    if (!pick) return
    const t = setTimeout(() => {
      router.replace(`/arena/picks?take=${pick.id}`)
    }, 50)
    return () => clearTimeout(t)
  }, [pick, router])

  if (!pick) {
    return (
      <>
        <Head>
          <title>Pick not found · SoundChain Arena</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div style={{ minHeight: '100vh', background: 'black', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 32, marginBottom: 12 }}>Pick not found</h1>
            <p style={{ color: '#9ca3af', marginBottom: 20 }}>This pick may have been canceled or never existed.</p>
            <a href="/arena/picks" style={{ color: '#22d3ee', textDecoration: 'underline' }}>Browse open picks →</a>
          </div>
        </div>
      </>
    )
  }

  const tokenLabel = pick.entryToken === 'MATIC' ? 'POL' : pick.entryToken
  const creatorTeamFull = pick.creatorPick === 'home' ? pick.homeTeamFull : pick.awayTeamFull
  const takerTeamFull = pick.creatorPick === 'home' ? pick.awayTeamFull : pick.homeTeamFull

  const title = pick.takerHandle
    ? `@${pick.creatorHandle} (${creatorTeamFull}) vs @${pick.takerHandle} (${takerTeamFull}) · ${pick.pot} ${tokenLabel} pot`
    : `@${pick.creatorHandle} picked ${creatorTeamFull} · take ${takerTeamFull} for ${pick.entryFee} ${tokenLabel}`

  const description = pick.status === 'open'
    ? `Open pick on SoundChain Arena. Stake ${pick.entryFee} ${tokenLabel} to take ${takerTeamFull} and win ${pick.pot} ${tokenLabel}.`
    : pick.status === 'matched'
    ? `Locked-in matchup on SoundChain Arena. ${pick.pot} ${tokenLabel} on the line.`
    : pick.status === 'settled'
    ? `Settled pick on SoundChain Arena. ${pick.pot} ${tokenLabel} pot.`
    : `${creatorTeamFull} vs ${takerTeamFull} on SoundChain Arena.`

  const ogParams = new URLSearchParams({
    home: pick.homeTeam,
    away: pick.awayTeam,
    homeLogo: pick.homeLogo || '',
    awayLogo: pick.awayLogo || '',
    fee: String(pick.entryFee),
    token: tokenLabel,
    pot: String(pick.pot),
    status: pick.status,
    creator: pick.creatorHandle,
    taker: pick.takerHandle || '',
    pick: pick.creatorPick,
    sport: pick.sport,
  })
  const ogImageUrl = `${origin}/api/og/pick/${pick.id}?${ogParams.toString()}`
  const canonicalUrl = `${origin}/pick/${pick.id}`
  const takeUrl = `${origin}/arena/picks?take=${pick.id}`

  return (
    <>
      <Head>
        <title>{title} · SoundChain Arena</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SoundChain Arena" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={title} />

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImageUrl} />

        {/* Crawlers don't follow the JS redirect; meta-refresh covers anything that respects it */}
        <meta httpEquiv="refresh" content={`0;url=${takeUrl}`} />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #000000 0%, #0a0a1a 50%, #000000 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: 24 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: '0.3em',
            marginBottom: 24,
            background: 'linear-gradient(90deg, #22d3ee, #a855f7, #ec4899)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}>
            SOUNDCHAIN ARENA
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 16 }}>{title}</h1>
          <p style={{ color: '#9ca3af', fontSize: 15, marginBottom: 28, lineHeight: 1.5 }}>{description}</p>
          <a
            href={takeUrl}
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              borderRadius: 999,
              background: 'linear-gradient(90deg, #22d3ee, #a855f7, #ec4899)',
              color: 'white',
              fontWeight: 900,
              letterSpacing: '0.15em',
              textDecoration: 'none',
              boxShadow: '0 0 32px rgba(168,85,247,0.4)',
            }}
          >
            OPEN IN ARENA →
          </a>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, params }) => {
  const id = params?.id as string
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'soundchain.io'
  const origin = config.domainUrl || `${proto}://${host}`

  let pick: PickMeta | null = null
  try {
    if (id && /^[a-f\d]{24}$/i.test(id)) {
      const client = await clientPromise
      const db = client.db('soundchain')
      const doc = await db.collection('gamepicks').findOne({ _id: new ObjectId(id) })
      if (doc) {
        pick = {
          id: doc._id.toString(),
          sport: doc.sport || '',
          homeTeam: doc.homeTeam || '',
          awayTeam: doc.awayTeam || '',
          homeTeamFull: doc.homeTeamFull || doc.homeTeam || '',
          awayTeamFull: doc.awayTeamFull || doc.awayTeam || '',
          homeLogo: doc.homeLogo || '',
          awayLogo: doc.awayLogo || '',
          creatorHandle: doc.creatorHandle || '',
          creatorPick: doc.creatorPick === 'away' ? 'away' : 'home',
          takerHandle: doc.takerHandle || null,
          entryToken: doc.entryToken || 'POL',
          entryFee: Number(doc.entryFee) || 0,
          pot: Number(doc.pot) || 0,
          status: doc.status || 'open',
        }
      }
    }
  } catch (err) {
    console.error('[pick/[id]] failed to load pick:', err)
  }

  return { props: { pick, origin } }
}
