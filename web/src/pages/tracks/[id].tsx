import { GetServerSideProps } from 'next'
import { ParsedUrlQuery } from 'querystring'
import Head from 'next/head'
import { config } from 'config'
import { createApolloClient } from 'lib/apollo'
import { TrackDocument, TrackQuery } from 'lib/graphql'

interface TrackPageParams extends ParsedUrlQuery {
  id: string
}

interface TrackPageProps {
  track: TrackQuery['track'] | null
  trackId: string
}

// Social media crawler user agents
const BOT_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'iMessageLinkPreview',
  'Googlebot',
  'bingbot',
]

function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false
  return BOT_USER_AGENTS.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()))
}

export const getServerSideProps: GetServerSideProps<TrackPageProps, TrackPageParams> = async context => {
  const trackId = context.params?.id
  const userAgent = context.req.headers['user-agent']

  if (!trackId) {
    return { notFound: true }
  }

  // For bots/crawlers, fetch track data and render OG tags
  if (isBot(userAgent)) {
    try {
      const apolloClient = createApolloClient(context)
      const { data } = await apolloClient.query({
        query: TrackDocument,
        variables: { id: trackId },
      })

      if (data?.track) {
        return {
          props: {
            track: data.track,
            trackId,
          },
        }
      }
    } catch (e) {
      console.error('Error fetching track for OG tags:', e)
    }

    // Fallback props if track fetch fails
    return {
      props: {
        track: null,
        trackId,
      },
    }
  }

  // For regular users, redirect to DEX
  return {
    redirect: {
      destination: `/dex/track/${trackId}`,
      permanent: false, // Use 302 so we can change this later
    },
  }
}

// Convert IPFS URLs to HTTP gateway URLs for social media crawlers
function getHttpImageUrl(url: string | null | undefined): string {
  if (!url) return `${config.domainUrl}/soundchain-meta-logo.png`

  // Handle ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '')
    return `https://dweb.link/ipfs/${cid}`
  }

  // Handle /ipfs/ paths
  if (url.startsWith('/ipfs/')) {
    return `https://dweb.link${url}`
  }

  // Handle gateway.pinata.cloud (might have CORS issues for crawlers)
  if (url.includes('gateway.pinata.cloud')) {
    const match = url.match(/\/ipfs\/([^/?]+)/)
    if (match) {
      return `https://dweb.link/ipfs/${match[1]}`
    }
  }

  // Already an HTTP URL
  return url
}

// This page renders OG tags for social media crawlers
export default function TrackPage({ track, trackId }: TrackPageProps) {
  const title = track
    ? `${track.title} by ${track.artist} | SoundChain`
    : 'Track | SoundChain'

  const description = track
    ? `Listen to ${track.title} by ${track.artist} on SoundChain - Web3 Music Platform`
    : 'Listen on SoundChain - Web3 Music Platform'

  const image = getHttpImageUrl(track?.artworkUrl)
  const url = `${config.domainUrl}/tracks/${trackId}`
  const embedUrl = `${config.domainUrl}/embed/track/${trackId}`
  const oEmbedUrl = `${config.domainUrl}/api/oembed?url=${encodeURIComponent(url)}`
  const hasPlayableMedia = !!track?.playbackUrl

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />

        {/* Open Graph - Basic */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content="SoundChain" />

        {/* Open Graph - Media Type */}
        {hasPlayableMedia ? (
          <>
            {/* Video/Audio type for playable content */}
            <meta property="og:type" content="video.other" />
            <meta property="og:video" content={embedUrl} />
            <meta property="og:video:secure_url" content={embedUrl} />
            <meta property="og:video:type" content="text/html" />
            <meta property="og:video:width" content="480" />
            <meta property="og:video:height" content="360" />
            <meta property="og:image" content={image} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="1200" />
          </>
        ) : (
          <>
            <meta property="og:type" content="music.song" />
            <meta property="og:image" content={image} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="1200" />
          </>
        )}

        {/* Twitter Card - Player Card for playable content */}
        {hasPlayableMedia ? (
          <>
            <meta name="twitter:card" content="player" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />
            <meta name="twitter:site" content="@SoundChainFM" />
            <meta name="twitter:player" content={embedUrl} />
            <meta name="twitter:player:width" content="480" />
            <meta name="twitter:player:height" content="360" />
          </>
        ) : (
          <>
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />
            <meta name="twitter:site" content="@SoundChainFM" />
          </>
        )}

        {/* oEmbed Discovery */}
        <link
          rel="alternate"
          type="application/json+oembed"
          href={oEmbedUrl}
          title={title}
        />

        {/* Music specific */}
        {track && (
          <>
            <meta property="music:musician" content={track.artist || ''} />
            <meta property="music:album" content={track.album || ''} />
          </>
        )}

        <link rel="canonical" href={url} />
      </Head>

      {/* Minimal page for crawlers - they just need the head tags */}
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center p-8">
          {track?.artworkUrl && (
            <img
              src={track.artworkUrl}
              alt={track.title || 'Track'}
              className="w-64 h-64 mx-auto rounded-lg shadow-lg mb-6"
            />
          )}
          <h1 className="text-2xl font-bold text-white mb-2">{track?.title || 'Track'}</h1>
          <p className="text-gray-400 mb-4">{track?.artist || 'Artist'}</p>
          <p className="text-cyan-400">Loading SoundChain...</p>
        </div>
      </div>
    </>
  )
}
