import { GetServerSideProps } from 'next'
import { ParsedUrlQuery } from 'querystring'
import Head from 'next/head'
import { config } from 'config'
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

// OG metadata computed server-side for bots
interface OgMetadata {
  title: string
  description: string
  image: string
  url: string
}

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
      return {
        redirect: { destination: `/dex/post/${postId}`, permanent: false },
      }
    }

    // (Frank, Jun 1 2026 — share/OG fix) Build OG tags from MONGO directly, not
    // the Apollo Lambda (api.soundchain.io is dead; createApolloClient now points
    // at /api/graphql-stub which returns {data:null}, so every link preview fell
    // through to notFound → the generic SoundChain logo). iMessage/WhatsApp/etc.
    // now get the real post title, body, and image inline like rival platforms.
    const { default: clientPromise } = await import('lib/mongodb')
    const { ObjectId } = await import('mongodb')
    let mPost: any = null
    try {
      const client = await clientPromise
      const db = client.db('soundchain')
      mPost = await db.collection('posts').findOne({ _id: new ObjectId(postId) })
      if (mPost) {
        const mProfile = mPost.profileId
          ? await db.collection('profiles').findOne(
              { _id: typeof mPost.profileId === 'string' ? new ObjectId(mPost.profileId) : mPost.profileId },
              { projection: { displayName: 1, userHandle: 1, profilePicture: 1 } },
            )
          : null
        const mTrack = mPost.trackId
          ? await db.collection('tracks').findOne(
              { _id: typeof mPost.trackId === 'string' ? new ObjectId(mPost.trackId) : mPost.trackId },
              { projection: { title: 1, artist: 1, artworkUrl: 1 } },
            )
          : null
        // Shape to match the OG builder's expectations below.
        mPost = {
          body: mPost.body || '',
          mediaLink: mPost.mediaLink || null,
          uploadedMediaUrl: mPost.uploadedMediaUrl || null,
          uploadedMediaType: mPost.uploadedMediaType || null,
          mediaThumbnail: mPost.mediaThumbnail || null,
          profile: mProfile ? { displayName: mProfile.displayName || '', profilePicture: mProfile.profilePicture || null } : null,
          track: mTrack ? { title: mTrack.title || '', artist: mTrack.artist || '', artworkUrl: mTrack.artworkUrl || null } : null,
        }
      }
    } catch (dbErr) {
      console.error('[posts/[id]] OG mongo fetch failed:', (dbErr as any)?.message)
    }

    if (!mPost) {
      // Post genuinely missing OR a transient DB blip — still return a valid
      // OG page (generic) so the link never 404s in a preview, just without rich data.
      return {
        props: {
          post: null,
          postId,
          isBot: true,
          ogData: {
            title: 'Post | SoundChain',
            description: 'Check out this post on SoundChain',
            image: `${config.domainUrl}/soundchain-meta-logo.png`,
            url: `${config.domainUrl}/posts/${postId}`,
          },
        },
      }
    }

    // For bots, compute OG data server-side and return minimal props
    {
      const post = mPost
      const track = post?.track
      const postWithMedia = post as typeof post & {
        uploadedMediaUrl?: string | null
        uploadedMediaType?: string | null
        mediaThumbnail?: string | null
      }

      // Build title
      const title = track
        ? `${track.title} - song by ${track.artist} | SoundChain`
        : post?.profile?.displayName
          ? `${post.profile.displayName} on SoundChain`
          : 'Post | SoundChain'

      // Build description
      const isVideoPost = postWithMedia?.uploadedMediaType === 'video'
      const isAudioPost = postWithMedia?.uploadedMediaType === 'audio'
      // Strip emote/sticker/GIF markdown so raw syntax doesn't show in link previews
      const cleanPostBody = post?.body
        ? post.body
            .replace(/!\[!?emote:[^\]]*\]\([^)]*\)/g, '')
            .replace(/!\[!?sticker:[^\]]*\]\([^)]*\)/g, '')
            .replace(/!\[!?gif:[^\]]*\]\([^)]*\)/g, '')
            .trim()
        : ''
      const description = track
        ? `Listen to ${track.title} on SoundChain. ${track.artist}.`
        : isVideoPost
          ? `${post?.profile?.displayName || 'Someone'} shared a video on SoundChain`
          : isAudioPost
            ? `${post?.profile?.displayName || 'Someone'} shared audio on SoundChain`
            : cleanPostBody
              ? cleanPostBody.substring(0, 200)
              : 'Check out this post on SoundChain'

      // Get share image
      let image = `${config.domainUrl}/soundchain-meta-logo.png`
      if (track?.artworkUrl) {
        image = getHttpImageUrl(track.artworkUrl)
      } else if (post?.mediaLink) {
        const ytThumb = getYouTubeThumbnail(post.mediaLink)
        if (ytThumb) image = ytThumb
      } else if (postWithMedia?.uploadedMediaUrl && postWithMedia?.uploadedMediaType === 'image') {
        image = getHttpImageUrl(postWithMedia.uploadedMediaUrl)
      } else if (postWithMedia?.uploadedMediaType === 'video' && postWithMedia?.mediaThumbnail) {
        // For video posts, use the captured thumbnail
        image = getHttpImageUrl(postWithMedia.mediaThumbnail)
      } else if (post?.profile?.profilePicture) {
        image = getHttpImageUrl(post.profile.profilePicture)
      }

      return {
        props: {
          post: null, // Don't send full post to bots - they just need OG tags
          postId,
          isBot: true,
          ogData: {
            title,
            description,
            image,
            url: `${config.domainUrl}/posts/${postId}`,
          },
        },
      }
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
            image: `${config.domainUrl}/soundchain-meta-logo.png`,
            url: `${config.domainUrl}/posts/${postId}`,
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
          <meta property="og:title" content={ogData.title} />
          <meta property="og:description" content={ogData.description} />
          <meta property="og:image" content={ogData.image} />
          <meta property="og:url" content={ogData.url} />
          <meta property="og:type" content="article" />
          <meta property="og:site_name" content="SoundChain" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={ogData.title} />
          <meta name="twitter:description" content={ogData.description} />
          <meta name="twitter:image" content={ogData.image} />
          <link rel="canonical" href={ogData.url} />
        </Head>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-xl text-white">{ogData.title}</h1>
            <p className="text-gray-400">{ogData.description}</p>
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
