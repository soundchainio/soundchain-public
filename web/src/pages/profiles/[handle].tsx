import { GetServerSideProps } from 'next'
import { ParsedUrlQuery } from 'querystring'
import Head from 'next/head'
import { config } from 'config'
import { createApolloClient } from 'lib/apollo'
import { ProfileByHandleDocument, ProfileByHandleQuery } from 'lib/graphql'

interface ProfilePageParams extends ParsedUrlQuery {
  handle: string
}

interface ProfilePageProps {
  profile: ProfileByHandleQuery['profileByHandle'] | null
  handle: string
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
  'Applebot',
]

function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false
  return BOT_USER_AGENTS.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()))
}

export const getServerSideProps: GetServerSideProps<ProfilePageProps, ProfilePageParams> = async context => {
  const handle = context.params?.handle
  const userAgent = context.req.headers['user-agent']

  if (!handle) {
    return { notFound: true }
  }

  // For bots/crawlers, fetch profile data and render OG tags
  if (isBot(userAgent)) {
    try {
      const apolloClient = createApolloClient(context)
      const { data } = await apolloClient.query({
        query: ProfileByHandleDocument,
        variables: { handle },
      })

      if (data?.profileByHandle) {
        return {
          props: {
            profile: data.profileByHandle,
            handle,
          },
        }
      }
    } catch (e) {
      console.error('Error fetching profile for OG tags:', e)
    }

    // Fallback props if profile fetch fails
    return {
      props: {
        profile: null,
        handle,
      },
    }
  }

  // For regular users, redirect to DEX
  return {
    redirect: {
      destination: `/dex/users/${handle}`,
      permanent: true, // 301 redirect - SEO friendly
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

// Detect media type from URL extension
function getMediaType(url: string | null | undefined): { type: 'image' | 'video' | 'gif', mimeType: string } {
  if (!url) return { type: 'image', mimeType: 'image/png' }

  const lowerUrl = url.toLowerCase()

  if (lowerUrl.endsWith('.gif')) {
    return { type: 'gif', mimeType: 'image/gif' }
  }
  if (lowerUrl.endsWith('.mp4')) {
    return { type: 'video', mimeType: 'video/mp4' }
  }
  if (lowerUrl.endsWith('.mov')) {
    return { type: 'video', mimeType: 'video/quicktime' }
  }
  if (lowerUrl.endsWith('.webm')) {
    return { type: 'video', mimeType: 'video/webm' }
  }
  if (lowerUrl.endsWith('.png')) {
    return { type: 'image', mimeType: 'image/png' }
  }
  if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) {
    return { type: 'image', mimeType: 'image/jpeg' }
  }
  if (lowerUrl.endsWith('.webp')) {
    return { type: 'image', mimeType: 'image/webp' }
  }

  // Default to image
  return { type: 'image', mimeType: 'image/jpeg' }
}

// This page renders OG tags for social media crawlers
export default function ProfilePage({ profile, handle }: ProfilePageProps) {
  const displayName = profile?.displayName || profile?.userHandle || handle
  const title = `${displayName} | SoundChain`
  const description = profile?.bio || `Follow ${displayName} on SoundChain - Web3 Music Platform`
  const imageUrl = profile?.profilePicture || profile?.coverPicture
  const image = getHttpImageUrl(imageUrl)
  const { type: mediaType, mimeType } = getMediaType(imageUrl)
  const url = `${config.domainUrl}/profiles/${handle}`
  const oEmbedUrl = `${config.domainUrl}/api/oembed?url=${encodeURIComponent(url)}`

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
        <meta property="og:type" content="profile" />

        {/* Media tags - handle image, gif, and video formats */}
        {mediaType === 'video' ? (
          <>
            {/* Video content (mp4, mov, webm) */}
            <meta property="og:video" content={image} />
            <meta property="og:video:type" content={mimeType} />
            <meta property="og:video:width" content="1200" />
            <meta property="og:video:height" content="1200" />
            {/* Fallback image for platforms that don't support video */}
            <meta property="og:image" content={image} />
          </>
        ) : (
          <>
            {/* Image content (png, jpg, gif, webp) */}
            <meta property="og:image" content={image} />
            <meta property="og:image:type" content={mimeType} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="1200" />
          </>
        )}

        {/* Twitter Card - supports gif and video natively */}
        <meta name="twitter:card" content={mediaType === 'video' ? 'player' : 'summary_large_image'} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {mediaType === 'video' ? (
          <>
            <meta name="twitter:player" content={image} />
            <meta name="twitter:player:width" content="480" />
            <meta name="twitter:player:height" content="480" />
          </>
        ) : (
          <meta name="twitter:image" content={image} />
        )}
        <meta name="twitter:site" content="@SoundChainFM" />

        {/* oEmbed Discovery */}
        <link
          rel="alternate"
          type="application/json+oembed"
          href={oEmbedUrl}
          title={title}
        />

        <link rel="canonical" href={url} />
      </Head>

      {/* Minimal page for crawlers - they just need the head tags */}
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center p-8">
          {image && mediaType === 'video' ? (
            <video
              src={image}
              autoPlay
              loop
              muted
              playsInline
              className="w-64 h-64 mx-auto rounded-full shadow-lg mb-6 object-cover"
            />
          ) : image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={displayName}
              className="w-64 h-64 mx-auto rounded-full shadow-lg mb-6 object-cover"
            />
          ) : null}
          <h1 className="text-2xl font-bold text-white mb-2">{displayName}</h1>
          {profile?.bio && <p className="text-gray-400 mb-4 max-w-md mx-auto">{profile.bio}</p>}
          <p className="text-cyan-400">Loading SoundChain...</p>
        </div>
      </div>
    </>
  )
}

// Enable full SSR for this page (bypasses client-only providers for OG tags)
ProfilePage.ssrOnly = true
