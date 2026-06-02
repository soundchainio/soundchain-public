import { GetServerSideProps } from 'next'
import { ParsedUrlQuery } from 'querystring'
import Head from 'next/head'
import { config } from 'config'
import { buildPostOgMeta, PostOgMetadata } from 'lib/og/buildPostOg'
import { BottomSheet } from 'components/BottomSheet'
import { Comments } from 'components/Comment/Comments'
import { InboxButton } from 'components/common/Buttons/InboxButton'
import { NewCommentForm } from 'components/NewCommentForm'
import { NotAvailableMessage } from 'components/NotAvailableMessage'
import { Post } from 'components/Post/Post'
import { TopNavBarProps } from 'components/TopNavBar'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { PostQuery } from 'lib/graphql'
import { usePost as usePostQuery } from 'hooks/usePostDirect'  // Phase 7e — Vercel-direct
import { useEffect, useMemo } from 'react'

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
  'applebot',
  'Pinterest',
  'Snapchat',
]

function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false
  return BOT_USER_AGENTS.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()))
}

// Extract YouTube video ID and generate thumbnail
function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (match && match[1]) {
    return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`
  }
  return null
}

// Extract Vimeo thumbnail (basic - uses video ID)
function getVimeoThumbnail(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (match && match[1]) {
    // Vimeo thumbnails require API call, but we can use a placeholder format
    return `https://vumbnail.com/${match[1]}.jpg`
  }
  return null
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

// OG metadata computed server-side for bots — full structured shape lives in
// lib/og/buildPostOg.ts (PostOgMetadata) so every embed type gets rich/playable tags.
type OgMetadata = PostOgMetadata

export interface PostPageProps {
  post: PostQuery['post'] | null
  postId: string
  isBot: boolean
  ogData?: OgMetadata // Pre-computed for bots
}

interface PostPageParams extends ParsedUrlQuery {
  id: string
}

export const getServerSideProps: GetServerSideProps<PostPageProps, PostPageParams> = async context => {
  const postId = context.params?.id
  const userAgent = context.req.headers['user-agent']
  const isBotRequest = isBot(userAgent)

  if (!postId) {
    return { notFound: true }
  }

  try {
    // Humans are redirected to the modern /dex/post view regardless of post
    // contents — do that BEFORE any data fetch so we never block on the DB.
    if (!isBotRequest) {
      // Clean URL: /post/:id is rewritten to /dex/post/:id in next.config — same
      // view, but the user never SEES /dex. (Frank, Jun 1 2026.)
      return {
        redirect: { destination: `/post/${postId}`, permanent: false },
      }
    }

    // (Frank, Jun 1-2 2026 — rich/PLAYABLE share cards) Build OG/Twitter/JSON-LD
    // from MONGO directly (api.soundchain.io is dead). buildPostOgMeta covers EVERY
    // supported embed type: X + uploaded video play INLINE in the bubble (og:video
    // mp4 via the same-origin range proxy); YouTube/Vimeo/TikTok/Twitch/Spotify/
    // SoundCloud/Bandcamp/Facebook/Instagram get provider players + real thumbnails;
    // tracks/NFTs/uploaded audio get cover-art audio cards; Discord gets a server
    // card; and nothing falls back to a bare logo. It never throws (degrades to a
    // generic card) so the preview is always valid.
    const ORIGIN = config.domainUrl || 'https://soundchain.io'
    let ogData: any
    try {
      const { default: clientPromise } = await import('lib/mongodb')
      const client = await clientPromise
      const db = client.db('soundchain')
      ogData = await buildPostOgMeta(db, postId, ORIGIN)
    } catch (dbErr) {
      console.error('[posts/[id]] OG build failed:', (dbErr as any)?.message)
      ogData = {
        title: 'Post | SoundChain',
        description: 'Check out this post on SoundChain',
        image: `${ORIGIN}/soundchain-meta-logo.png`,
        url: `${ORIGIN}/posts/${postId}`,
        siteName: 'SoundChain',
        ogType: 'article',
        cardType: 'summary_large_image',
        inlinePlayable: 'image-only',
      }
    }
    // CDN-cache the preview hard — one provider fetch per post per region per day.
    // Critical for rate-limited providers (Discord). Humans redirect above, so a
    // day-stale OG card never affects the live app.
    context.res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')

    return {
      props: {
        post: null,
        postId,
        isBot: true,
        ogData,
      },
    }
  } catch (e) {
    console.error('Error fetching post:', e)

    // For bots, return minimal page even on error
    if (isBotRequest) {
      return {
        props: {
          post: null,
          postId,
          isBot: true,
          ogData: {
            title: 'Post | SoundChain',
            description: 'Check out this post on SoundChain',
            image: `${config.domainUrl || 'https://soundchain.io'}/soundchain-meta-logo.png`,
            url: `${config.domainUrl || 'https://soundchain.io'}/posts/${postId}`,
            siteName: 'SoundChain',
            ogType: 'article',
            cardType: 'summary_large_image',
            inlinePlayable: 'image-only',
          },
        },
      }
    }

    return { notFound: true }
  }
}

export default function PostPage({ post, postId, isBot: isBotRequest, ogData }: PostPageProps) {
  // For bots, render minimal page with OG tags immediately - no hooks needed
  if (isBotRequest && ogData) {
    return (
      <>
        <Head>
          <title>{ogData.title}</title>
          <meta name="description" content={ogData.description} />
          {/* Core OG — every card */}
          <meta property="og:title" content={ogData.title} />
          <meta property="og:description" content={ogData.description} />
          <meta property="og:image" content={ogData.image} />
          {ogData.imageType && <meta property="og:image:type" content={ogData.imageType} />}
          {ogData.imageWidth && <meta property="og:image:width" content={String(ogData.imageWidth)} />}
          {ogData.imageHeight && <meta property="og:image:height" content={String(ogData.imageHeight)} />}
          <meta property="og:url" content={ogData.url} />
          <meta property="og:type" content={ogData.ogType || 'article'} />
          <meta property="og:site_name" content={ogData.siteName || 'SoundChain'} />
          {/* Inline-playable MP4 (X video, uploaded video) → plays IN the bubble on iMessage/WhatsApp/Telegram */}
          {ogData.videoMp4 && (
            <>
              <meta property="og:video" content={ogData.videoMp4.url} />
              <meta property="og:video:secure_url" content={ogData.videoMp4.url} />
              <meta property="og:video:type" content="video/mp4" />
              <meta property="og:video:width" content={String(ogData.videoMp4.width)} />
              <meta property="og:video:height" content={String(ogData.videoMp4.height)} />
            </>
          )}
          {/* Provider iframe player (YouTube/Vimeo/TikTok/etc.) — embed surfaces */}
          {!ogData.videoMp4 && ogData.videoEmbed && (
            <>
              <meta property="og:video" content={ogData.videoEmbed.url} />
              <meta property="og:video:secure_url" content={ogData.videoEmbed.url} />
              <meta property="og:video:type" content="text/html" />
              <meta property="og:video:width" content={String(ogData.videoEmbed.width)} />
              <meta property="og:video:height" content={String(ogData.videoEmbed.height)} />
            </>
          )}
          {/* Direct audio stream (tracks/uploaded audio with a progressive mp3/m4a) */}
          {ogData.audio && (
            <>
              <meta property="og:audio" content={ogData.audio.url} />
              <meta property="og:audio:secure_url" content={ogData.audio.url} />
              <meta property="og:audio:type" content={ogData.audio.type} />
            </>
          )}
          {/* Twitter card — player when we have an inline player, else large image */}
          <meta name="twitter:card" content={ogData.player ? 'player' : 'summary_large_image'} />
          <meta name="twitter:title" content={ogData.title} />
          <meta name="twitter:description" content={ogData.description} />
          <meta name="twitter:image" content={ogData.image} />
          <meta name="twitter:site" content="@SoundChainFM" />
          {ogData.player && (
            <>
              <meta name="twitter:player" content={ogData.player.url} />
              <meta name="twitter:player:width" content={String(ogData.player.width)} />
              <meta name="twitter:player:height" content={String(ogData.player.height)} />
              {ogData.player.stream && <meta name="twitter:player:stream" content={ogData.player.stream} />}
            </>
          )}
          {/* JSON-LD — the layer AI wearables / agents / Apple Intelligence parse */}
          {(ogData.videoMp4 || ogData.videoEmbed) && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'VideoObject',
                  name: ogData.title,
                  description: ogData.description,
                  thumbnailUrl: [ogData.image],
                  uploadDate: ogData.uploadDate || undefined,
                  contentUrl: ogData.videoMp4?.url || undefined,
                  embedUrl: ogData.videoEmbed?.url || ogData.player?.url || undefined,
                  publisher: { '@type': 'Organization', name: 'SoundChain' },
                  ...(ogData.authorName ? { author: { '@type': 'Person', name: ogData.authorName } } : {}),
                }),
              }}
            />
          )}
          {ogData.audio && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'MusicRecording',
                  name: ogData.title,
                  image: ogData.image,
                  uploadDate: ogData.uploadDate || undefined,
                  audio: { '@type': 'AudioObject', contentUrl: ogData.audio.url, encodingFormat: ogData.audio.type },
                  ...(ogData.authorName ? { byArtist: { '@type': 'MusicGroup', name: ogData.authorName } } : {}),
                }),
              }}
            />
          )}
          <link rel="canonical" href={ogData.url} />
          <link rel="alternate" type="application/json+oembed" href={`${ogData.url.replace(/\/posts\/.*/, '')}/api/oembed?url=${encodeURIComponent(ogData.url)}`} title={ogData.title} />
        </Head>
        {/* This bot HTML is CDN-cached + served to humans too (the cache key has no
            Vary:User-Agent). So when someone TAPS a shared card, the in-app browser
            lands here — bounce real browsers to the playable post. Crawlers don't run
            JS, so they keep reading the OG tags above and the card is unaffected.
            (Fixes the dead "black title" page on tapping a YouTube/Spotify card.) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var b=/bot|crawl|spider|facebookexternalhit|Twitterbot|Slackbot|TelegramBot|Discordbot|WhatsApp|LinkedInBot|Embedly|Pinterest|Snapchat|Googlebot|bingbot|applebot|iMessageLinkPreview/i;if(!b.test(navigator.userAgent)){location.replace(${JSON.stringify('/post/' + postId)})}}catch(e){}`,
          }}
        />
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-xl text-white">{ogData.title}</h1>
            <p className="text-gray-400 mt-2">Opening on SoundChain…</p>
          </div>
        </div>
      </>
    )
  }

  // Regular user flow with hooks
  const { data: repostData } = usePostQuery({
    variables: { id: post?.repostId || '' },
    skip: !post?.repostId
  })
  const { setTopNavBarProps } = useLayoutContext()
  const { playlistState } = useAudioPlayerContext()
  const me = useMe()

  const deleted = post?.deleted

  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      rightButton: me ? <InboxButton showAlertItem={false} /> : undefined,
    }),
    [me],
  )

  const repost = repostData?.post
  const track = post?.track || repost?.track

  // Build title for sharing
  const title = track
    ? `${track.title} - song by ${track.artist} | SoundChain`
    : post?.profile?.displayName
      ? `${post.profile.displayName} on SoundChain`
      : 'Post | SoundChain'

  // Check if this is a video post
  const postWithMedia = post as typeof post & {
    uploadedMediaUrl?: string | null
    uploadedMediaType?: string | null
    mediaThumbnail?: string | null
  }
  const isVideoPost = postWithMedia?.uploadedMediaType === 'video'
  const isAudioPost = postWithMedia?.uploadedMediaType === 'audio'

  // Build description for sharing
  const description = track
    ? `${!post?.body ? '' : `${post.body} - `}Listen to ${track.title} on SoundChain. ${track.artist}. ${
        track.album || 'Song'
      }. ${!track.releaseYear ? '' : `${track.releaseYear}.`}`
    : isVideoPost
      ? `${post?.profile?.displayName || 'Someone'} shared a video${post?.body ? `: ${post.body.substring(0, 150)}` : ''}`
      : isAudioPost
        ? `${post?.profile?.displayName || 'Someone'} shared audio${post?.body ? `: ${post.body.substring(0, 150)}` : ''}`
        : post?.body
          ? post.body.substring(0, 200) + (post.body.length > 200 ? '...' : '')
          : `Check out this post on SoundChain`

  // Get best image for sharing - prioritize track artwork, then YouTube thumbnail, then profile picture
  // All URLs are converted to HTTP gateway URLs for social media crawlers
  const getShareImage = (): string => {
    // Priority 1: Track artwork
    if (track?.artworkUrl) return getHttpImageUrl(track.artworkUrl)

    // Priority 2: YouTube thumbnail from embed
    if (post?.mediaLink) {
      const ytThumb = getYouTubeThumbnail(post.mediaLink)
      if (ytThumb) return ytThumb

      const vimeoThumb = getVimeoThumbnail(post.mediaLink)
      if (vimeoThumb) return vimeoThumb
    }

    // Priority 3: Uploaded media (for ephemeral posts) - images only, not videos
    // (postWithMedia is defined earlier in the component)
    if (postWithMedia?.uploadedMediaUrl && postWithMedia?.uploadedMediaType === 'image') {
      return getHttpImageUrl(postWithMedia.uploadedMediaUrl)
    }

    // Priority 3b: Video thumbnail (captured from video frame)
    if (postWithMedia?.uploadedMediaType === 'video' && postWithMedia?.mediaThumbnail) {
      return getHttpImageUrl(postWithMedia.mediaThumbnail)
    }

    // Priority 4: Profile picture
    if (post?.profile?.profilePicture) return getHttpImageUrl(post.profile.profilePicture)

    // Fallback: SoundChain logo
    return `${config.domainUrl}/soundchain-meta-logo.png`
  }

  const shareImage = getShareImage()
  const url = `${config.domainUrl}/posts/${postId}`

  useEffect(() => {
    if (!isBotRequest) {
      setTopNavBarProps(topNavBarProps)
    }
  }, [setTopNavBarProps, topNavBarProps, isBotRequest])

  const handleOnPlayClicked = () => {
    if (track) {
      playlistState(
        [
          {
            src: track.playbackUrl,
            trackId: track.id,
            art: track.artworkUrl,
            title: track.title,
            artist: track.artist,
            isFavorite: track.isFavorite,
          },
        ] as Song[],
        0,
      )
    }
  }

  // Determine if post has playable media
  const hasPlayableMedia = !!(post?.track?.playbackUrl || post?.mediaLink)
  const embedUrl = `${config.domainUrl}/embed/post/${postId}`
  const oEmbedUrl = `${config.domainUrl}/api/oembed?url=${encodeURIComponent(url)}`

  // For bots/crawlers, render minimal page with OG tags
  if (isBotRequest) {
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
              <meta property="og:video:width" content="1280" />
              <meta property="og:video:height" content="720" />
              <meta property="og:image" content={shareImage} />
              <meta property="og:image:width" content="1200" />
              <meta property="og:image:height" content="630" />
            </>
          ) : (
            <>
              <meta property="og:type" content="article" />
              <meta property="og:image" content={shareImage} />
              <meta property="og:image:width" content="1200" />
              <meta property="og:image:height" content="630" />
            </>
          )}

          {/* Twitter Card - Player Card for playable content */}
          {hasPlayableMedia ? (
            <>
              <meta name="twitter:card" content="player" />
              <meta name="twitter:title" content={title} />
              <meta name="twitter:description" content={description} />
              <meta name="twitter:image" content={shareImage} />
              <meta name="twitter:site" content="@SoundChainFM" />
              <meta name="twitter:player" content={embedUrl} />
              <meta name="twitter:player:width" content="480" />
              <meta name="twitter:player:height" content="270" />
            </>
          ) : (
            <>
              <meta name="twitter:card" content="summary_large_image" />
              <meta name="twitter:title" content={title} />
              <meta name="twitter:description" content={description} />
              <meta name="twitter:image" content={shareImage} />
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

          {/* Author info */}
          {post?.profile && (
            <meta property="article:author" content={post.profile.displayName || post.profile.userHandle || ''} />
          )}

          <link rel="canonical" href={url} />
        </Head>

        {/* Minimal page for crawlers - they just need the head tags */}
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            {shareImage && (
              <img
                src={shareImage}
                alt={title}
                className="w-64 h-64 mx-auto rounded-lg shadow-lg mb-6 object-cover"
              />
            )}
            <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
            <p className="text-gray-400 mb-4 line-clamp-3">{description}</p>
            <p className="text-cyan-400">Loading SoundChain...</p>
          </div>
        </div>
      </>
    )
  }

  // Regular page for users
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
            <meta property="og:type" content="video.other" />
            <meta property="og:video" content={embedUrl} />
            <meta property="og:video:secure_url" content={embedUrl} />
            <meta property="og:video:type" content="text/html" />
            <meta property="og:video:width" content="1280" />
            <meta property="og:video:height" content="720" />
            <meta property="og:image" content={shareImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
          </>
        ) : (
          <>
            <meta property="og:type" content="article" />
            <meta property="og:image" content={shareImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
          </>
        )}

        {/* Twitter Card - Player Card for playable content */}
        {hasPlayableMedia ? (
          <>
            <meta name="twitter:card" content="player" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={shareImage} />
            <meta name="twitter:site" content="@SoundChainFM" />
            <meta name="twitter:player" content={embedUrl} />
            <meta name="twitter:player:width" content="480" />
            <meta name="twitter:player:height" content="270" />
          </>
        ) : (
          <>
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={shareImage} />
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

        <link rel="canonical" href={url} />
      </Head>

      {deleted || !post ? (
        <NotAvailableMessage type="post" />
      ) : (
        <div>
          <Post post={post} handleOnPlayClicked={handleOnPlayClicked} />
          <div className="pb-12">
            <Comments postId={post.id} />
          </div>
          <BottomSheet>
            <NewCommentForm postId={post.id} />
          </BottomSheet>
        </div>
      )}
    </>
  )
}
