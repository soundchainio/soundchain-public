import React, { useState, useRef } from 'react'
import { gql, useQuery, useMutation } from '@apollo/client'
import { Avatar, AvatarImage, AvatarFallback } from 'components/ui/avatar'
import { Button } from 'components/ui/button'
import {
  Send, Trash2, Pin, MessageCircle, ChevronDown, Play, Heart,
  Users, BadgeCheck, Music, Disc3, Headphones, TrendingUp, ExternalLink, Minus, Plus,
  Smile, Sparkles, Link2, X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { hasLazyLoadWithThumbnailSupport, IdentifySource } from 'utils/NormalizeEmbedLinks'
import { MediaProvider } from 'types/MediaProvider'
import { EmoteRenderer } from 'components/EmoteRenderer'
import { StickerPicker } from 'components/StickerPicker'
import Picker from '@emoji-mart/react'

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false })

interface Emoji {
  id: string
  name: string
  native: string
  unified: string
  keywords: string[]
  shortcodes: string
}

const getYouTubeThumbnail = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null
}

const getEmbedHeight = (url: string): string => {
  const mediaType = IdentifySource(url).type
  const isPlaylist = url.includes('listType=playlist') || url.includes('videoseries') || url.includes('list=')
  if (isPlaylist) return '360px'
  switch (mediaType) {
    case MediaProvider.BANDCAMP: return '470px'
    case MediaProvider.SPOTIFY: return '352px'
    case MediaProvider.SOUNDCLOUD: return '166px'
    case MediaProvider.INSTAGRAM: return '540px'
    case MediaProvider.TIKTOK: return '740px'
    case MediaProvider.X: return '400px'
    case MediaProvider.TWITCH: return '378px'
    default: return '250px'
  }
}
import {
  useGroupedTracksQuery, useFollowingLazyQuery, useFollowersLazyQuery,
  SortTrackField, SortOrder,
} from 'lib/graphql'
import { useAudioPlayerContext, Song } from 'hooks/useAudioPlayer'

const WALL_POSTS_QUERY = gql`
  query WallPosts($profileId: String!, $page: PageInput) {
    wallPosts(profileId: $profileId, page: $page) {
      nodes {
        id
        profileId
        authorProfileId
        body
        pinned
        createdAt
        author {
          id
          displayName
          userHandle
          profilePicture
        }
        replyCount
        replies {
          id
          authorProfileId
          body
          createdAt
          author {
            id
            displayName
            userHandle
            profilePicture
          }
        }
      }
      pageInfo {
        totalCount
        hasNextPage
      }
    }
  }
`

const CREATE_WALL_POST = gql`
  mutation CreateWallPost($profileId: String!, $body: String!, $replyToId: String) {
    createWallPost(profileId: $profileId, body: $body, replyToId: $replyToId) {
      id
      body
      createdAt
      author {
        id
        displayName
        userHandle
        profilePicture
      }
    }
  }
`

const DELETE_WALL_POST = gql`
  mutation DeleteWallPost($wallPostId: String!) {
    deleteWallPost(wallPostId: $wallPostId)
  }
`

const PIN_WALL_POST = gql`
  mutation PinWallPost($wallPostId: String!) {
    pinWallPost(wallPostId: $wallPostId) {
      id
      pinned
    }
  }
`

interface ProfileWallProps {
  profileId: string
  isOwnProfile: boolean
  viewerProfileId?: string
  profileName?: string
  walletAddress?: string
}

// Reusable Emoji/Sticker toolbar for wall inputs
function WallInputToolbar({
  showEmojiPicker,
  setShowEmojiPicker,
  showStickerPicker,
  setShowStickerPicker,
  showEmbedInput,
  setShowEmbedInput,
  embedUrl,
  setEmbedUrl,
  selectedStickers,
  setSelectedStickers,
  onEmojiSelect,
  charCount,
  maxChars,
}: {
  showEmojiPicker: boolean
  setShowEmojiPicker: (v: boolean) => void
  showStickerPicker: boolean
  setShowStickerPicker: (v: boolean) => void
  showEmbedInput: boolean
  setShowEmbedInput: (v: boolean) => void
  embedUrl: string
  setEmbedUrl: (v: string) => void
  selectedStickers: Array<{url: string, name: string}>
  setSelectedStickers: React.Dispatch<React.SetStateAction<Array<{url: string, name: string}>>>
  onEmojiSelect: (emoji: Emoji) => void
  charCount: number
  maxChars: number
}) {
  return (
    <>
      {/* Selected Stickers Preview */}
      {selectedStickers.length > 0 && (
        <div className="mb-2 p-2 bg-neutral-800/50 rounded-xl border border-neutral-700">
          <div className="flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] text-neutral-400">Stickers ({selectedStickers.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedStickers.map((sticker, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={sticker.url}
                  alt={sticker.name}
                  className="w-8 h-8 object-contain rounded-lg bg-neutral-900/50 p-0.5"
                  title={sticker.name}
                />
                <button
                  onClick={() => setSelectedStickers(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2 h-2 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between mt-1.5 gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); setShowEmbedInput(false) }}
            className={`p-1 rounded-lg transition-all flex items-center gap-0.5 ${
              showEmojiPicker
                ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 ring-1 ring-yellow-400'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
            }`}
            title="Add emoji"
          >
            <Smile className="w-3.5 h-3.5" />
            <span className="text-[9px] font-medium hidden sm:inline">Emoji</span>
          </button>

          <button
            type="button"
            onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); setShowEmbedInput(false) }}
            className={`p-1 rounded-lg transition-all flex items-center gap-0.5 ${
              showStickerPicker
                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 ring-1 ring-cyan-400'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
            }`}
            title="Add stickers (7TV, BTTV, FFZ)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[9px] font-medium hidden sm:inline">Stickers</span>
          </button>

          <button
            type="button"
            onClick={() => { setShowEmbedInput(!showEmbedInput); setShowStickerPicker(false); setShowEmojiPicker(false) }}
            className={`p-1 rounded-lg transition-all flex items-center gap-0.5 ${
              showEmbedInput || embedUrl
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 ring-1 ring-purple-400'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
            }`}
            title="Add embed URL"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span className="text-[9px] font-medium hidden sm:inline">Embed</span>
          </button>
        </div>

        <span className={`text-[9px] ${charCount > maxChars * 0.8 ? 'text-amber-400' : 'text-neutral-500'}`}>
          {charCount}/{maxChars}
        </span>
      </div>

      {/* Embed URL Input */}
      {showEmbedInput && (
        <div className="mt-2">
          <div className="bg-neutral-800 rounded-xl p-2 border border-neutral-700">
            <div className="flex items-center gap-1.5 mb-1">
              <Link2 className="w-3 h-3 text-purple-400" />
              <span className="text-[9px] text-neutral-400">Embed URL (YouTube, Spotify, etc.)</span>
            </div>
            <input
              type="url"
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            {embedUrl && (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[9px] text-green-400">URL attached</span>
                <button onClick={() => setEmbedUrl('')} className="text-[9px] text-red-400 hover:text-red-300">Remove</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
          <Picker theme="dark" perLine={8} onEmojiSelect={onEmojiSelect} />
        </div>
      )}

      {/* Sticker Picker */}
      {showStickerPicker && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
          <StickerPicker
            theme="dark"
            onSelect={(stickerUrl, stickerName) => {
              setSelectedStickers(prev => [...prev, { url: stickerUrl, name: stickerName }])
            }}
          />
        </div>
      )}
    </>
  )
}

export function ProfileWall({ profileId, isOwnProfile, viewerProfileId, profileName, walletAddress }: ProfileWallProps) {
  const [body, setBody] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [page, setPage] = useState(1)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const { playlistState } = useAudioPlayerContext()

  // Wall post input state
  const [postStickers, setPostStickers] = useState<Array<{url: string, name: string}>>([])
  const [postEmbedUrl, setPostEmbedUrl] = useState('')
  const [showPostEmoji, setShowPostEmoji] = useState(false)
  const [showPostSticker, setShowPostSticker] = useState(false)
  const [showPostEmbed, setShowPostEmbed] = useState(false)

  // Reply input state
  const [replyStickers, setReplyStickers] = useState<Array<{url: string, name: string}>>([])
  const [replyEmbedUrl, setReplyEmbedUrl] = useState('')
  const [showReplyEmoji, setShowReplyEmoji] = useState(false)
  const [showReplySticker, setShowReplySticker] = useState(false)
  const [showReplyEmbed, setShowReplyEmbed] = useState(false)

  const toggle = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  // Wall posts
  const { data, loading, refetch } = useQuery(WALL_POSTS_QUERY, {
    variables: { profileId, page: { first: 20 * page } },
    fetchPolicy: 'cache-and-network',
  })

  // THIS USER's tracks (what they created)
  const { data: userTracksData } = useGroupedTracksQuery({
    variables: {
      filter: { profileId },
      sort: { field: SortTrackField.PlaybackCount, order: SortOrder.Desc },
      page: { first: 8 },
    },
    skip: !profileId,
  })

  // THIS USER's following (their friends)
  const [fetchFollowing, { data: followingData, called: followingCalled }] = useFollowingLazyQuery()
  const [fetchFollowers, { data: followersData, called: followersCalled }] = useFollowersLazyQuery()

  // Lazy-load friends when component mounts
  React.useEffect(() => {
    if (profileId && !followingCalled) {
      fetchFollowing({ variables: { profileId, page: { first: 12 } }, fetchPolicy: 'cache-and-network' })
    }
    if (profileId && !followersCalled) {
      fetchFollowers({ variables: { profileId, page: { first: 200 } }, fetchPolicy: 'cache-and-network' })
    }
  }, [profileId, followingCalled, followersCalled, fetchFollowing, fetchFollowers])

  const userTracks = userTracksData?.groupedTracks?.nodes || []
  const following = followingData?.following?.nodes?.map((n: any) => n.followedProfile).filter(Boolean) || []
  const followersCount = followersData?.followers?.pageInfo?.totalCount || 0
  const followingCount = followingData?.following?.pageInfo?.totalCount || 0

  const handlePlayTrack = (tracks: any[], index: number) => {
    const playlist: Song[] = tracks.map(t => ({
      trackId: t.id,
      src: t.playbackUrl,
      art: t.artworkUrl,
      title: t.title,
      artist: t.artist,
      isFavorite: t.isFavorite,
    }))
    playlistState(playlist, index)
  }

  const [createWallPost, { loading: posting }] = useMutation(CREATE_WALL_POST, {
    onCompleted: () => {
      setBody('')
      setPostStickers([])
      setPostEmbedUrl('')
      setShowPostEmoji(false)
      setShowPostSticker(false)
      setShowPostEmbed(false)
      setReplyingTo(null)
      setReplyBody('')
      setReplyStickers([])
      setReplyEmbedUrl('')
      setShowReplyEmoji(false)
      setShowReplySticker(false)
      setShowReplyEmbed(false)
      refetch()
    },
  })

  const [deleteWallPost] = useMutation(DELETE_WALL_POST, {
    onCompleted: () => refetch(),
  })

  const [pinWallPost] = useMutation(PIN_WALL_POST, {
    onCompleted: () => refetch(),
  })

  const handleSubmit = () => {
    // Combine text + sticker markdown + embed URL (same pattern as WaveformWithComments)
    const stickerMarkdown = postStickers.map(s => `![emote:${s.name}](${s.url})`).join(' ')
    const finalBody = [body.trim(), stickerMarkdown, postEmbedUrl.trim()].filter(Boolean).join(' ')
    if (!finalBody) return
    createWallPost({ variables: { profileId, body: finalBody } })
  }

  const handleReply = (wallPostId: string) => {
    const stickerMarkdown = replyStickers.map(s => `![emote:${s.name}](${s.url})`).join(' ')
    const finalBody = [replyBody.trim(), stickerMarkdown, replyEmbedUrl.trim()].filter(Boolean).join(' ')
    if (!finalBody) return
    createWallPost({ variables: { profileId, body: finalBody, replyToId: wallPostId } })
  }

  const posts = data?.wallPosts?.nodes || []
  const pageInfo = data?.wallPosts?.pageInfo
  const sortedPosts = [...posts].sort((a: any, b: any) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return 0
  })

  const displayName = profileName || 'This user'

  // Normalize a raw URL into an embeddable URL for iframe-based platforms
  const getEmbedUrl = (url: string): string => {
    let embedUrl = url.replace(/^http:/, 'https:')
    // Spotify: open.spotify.com/track/X → open.spotify.com/embed/track/X
    if (/open\.spotify\.com\/(?!embed\/)/.test(embedUrl)) {
      embedUrl = embedUrl.replace('open.spotify.com/', 'open.spotify.com/embed/')
    }
    // SoundCloud: add ?visual=true for player embed (oEmbed fallback)
    if (/soundcloud\.com\//.test(embedUrl) && !embedUrl.includes('w.soundcloud.com')) {
      embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(embedUrl)}&color=%2306b6d4&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true`
    }
    // Bandcamp: /track/ or /album/ → add /size=large/bgcol=333333/linkcol=0687f5/
    if (/bandcamp\.com\/(track|album)\//.test(embedUrl) && !embedUrl.includes('bandcamp.com/EmbeddedPlayer')) {
      const bcMatch = embedUrl.match(/https?:\/\/([^/]+)\.bandcamp\.com\/(track|album)\/([^/?#]+)/)
      if (bcMatch) {
        const [, , type, slug] = bcMatch
        embedUrl = `https://bandcamp.com/EmbeddedPlayer/${type}=${slug}/size=large/bgcol=333333/linkcol=0687f5/tracklist=false/transparent=true/`
      }
    }
    return embedUrl
  }

  // Render wall post body with auto-embeds + emote support
  const renderBody = (text: string) => {
    // Check for emote markdown
    const hasEmotes = text.includes('![emote:') || text.includes('[!emote:') || text.includes('[emote:')

    // Strip emote markdown before URL detection to avoid splitting CDN URLs inside emote syntax
    // e.g. ![emote:KEKW](https://cdn.7tv.app/emote/xxx/2x) should NOT be split on the CDN URL
    const textWithoutEmotes = text.replace(/!\[emote:[^\]]*\]\([^)]*\)/g, '')

    // Use non-global regex for URL detection (avoids lastIndex bugs)
    const urlPattern = /https?:\/\/[^\s]+/
    const hasUrls = urlPattern.test(textWithoutEmotes)

    // Simple text with no URLs or emotes
    if (!hasUrls && !hasEmotes) return <span>{text}</span>

    // If only emotes, no URLs — use EmoteRenderer with linkify
    if (!hasUrls && hasEmotes) {
      return <EmoteRenderer text={text} linkify />
    }

    // Has URLs — split on URLs but preserve emote markdown
    // First, extract emote tokens and replace with placeholders
    const emoteTokens: string[] = []
    const textWithPlaceholders = text.replace(/!\[emote:[^\]]*\]\([^)]*\)/g, (match) => {
      emoteTokens.push(match)
      return `__EMOTE_${emoteTokens.length - 1}__`
    })

    // Now split on URLs (using capturing group to keep URLs in results)
    const urlSplitRegex = /(https?:\/\/[^\s]+)/g
    const parts = textWithPlaceholders.split(urlSplitRegex)
    if (parts.length === 1) return hasEmotes ? <EmoteRenderer text={text} linkify /> : <span>{text}</span>

    return (
      <>
        {parts.map((part, i) => {
          // Check if this part is a URL
          if (!urlPattern.test(part)) {
            // Restore emote placeholders in non-URL text
            let restored = part
            emoteTokens.forEach((token, idx) => {
              restored = restored.replace(`__EMOTE_${idx}__`, token)
            })
            return restored.trim() ? (
              hasEmotes || restored.includes('![emote:')
                ? <EmoteRenderer key={i} text={restored} />
                : <span key={i}>{restored}</span>
            ) : null
          }

          // Skip CDN URLs that were part of emote markdown (shouldn't reach here after placeholder stripping)
          if (part.includes('cdn.7tv.app/emote/') || part.includes('cdn.betterttv.net/emote/') || part.includes('cdn.frankerfacez.com/')) {
            return null
          }

          const mediaUrl = part.replace(/^http:/, 'https:')
          const source = IdentifySource(part).type
          if (!source) {
            return (
              <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-0.5 break-all">
                {part.length > 50 ? part.slice(0, 50) + '...' : part}
                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
              </a>
            )
          }
          const isPlaylist = mediaUrl.includes('listType=playlist') || mediaUrl.includes('videoseries') || mediaUrl.includes('list=')
          const useReactPlayer = !isPlaylist && hasLazyLoadWithThumbnailSupport(part)
          if (useReactPlayer) {
            return (
              <div key={i} className="relative w-full mt-2 mb-1 rounded-xl overflow-hidden"
                style={{ paddingTop: '56.25%', contain: 'layout style', willChange: 'contents', transform: 'translateZ(0)' }}>
                <ReactPlayer
                  width="100%" height="100%"
                  style={{ position: 'absolute', top: 0, left: 0 }}
                  url={mediaUrl} playsinline controls
                  light={getYouTubeThumbnail(mediaUrl) || true}
                  pip playing={false} stopOnUnmount={false}
                  config={{
                    youtube: { playerVars: { modestbranding: 1, rel: 0, playsinline: 1, origin: typeof window !== 'undefined' ? window.location.origin : '' } },
                    vimeo: { playerOptions: { responsive: true, playsinline: true } },
                    facebook: { appId: '' },
                  }}
                />
              </div>
            )
          }
          // Normalize URL for iframe-based embeds (Spotify, SoundCloud, Bandcamp)
          const embedSrc = getEmbedUrl(mediaUrl)
          return (
            <div key={i} className="mt-2 mb-1 rounded-xl overflow-hidden"
              style={{ contain: 'layout style', willChange: 'contents', transform: 'translateZ(0)' }}>
              <iframe
                frameBorder="0" className="w-full bg-black rounded-xl"
                style={{ minHeight: getEmbedHeight(mediaUrl) }}
                src={embedSrc} title="Media"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
                allowFullScreen referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )
        })}
      </>
    )
  }

  return (
    <div className="space-y-4">
      {/* === WALL MESSAGE BOARD (top of dashboard) === */}
      {viewerProfileId && (
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="flex-1">
            {/* Selected Stickers Preview for post */}
            <WallInputToolbar
              showEmojiPicker={showPostEmoji}
              setShowEmojiPicker={setShowPostEmoji}
              showStickerPicker={showPostSticker}
              setShowStickerPicker={setShowPostSticker}
              showEmbedInput={showPostEmbed}
              setShowEmbedInput={setShowPostEmbed}
              embedUrl={postEmbedUrl}
              setEmbedUrl={setPostEmbedUrl}
              selectedStickers={postStickers}
              setSelectedStickers={setPostStickers}
              onEmojiSelect={(emoji) => {
                if (body.length < 1000) setBody(prev => prev + emoji.native)
              }}
              charCount={body.length + postStickers.length}
              maxChars={1000}
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Write on ${profileName || 'their'} wall...`}
              className="w-full bg-transparent text-white placeholder-gray-500 resize-none outline-none text-sm min-h-[60px] mt-2"
              maxLength={1000}
            />
            <div className="flex items-center justify-end mt-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={(!body.trim() && postStickers.length === 0 && !postEmbedUrl.trim()) || posting}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1"
              >
                <Send className="w-3 h-3 mr-1" />
                {posting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Wall Posts */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <MessageCircle className="w-4 h-4 text-orange-400" />
          <h3 className="text-white font-bold text-sm">Wall</h3>
          {pageInfo?.totalCount > 0 && (
            <span className="text-gray-600 text-xs">({pageInfo.totalCount})</span>
          )}
        </div>

        {loading && posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading wall...</div>
        ) : sortedPosts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No wall posts yet. Be the first to write!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedPosts.map((post: any) => (
              <div key={post.id} className={`p-3.5 rounded-2xl border ${post.pinned ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-white/10 bg-white/[0.03]'}`}>
                <div className="flex items-start gap-2.5">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={post.author?.profilePicture} />
                    <AvatarFallback className="bg-gray-700 text-white text-xs">
                      {post.author?.displayName?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">{post.author?.displayName}</span>
                      <span className="text-gray-500 text-xs">@{post.author?.userHandle}</span>
                      <span className="text-gray-600 text-xs">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                      {post.pinned && <Pin className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                    </div>
                    <div className="text-gray-300 text-sm mt-1 whitespace-pre-wrap break-words">{renderBody(post.body)}</div>

                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => {
                          setReplyingTo(replyingTo === post.id ? null : post.id)
                          setReplyBody('')
                          setReplyStickers([])
                          setReplyEmbedUrl('')
                          setShowReplyEmoji(false)
                          setShowReplySticker(false)
                          setShowReplyEmbed(false)
                        }}
                        className="text-gray-500 hover:text-cyan-400 text-xs flex items-center gap-1 transition-colors"
                      >
                        <MessageCircle className="w-3 h-3" />
                        Reply {post.replyCount > 0 && `(${post.replyCount})`}
                      </button>
                      {(post.authorProfileId === viewerProfileId || isOwnProfile) && (
                        <button
                          onClick={() => deleteWallPost({ variables: { wallPostId: post.id } })}
                          className="text-gray-500 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      )}
                      {isOwnProfile && (
                        <button
                          onClick={() => pinWallPost({ variables: { wallPostId: post.id } })}
                          className={`text-xs flex items-center gap-1 transition-colors ${post.pinned ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'}`}
                        >
                          <Pin className="w-3 h-3" />
                          {post.pinned ? 'Unpin' : 'Pin'}
                        </button>
                      )}
                    </div>

                    {post.replies?.length > 0 && (
                      <div className="mt-3 ml-2 pl-3 border-l-2 border-white/10 space-y-2">
                        {post.replies.map((reply: any) => (
                          <div key={reply.id} className="flex items-start gap-2">
                            <Avatar className="w-6 h-6 flex-shrink-0">
                              <AvatarImage src={reply.author?.profilePicture} />
                              <AvatarFallback className="bg-gray-700 text-white text-[10px]">
                                {reply.author?.displayName?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-white text-xs">{reply.author?.displayName}</span>
                                <span className="text-gray-600 text-[10px]">
                                  {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <div className="text-gray-300 text-xs mt-0.5 whitespace-pre-wrap break-words">{renderBody(reply.body)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {replyingTo === post.id && viewerProfileId && (
                      <div className="mt-3 ml-2 pl-3 border-l-2 border-cyan-500/30">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="relative">
                              <input
                                value={replyBody}
                                onChange={(e) => setReplyBody(e.target.value)}
                                placeholder="Write a reply..."
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 pr-10 text-white placeholder-gray-500 text-xs outline-none focus:border-cyan-500 transition-colors"
                                maxLength={1000}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleReply(post.id)
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleReply(post.id)}
                                disabled={(!replyBody.trim() && replyStickers.length === 0 && !replyEmbedUrl.trim()) || posting}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <WallInputToolbar
                              showEmojiPicker={showReplyEmoji}
                              setShowEmojiPicker={setShowReplyEmoji}
                              showStickerPicker={showReplySticker}
                              setShowStickerPicker={setShowReplySticker}
                              showEmbedInput={showReplyEmbed}
                              setShowEmbedInput={setShowReplyEmbed}
                              embedUrl={replyEmbedUrl}
                              setEmbedUrl={setReplyEmbedUrl}
                              selectedStickers={replyStickers}
                              setSelectedStickers={setReplyStickers}
                              onEmojiSelect={(emoji) => {
                                if (replyBody.length < 1000) setReplyBody(prev => prev + emoji.native)
                              }}
                              charCount={replyBody.length + replyStickers.length}
                              maxChars={1000}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pageInfo?.hasNextPage && (
          <div className="text-center pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              className="text-gray-400 hover:text-white"
            >
              <ChevronDown className="w-4 h-4 mr-1" />
              Load more
            </Button>
          </div>
        )}
      </div>

      {/* === PERSONALIZED DASHBOARD — collapsible cards, long scroll === */}
      <div className="space-y-3">

        {/* Their Music */}
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-neutral-900/80 via-cyan-950/10 to-neutral-900/80 p-4 backdrop-blur-sm">
          <button onClick={() => toggle('music')} className="flex items-center gap-2 w-full">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-white font-bold text-sm">{isOwnProfile ? 'My Music' : `${displayName}'s Music`}</h3>
            <span className="text-[10px] text-cyan-400">
              {userTracksData?.groupedTracks?.pageInfo?.totalCount || userTracks.length} tracks
            </span>
            <span className="ml-auto w-5 h-5 rounded-full bg-white/10 flex items-center justify-center md:hidden">
              {collapsed.music ? <Plus className="w-3 h-3 text-gray-400" /> : <Minus className="w-3 h-3 text-gray-400" />}
            </span>
          </button>
          <div className={`${collapsed.music ? 'hidden md:block' : ''} mt-3`}>
              {userTracks.length > 0 ? (
                <div className="space-y-1.5">
                  {userTracks.slice(0, 5).map((track: any, index: number) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
                      onClick={() => handlePlayTrack(userTracks, index)}
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden relative flex-shrink-0">
                        <img src={track.artworkUrl ?? '/images/default-artwork.png'} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-3 h-3 text-white" fill="white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate group-hover:text-cyan-400 transition-colors">{track.title}</p>
                        <p className="text-gray-500 text-[10px] truncate">{track.artist}</p>
                      </div>
                      <span className="text-gray-600 text-[10px] flex items-center gap-0.5 flex-shrink-0">
                        <TrendingUp className="w-2.5 h-2.5" />
                        {track.playbackCountFormatted || '0'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-xs text-center py-4">
                  <Music className="w-6 h-6 mx-auto mb-1 opacity-30" />
                  {isOwnProfile ? 'Upload your first track!' : 'No tracks yet'}
                </p>
              )}
            </div>
        </div>

        {/* Their Friends / Following */}
        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-neutral-900/80 via-purple-950/10 to-neutral-900/80 p-4 backdrop-blur-sm">
          <button onClick={() => toggle('circle')} className="flex items-center gap-2 w-full">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-white font-bold text-sm">{isOwnProfile ? 'My Circle' : `${displayName}'s Circle`}</h3>
            <span className="text-[10px] text-purple-400">
              {followingCount} following
            </span>
            <span className="ml-auto w-5 h-5 rounded-full bg-white/10 flex items-center justify-center md:hidden">
              {collapsed.circle ? <Plus className="w-3 h-3 text-gray-400" /> : <Minus className="w-3 h-3 text-gray-400" />}
            </span>
          </button>
          <div className={`${collapsed.circle ? 'hidden md:block' : ''} mt-3`}>
              {following.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {following.slice(0, 8).map((user: any) => (
                    <Link
                      key={user.id}
                      href={`/dex/users/${user.userHandle}`}
                      className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-500/20 group-hover:ring-purple-500/50 transition-all">
                        <img
                          src={user.profilePicture || '/images/default-avatar.png'}
                          alt={user.displayName || user.userHandle || ''}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] text-gray-400 truncate max-w-[60px] group-hover:text-white transition-colors">
                          {user.displayName || user.userHandle}
                        </span>
                        {user.verified && <BadgeCheck className="w-2.5 h-2.5 text-cyan-400 flex-shrink-0" />}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-xs text-center py-4">
                  <Heart className="w-6 h-6 mx-auto mb-1 opacity-30" />
                  {isOwnProfile ? 'Follow artists to fill your circle!' : 'Not following anyone yet'}
                </p>
              )}
            </div>
        </div>

        {/* Their Collection — NFT artwork grid */}
        {userTracks.filter((t: any) => t.nftData?.tokenId || t.nftData?.contract).length > 0 && (
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-neutral-900/80 via-amber-950/10 to-neutral-900/80 p-4 backdrop-blur-sm">
            <button onClick={() => toggle('collection')} className="flex items-center gap-2 w-full">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                <Disc3 className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="text-white font-bold text-sm">{isOwnProfile ? 'My Collection' : 'Collection'}</h3>
              <span className="ml-auto w-5 h-5 rounded-full bg-white/10 flex items-center justify-center md:hidden">
                {collapsed.collection ? <Plus className="w-3 h-3 text-gray-400" /> : <Minus className="w-3 h-3 text-gray-400" />}
              </span>
            </button>
            <div className={`${collapsed.collection ? 'hidden md:block' : ''} mt-3 grid grid-cols-4 gap-2`}>
                {userTracks
                  .filter((t: any) => t.nftData?.tokenId || t.nftData?.contract)
                  .slice(0, 8)
                  .map((track: any, index: number) => (
                    <button
                      key={track.id}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-gray-800 hover:ring-2 hover:ring-amber-400/60 transition-all"
                      onClick={() => handlePlayTrack(userTracks.filter((t: any) => t.nftData?.tokenId || t.nftData?.contract), index)}
                      title={track.title}
                    >
                      <img src={track.artworkUrl ?? '/images/default-artwork.png'} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[9px] text-white truncate font-medium">{track.title}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
        )}

        {/* Quick Stats — about THIS user */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900/80 via-neutral-800/10 to-neutral-900/80 p-4 backdrop-blur-sm">
          <button onClick={() => toggle('stats')} className="flex items-center gap-2 w-full">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-white font-bold text-sm">Stats</h3>
            <span className="ml-auto w-5 h-5 rounded-full bg-white/10 flex items-center justify-center md:hidden">
              {collapsed.stats ? <Plus className="w-3 h-3 text-gray-400" /> : <Minus className="w-3 h-3 text-gray-400" />}
            </span>
          </button>
          <div className={`${collapsed.stats ? 'hidden md:block' : ''} mt-3 grid grid-cols-2 gap-2`}>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <Music className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <p className="text-white font-bold text-lg">{userTracksData?.groupedTracks?.pageInfo?.totalCount || userTracks.length}</p>
                <p className="text-gray-500 text-[10px]">Tracks</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <Users className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <p className="text-white font-bold text-lg">{followersCount}</p>
                <p className="text-gray-500 text-[10px]">Followers</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <Heart className="w-4 h-4 text-pink-400 mx-auto mb-1" />
                <p className="text-white font-bold text-lg">{followingCount}</p>
                <p className="text-gray-500 text-[10px]">Following</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <MessageCircle className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                <p className="text-white font-bold text-lg">{pageInfo?.totalCount || 0}</p>
                <p className="text-gray-500 text-[10px]">Wall Posts</p>
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileWall
