import React, { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { gql, useQuery, useMutation } from '@apollo/client'
import { Avatar, AvatarImage, AvatarFallback } from 'components/ui/avatar'
import { Button } from 'components/ui/button'
import {
  Send, Trash2, Pin, MessageCircle, ChevronDown, Play, Heart,
  Users, BadgeCheck, Music, Disc3, Headphones, TrendingUp, ExternalLink, Minus, Plus,
  Smile, Sparkles, Link2, X, Paperclip, Share2, Upload, Image as ImageIcon, Film, Video, Pencil, Check,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-toastify'
import { hasLazyLoadWithThumbnailSupport, IdentifySource } from 'utils/NormalizeEmbedLinks'
import { MediaProvider } from 'types/MediaProvider'
import { EmoteRenderer } from 'components/EmoteRenderer'
import { StickerPicker } from 'components/StickerPicker'
import { GifPicker } from 'components/GifPicker'
import { AutoplayVideo } from 'components/AutoplayMedia'
import { useUpload } from 'hooks/useUpload'
import { SharePostModal } from 'components/modals/SharePostModal'
import { CreateStoryModal } from 'components/dex/CreateStoryModal'
import { MentionAutocomplete } from 'components/MentionAutocomplete'
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

/** Extract first embed-able URL from post body text (YouTube, Vimeo, etc.) */
const getEmbedUrlFromBody = (body?: string): string | null => {
  if (!body) return null
  const urlRegex = /https?:\/\/[^\s]+/g
  let match
  while ((match = urlRegex.exec(body)) !== null) {
    const source = IdentifySource(match[0]).type
    if (source) return match[0]
  }
  return null
}

/** Extract GIF URL from body markdown: ![emote:gif:name](url) */
const getGifUrlFromBody = (body?: string): string | null => {
  if (!body) return null
  const m = body.match(/!\[!?emote:gif:[^\]]*\]\(([^)]+)\)/)
  return m?.[1] || null
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
  SortTrackField, SortOrder,
} from 'lib/graphql'
import { useGroupedTracks as useGroupedTracksQuery } from 'hooks/useGroupedTracksDirect'  // Phase 7e — Vercel-direct
import { useFollowingLazy as useFollowingLazyQuery, useFollowersLazy as useFollowersLazyQuery } from 'hooks/useUsersSocialDirect'  // Phase 7e — Vercel-direct
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
        mediaUrl
        mediaType
        coverArtUrl
        mediaThumbnailUrl
        mediaTitle
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
          mediaUrl
          mediaType
          coverArtUrl
          mediaThumbnailUrl
          mediaTitle
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
  mutation CreateWallPost($profileId: String!, $body: String, $replyToId: String, $mediaUrl: String, $mediaType: String, $coverArtUrl: String, $mediaThumbnailUrl: String, $mediaTitle: String) {
    createWallPost(profileId: $profileId, body: $body, replyToId: $replyToId, mediaUrl: $mediaUrl, mediaType: $mediaType, coverArtUrl: $coverArtUrl, mediaThumbnailUrl: $mediaThumbnailUrl, mediaTitle: $mediaTitle) {
      id
      body
      createdAt
      mediaUrl
      mediaType
      coverArtUrl
      mediaThumbnailUrl
      mediaTitle
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

const UPDATE_WALL_POST = gql`
  mutation UpdateWallPost($wallPostId: String!, $body: String!) {
    updateWallPost(wallPostId: $wallPostId, body: $body) {
      id
      body
    }
  }
`

// Accepted file types for wall uploads
const wallAcceptedTypes = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4', '.m4v'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/wave': ['.wav'],
  'audio/flac': ['.flac'],
  'audio/ogg': ['.ogg'],
  'audio/mp4': ['.m4a'],
  'audio/x-m4a': ['.m4a'],
  'audio/aiff': ['.aiff', '.aif'],
}

const getMediaTypeFromMime = (mime: string): 'audio' | 'image' | 'video' => {
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  return 'image'
}

// iOS-style waveform audio player for wall posts
function WallAudioPlayer({ src, coverArtUrl, title, artist, small, autoPlay }: { src: string; coverArtUrl?: string; title?: string; artist?: string; small?: boolean; autoPlay?: boolean }) {
  const barCount = small ? 20 : 32
  return (
    <div className={`flex items-center gap-3 ${small ? 'p-2' : 'p-3'} bg-gradient-to-r from-neutral-800 via-neutral-800/90 to-neutral-700 rounded-xl border border-white/10`}>
      {coverArtUrl ? (
        <img src={coverArtUrl} alt="" className={`${small ? 'w-10 h-10' : 'w-14 h-14'} rounded-lg object-cover flex-shrink-0`} />
      ) : (
        <div className={`${small ? 'w-10 h-10' : 'w-14 h-14'} rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center flex-shrink-0`}>
          <Music className={`${small ? 'w-4 h-4' : 'w-6 h-6'} text-white`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {(title || artist) && (
          <div className="mb-1">
            {title && <p className={`text-white font-medium truncate ${small ? 'text-xs' : 'text-sm'}`}>{title}</p>}
            {artist && <p className={`text-neutral-400 truncate ${small ? 'text-[10px]' : 'text-xs'}`}>{artist}</p>}
          </div>
        )}
        <div className="flex items-end gap-[2px] h-6 mb-1.5">
          {Array.from({ length: barCount }).map((_, i) => {
            const h = 4 + Math.abs(Math.sin(i * 0.7 + 1.2) * 16) + Math.abs(Math.cos(i * 1.3) * 6)
            return <div key={i} className="flex-1 rounded-full bg-cyan-400/60" style={{ height: `${h}px` }} />
          })}
        </div>
        <audio controls src={src} autoPlay={autoPlay} className="w-full h-8 [&::-webkit-media-controls-panel]:bg-transparent" style={{ filter: 'invert(1) hue-rotate(180deg) brightness(0.9)', height: small ? '28px' : '32px' }} />
      </div>
    </div>
  )
}

// Render uploaded media for a wall post
function WallPostMedia({ post, small, autoPlayAudio }: { post: any; small?: boolean; autoPlayAudio?: boolean }) {
  if (!post.mediaUrl) return null
  const type = post.mediaType || 'image'

  if (type === 'image') {
    return (
      <div className={`mt-2 rounded-xl overflow-hidden ${small ? 'max-h-48' : 'max-h-80'}`}>
        <img src={post.mediaUrl} alt="" className="w-full object-cover rounded-xl" style={{ maxHeight: small ? '192px' : '320px' }} />
      </div>
    )
  }

  if (type === 'video') {
    return (
      <div className="mt-2 rounded-xl overflow-hidden" style={{ maxHeight: small ? '192px' : '320px' }}>
        <AutoplayVideo
          src={post.mediaUrl}
          className="rounded-xl"
          muted={true}
          loop={true}
        />
      </div>
    )
  }

  if (type === 'audio') {
    // Use stored mediaTitle (original filename), fall back to first line of body, then 'Audio'
    const audioTitle = post.mediaTitle || post.body?.split('\n')[0]?.slice(0, 80) || 'Audio'
    const audioArtist = post.author?.displayName || ''
    return (
      <div className="mt-2">
        <WallAudioPlayer
          src={post.mediaUrl}
          coverArtUrl={post.coverArtUrl}
          title={audioTitle}
          artist={audioArtist}
          small={small}
          autoPlay={autoPlayAudio}
        />
      </div>
    )
  }

  return null
}

interface ProfileWallProps {
  profileId: string
  isOwnProfile: boolean
  viewerProfileId?: string
  profileName?: string
  walletAddress?: string
  userHandle?: string
  highlightPostId?: string | null
  onSetProfileSong?: (audio: { url: string; title: string; artist: string; coverUrl?: string }) => void
  onAddToPlaylist?: (audio: { url: string; title: string; artist: string; coverUrl?: string; wallPostId: string }) => void
}

// Reusable Emoji/Sticker toolbar for wall inputs
function WallInputToolbar({
  showEmojiPicker,
  setShowEmojiPicker,
  showStickerPicker,
  setShowStickerPicker,
  showGifPicker,
  setShowGifPicker,
  showEmbedInput,
  setShowEmbedInput,
  embedUrl,
  setEmbedUrl,
  selectedStickers,
  setSelectedStickers,
  onEmojiSelect,
  charCount,
  maxChars,
  onMediaClick,
  showMediaActive,
  onStoryClick,
}: {
  showEmojiPicker: boolean
  setShowEmojiPicker: (v: boolean) => void
  showStickerPicker: boolean
  setShowStickerPicker: (v: boolean) => void
  showGifPicker: boolean
  setShowGifPicker: (v: boolean) => void
  showEmbedInput: boolean
  setShowEmbedInput: (v: boolean) => void
  embedUrl: string
  setEmbedUrl: (v: string) => void
  selectedStickers: Array<{url: string, name: string}>
  setSelectedStickers: React.Dispatch<React.SetStateAction<Array<{url: string, name: string}>>>
  onEmojiSelect: (emoji: Emoji) => void
  charCount: number
  maxChars: number
  onMediaClick?: () => void
  showMediaActive?: boolean
  onStoryClick?: () => void
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
            {selectedStickers.map((sticker, idx) => {
              const isGif = sticker.name.startsWith('gif:')
              return (
              <div key={idx} className="relative group">
                <img
                  src={sticker.url}
                  alt={sticker.name}
                  className={isGif
                    ? 'w-16 h-16 object-contain rounded-xl bg-neutral-900/50 p-0.5'
                    : 'w-8 h-8 object-contain rounded-lg bg-neutral-900/50 p-0.5'}
                  title={isGif ? sticker.name.replace('gif:', '') : sticker.name}
                />
                <button
                  onClick={() => setSelectedStickers(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2 h-2 text-white" />
                </button>
              </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between mt-1.5 gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); setShowGifPicker(false); setShowEmbedInput(false) }}
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
            onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); setShowGifPicker(false); setShowEmbedInput(false) }}
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
            onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); setShowStickerPicker(false); setShowEmbedInput(false) }}
            className={`p-1 rounded-lg transition-all flex items-center gap-0.5 ${
              showGifPicker
                ? 'bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-400 ring-1 ring-pink-400'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
            }`}
            title="Search GIFs (GIPHY)"
          >
            <Film className="w-3.5 h-3.5" />
            <span className="text-[9px] font-medium hidden sm:inline">GIF</span>
          </button>

          <button
            type="button"
            onClick={() => { setShowEmbedInput(!showEmbedInput); setShowStickerPicker(false); setShowEmojiPicker(false); setShowGifPicker(false) }}
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

          {onMediaClick && (
            <button
              type="button"
              onClick={() => { onMediaClick(); setShowEmojiPicker(false); setShowStickerPicker(false); setShowGifPicker(false); setShowEmbedInput(false) }}
              className={`p-1 rounded-lg transition-all flex items-center gap-0.5 ${
                showMediaActive
                  ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 ring-1 ring-green-400'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}
              title="Upload media (audio, image, video)"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span className="text-[9px] font-medium hidden sm:inline">Media</span>
            </button>
          )}

          {onStoryClick && (
            <button
              type="button"
              onClick={() => { onStoryClick(); setShowEmojiPicker(false); setShowStickerPicker(false); setShowGifPicker(false); setShowEmbedInput(false) }}
              className="p-1 rounded-lg transition-all flex items-center gap-0.5 bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-cyan-400"
              title="Create Story / Reel"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="text-[9px] font-medium hidden sm:inline">Reel</span>
            </button>
          )}
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
            onClose={() => setShowStickerPicker(false)}
            onSelect={(stickerUrl, stickerName) => {
              setSelectedStickers(prev => [...prev, { url: stickerUrl, name: stickerName }])
            }}
          />
        </div>
      )}

      {/* GIF Picker */}
      {showGifPicker && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
          <GifPicker
            theme="dark"
            onClose={() => setShowGifPicker(false)}
            onSelect={(gifUrl, gifTitle) => {
              setSelectedStickers(prev => [...prev, { url: gifUrl, name: `gif:${gifTitle}` }])
            }}
          />
        </div>
      )}
    </>
  )
}

export function ProfileWall({ profileId, isOwnProfile: isOwnProfileProp, viewerProfileId, profileName, walletAddress, userHandle, highlightPostId, onSetProfileSong, onAddToPlaylist }: ProfileWallProps) {
  // Belt-and-suspenders: if parent says it's own profile OR viewer ID matches wall owner, treat as own
  const isOwnProfile = isOwnProfileProp || (Boolean(viewerProfileId) && viewerProfileId === profileId)
  const [body, setBody] = useState('')
  const [bodyCursor, setBodyCursor] = useState(0)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [replyCursor, setReplyCursor] = useState(0)
  const replyRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(1)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const { playlistState } = useAudioPlayerContext()

  // Wall post input state
  const [postStickers, setPostStickers] = useState<Array<{url: string, name: string}>>([])
  const [postEmbedUrl, setPostEmbedUrl] = useState('')
  const [showPostEmoji, setShowPostEmoji] = useState(false)
  const [showPostSticker, setShowPostSticker] = useState(false)
  const [showPostGif, setShowPostGif] = useState(false)
  const [showPostEmbed, setShowPostEmbed] = useState(false)

  // Media upload state
  const [postMediaUrl, setPostMediaUrl] = useState<string | null>(null)
  const [postMediaType, setPostMediaType] = useState<string | null>(null)
  const [postMediaPreview, setPostMediaPreview] = useState<string | null>(null)
  const [postMediaFileName, setPostMediaFileName] = useState<string | null>(null)
  const [postCoverArtUrl, setPostCoverArtUrl] = useState<string | null>(null)
  const [postCoverArtPreview, setPostCoverArtPreview] = useState<string | null>(null)
  const [postThumbnailUrl, setPostThumbnailUrl] = useState<string | null>(null)
  const [showMediaDropzone, setShowMediaDropzone] = useState(false)
  const [showWallStoryModal, setShowWallStoryModal] = useState(false)

  // Upload hooks
  const { uploading: mediaUploading, upload: uploadMedia } = useUpload()
  const { uploading: coverArtUploading, upload: uploadCoverArt } = useUpload()
  const coverArtInputRef = useRef<HTMLInputElement>(null)

  // Edit state
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')

  // Reply input state
  const [replyStickers, setReplyStickers] = useState<Array<{url: string, name: string}>>([])
  const [replyEmbedUrl, setReplyEmbedUrl] = useState('')
  const [showReplyEmoji, setShowReplyEmoji] = useState(false)
  const [showReplySticker, setShowReplySticker] = useState(false)
  const [showReplyGif, setShowReplyGif] = useState(false)
  const [showReplyEmbed, setShowReplyEmbed] = useState(false)

  // @mention autocomplete handlers
  const handleBodyMentionSelect = useCallback((handle: string) => {
    const el = bodyRef.current
    if (!el) return
    const before = body.slice(0, bodyCursor)
    const after = body.slice(bodyCursor)
    const mentionStart = before.lastIndexOf('@')
    if (mentionStart === -1) return
    const newBody = before.slice(0, mentionStart) + '@' + handle + ' ' + after
    setBody(newBody)
    const newCursor = mentionStart + handle.length + 2
    setBodyCursor(newCursor)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(newCursor, newCursor) })
  }, [body, bodyCursor])

  const handleReplyMentionSelect = useCallback((handle: string) => {
    const el = replyRef.current
    if (!el) return
    const before = replyBody.slice(0, replyCursor)
    const after = replyBody.slice(replyCursor)
    const mentionStart = before.lastIndexOf('@')
    if (mentionStart === -1) return
    const newBody = before.slice(0, mentionStart) + '@' + handle + ' ' + after
    setReplyBody(newBody)
    const newCursor = mentionStart + handle.length + 2
    setReplyCursor(newCursor)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(newCursor, newCursor) })
  }, [replyBody, replyCursor])

  const toggle = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  // Capture video thumbnail from a video file
  const captureVideoThumbnail = useCallback(async (videoFile: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.src = URL.createObjectURL(videoFile)
      video.muted = true
      video.playsInline = true
      const cleanup = () => { URL.revokeObjectURL(video.src) }
      video.onloadeddata = () => { video.currentTime = Math.min(1, video.duration * 0.1) }
      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')?.drawImage(video, 0, 0)
        canvas.toBlob((blob) => { cleanup(); resolve(blob) }, 'image/jpeg', 0.85)
      }
      video.onerror = () => { cleanup(); resolve(null) }
      setTimeout(() => { cleanup(); resolve(null) }, 10000)
    })
  }, [])

  // Handle media file drop/select
  const onMediaDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]
    const mediaType = getMediaTypeFromMime(file.type)

    setPostMediaPreview(URL.createObjectURL(file))
    setPostMediaType(mediaType)
    setPostMediaFileName(file.name)

    try {
      const url = await uploadMedia([file])
      if (url) setPostMediaUrl(url)

      // Capture video thumbnail
      if (mediaType === 'video') {
        const thumbBlob = await captureVideoThumbnail(file)
        if (thumbBlob) {
          const thumbFile = new File([thumbBlob], 'thumb.jpg', { type: 'image/jpeg' })
          const thumbUrl = await uploadCoverArt([thumbFile])
          if (thumbUrl) setPostThumbnailUrl(thumbUrl)
        }
      }
    } catch {
      toast.error('Upload failed')
      clearMedia()
    }
  }, [uploadMedia, uploadCoverArt, captureVideoThumbnail])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onMediaDrop,
    accept: wallAcceptedTypes,
    maxFiles: 1,
    maxSize: 1073741824, // 1GB easter egg
    noClick: false,
    noKeyboard: false,
  })

  // Handle cover art selection for audio posts
  const onCoverArtSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPostCoverArtPreview(URL.createObjectURL(file))
    try {
      const url = await uploadCoverArt([file])
      if (url) setPostCoverArtUrl(url)
    } catch {
      toast.error('Cover art upload failed')
    }
  }, [uploadCoverArt])

  const clearMedia = () => {
    setPostMediaUrl(null)
    setPostMediaType(null)
    setPostMediaPreview(null)
    setPostMediaFileName(null)
    setPostCoverArtUrl(null)
    setPostCoverArtPreview(null)
    setPostThumbnailUrl(null)
    setShowMediaDropzone(false)
  }

  // Share modal state (matches PostActions pattern)
  const [shareModalPost, setShareModalPost] = useState<{ id: string; body?: string; mediaUrl?: string; mediaType?: string; coverArtUrl?: string; mediaTitle?: string; isReply?: boolean; parentId?: string } | null>(null)
  const [storyModalPost, setStoryModalPost] = useState<{ mediaUrl: string; mediaType: string; body?: string; authorName?: string; audioUrl?: string; audioTitle?: string; audioArtist?: string; audioCoverUrl?: string; needsGeneratedCard?: boolean } | null>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  React.useEffect(() => { setPortalContainer(document.body) }, [])

  // Wall posts — Vercel direct (Phase 6c: kills Apollo/Lambda dependency)
  const [wallData, setWallData] = useState<any>(null)
  const [wallLoading, setWallLoading] = useState(true)
  const refetchWall = React.useCallback(async () => {
    if (!profileId) return
    try {
      const r = await fetch(`/api/wall/posts?profileId=${profileId}&limit=${20 * page}`, { credentials: 'include' })
      if (r.ok) setWallData(await r.json())
    } catch {} finally { setWallLoading(false) }
  }, [profileId, page])
  React.useEffect(() => { setWallLoading(true); refetchWall() }, [refetchWall])
  const data = wallData
  const loading = wallLoading
  const refetch = refetchWall

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
      fetchFollowing({ variables: { profileId, page: { first: 12 } } })
    }
    if (profileId && !followersCalled) {
      fetchFollowers({ variables: { profileId, page: { first: 200 } } })
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

  const [posting, setPosting] = useState(false)
  const createWallPost = async ({ variables }: { variables: any }) => {
    setPosting(true)
    try {
      const resp = await fetch('/api/wall/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }))
        throw new Error(err.error || 'Post failed')
      }
      setBody('')
      setPostStickers([])
      setPostEmbedUrl('')
      setShowPostEmoji(false)
      setShowPostSticker(false)
      setShowPostEmbed(false)
      clearMedia()
      setReplyingTo(null)
      setReplyBody('')
      setReplyStickers([])
      setReplyEmbedUrl('')
      setShowReplyEmoji(false)
      setShowReplySticker(false)
      setShowReplyEmbed(false)
      refetch()
    } catch (err: any) {
      console.error('[WallPost] Error:', err)
      toast.error(`Post failed: ${err?.message || 'Unknown error'}`)
    } finally {
      setPosting(false)
    }
  }

  // Wall mutations — Vercel direct (Phase 6c)
  const postJson = React.useCallback(async (url: string, payload: any) => {
    const r = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }))
      throw new Error(err.error || 'Request failed')
    }
    return r.json()
  }, [])

  const deleteWallPost = async ({ variables }: { variables: { wallPostId: string } }) => {
    try {
      await postJson('/api/wall/delete', variables)
      refetch()
    } catch (err: any) {
      toast.error(`Delete failed: ${err?.message || 'Unknown error'}`)
    }
  }

  const pinWallPost = async ({ variables }: { variables: { wallPostId: string } }) => {
    try {
      await postJson('/api/wall/pin', variables)
      refetch()
    } catch (err: any) {
      toast.error(`Pin failed: ${err?.message || 'Unknown error'}`)
    }
  }

  const [updating, setUpdating] = useState(false)
  const updateWallPost = async ({ variables }: { variables: { wallPostId: string; body: string } }) => {
    setUpdating(true)
    try {
      await postJson('/api/wall/update', variables)
      setEditingPostId(null)
      setEditBody('')
      refetch()
    } catch (err: any) {
      toast.error(`Update failed: ${err?.message || 'Unknown error'}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleSubmit = () => {
    // Combine text + sticker markdown + embed URL (same pattern as WaveformWithComments)
    const stickerMarkdown = postStickers.map(s => `![emote:${s.name}](${s.url})`).join(' ')
    const finalBody = [body.trim(), stickerMarkdown, postEmbedUrl.trim()].filter(Boolean).join(' ')
    if (!finalBody && !postMediaUrl) return
    // Strip file extension from filename for a clean audio title
    const cleanMediaTitle = postMediaFileName
      ? postMediaFileName.replace(/\.[^.]+$/, '')
      : undefined
    createWallPost({
      variables: {
        profileId,
        body: finalBody || undefined,
        mediaUrl: postMediaUrl || undefined,
        mediaType: postMediaType || undefined,
        coverArtUrl: postCoverArtUrl || undefined,
        mediaThumbnailUrl: postThumbnailUrl || undefined,
        mediaTitle: cleanMediaTitle || undefined,
      },
    })
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

  // ── Deep-link: scroll to and highlight a specific wall post ──
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  useEffect(() => {
    if (!highlightPostId || loading || sortedPosts.length === 0) return
    // Wait a tick for DOM to render
    const timer = setTimeout(() => {
      const el = document.getElementById(`wall-post-${highlightPostId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightedId(highlightPostId)
        // Remove highlight after 3 seconds
        setTimeout(() => setHighlightedId(null), 3000)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightPostId, loading, sortedPosts.length])

  const displayName = profileName || 'This user'

  // Normalize a raw URL into an embeddable URL for iframe-based platforms
  const getEmbedUrl = (url: string): string => {
    let embedUrl = url.replace(/^http:/, 'https:')
    // Spotify: open.spotify.com/track/X → open.spotify.com/embed/track/X with autoplay
    if (/open\.spotify\.com\/(?!embed\/)/.test(embedUrl)) {
      embedUrl = embedUrl.replace('open.spotify.com/', 'open.spotify.com/embed/') + '?autoplay=1'
    } else if (embedUrl.includes('spotify.com/embed/') && !embedUrl.includes('autoplay')) {
      embedUrl = embedUrl + (embedUrl.includes('?') ? '&' : '?') + 'autoplay=1'
    }
    // SoundCloud: add ?visual=true for player embed (oEmbed fallback)
    if (/soundcloud\.com\//.test(embedUrl) && !embedUrl.includes('w.soundcloud.com')) {
      embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(embedUrl)}&color=%2306b6d4&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true`
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
  // Strategy: extract embed-able URLs (YouTube/Spotify/etc) for rich rendering,
  // then let EmoteRenderer handle ALL remaining text (emotes + plain URLs) in one pass.
  // This avoids splitting emote markdown like ![emote:X](cdn-url) on the URL part.
  const renderBody = (text: string) => {
    const hasEmotes = text.includes('![emote:') || text.includes('[!emote:') || text.includes('[emote:')

    // Strip emote markdown before looking for embed-able URLs
    const textWithoutEmotes = text.replace(/!?\[!?emote:[^\]]*\]\([^)]*\)/g, '')

    // Find embed-able URLs (YouTube, Vimeo, Spotify, SoundCloud, Bandcamp) in the non-emote text
    const embedUrlRegex = /https?:\/\/[^\s]+/g
    const embedUrls: string[] = []
    let urlMatch
    while ((urlMatch = embedUrlRegex.exec(textWithoutEmotes)) !== null) {
      const url = urlMatch[0]
      // Only extract URLs that are embed-able (have a recognized media source)
      const source = IdentifySource(url).type
      if (source) embedUrls.push(url)
    }

    // No embeds and no emotes — plain text
    if (embedUrls.length === 0 && !hasEmotes) {
      // Check for plain URLs to linkify
      if (/https?:\/\//.test(text)) {
        return <EmoteRenderer text={text} linkify />
      }
      return <span>{text}</span>
    }

    // No embed URLs — let EmoteRenderer handle emotes + linkify plain URLs
    if (embedUrls.length === 0) {
      return <EmoteRenderer text={text} linkify />
    }

    // Has embed URLs — extract them from the original text for rich rendering
    // Build segments: text chunks (rendered via EmoteRenderer) and embed URLs (rendered as players)
    const segments: { type: 'text' | 'embed'; content: string }[] = []
    let remaining = text

    for (const embedUrl of embedUrls) {
      const idx = remaining.indexOf(embedUrl)
      if (idx === -1) continue
      // Text before this embed URL
      const before = remaining.slice(0, idx)
      if (before.trim()) segments.push({ type: 'text', content: before })
      segments.push({ type: 'embed', content: embedUrl })
      remaining = remaining.slice(idx + embedUrl.length)
    }
    // Remaining text after all embeds
    if (remaining.trim()) segments.push({ type: 'text', content: remaining })

    return (
      <>
        {segments.map((seg, i) => {
          if (seg.type === 'text') {
            // EmoteRenderer handles emotes + linkifies any remaining plain URLs
            return <EmoteRenderer key={i} text={seg.content} linkify />
          }

          // Render embed URL as ReactPlayer or iframe
          const mediaUrl = seg.content.replace(/^http:/, 'https:')
          const isPlaylist = mediaUrl.includes('listType=playlist') || mediaUrl.includes('videoseries') || mediaUrl.includes('list=')
          const useReactPlayer = !isPlaylist && hasLazyLoadWithThumbnailSupport(seg.content)

          if (useReactPlayer) {
            const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
            return (
              <div key={i} className="relative w-full mt-2 mb-1 rounded-xl overflow-hidden"
                style={{ aspectRatio: '16/9' }}>
                <ReactPlayer
                  width="100%" height="100%"
                  url={mediaUrl} playsinline controls muted
                  playing
                  pip stopOnUnmount={false}
                  config={{
                    youtube: { playerVars: { modestbranding: 1, rel: 0, playsinline: 1, autoplay: 1, mute: 1, origin: typeof window !== 'undefined' ? window.location.origin : '' } },
                    vimeo: { playerOptions: { responsive: true, playsinline: true, autoplay: true, muted: true } },
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
    // Desktop = 3-col (Their Music+Following | centered Wall | Collection+Stats) via flex
    // order; mobile = single stacked column (rails fall below the wall, unchanged).
    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
      {/* CENTER — message board + wall posts, centered between the rails on desktop */}
      <div className="w-full lg:order-2 flex-1 min-w-0 lg:max-w-[640px] lg:mx-auto space-y-4">
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
              showGifPicker={showPostGif}
              setShowGifPicker={setShowPostGif}
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
              onMediaClick={() => setShowMediaDropzone(!showMediaDropzone)}
              showMediaActive={showMediaDropzone || !!postMediaUrl}
              onStoryClick={() => setShowWallStoryModal(true)}
            />

            {/* Media Upload Dropzone */}
            {showMediaDropzone && !postMediaUrl && (
              <div className="mt-2">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-green-400 bg-green-400/10' : 'border-neutral-600 hover:border-neutral-400 bg-neutral-800/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-6 h-6 text-neutral-400 mx-auto mb-1" />
                  <p className="text-xs text-neutral-400">
                    {isDragActive ? 'Drop file here' : 'Drop or tap to upload audio, image, or video'}
                  </p>
                  <p className="text-[9px] text-neutral-500 mt-0.5">MP3, WAV, FLAC, JPG, PNG, MP4, MOV</p>
                </div>
              </div>
            )}

            {/* Media Preview */}
            {postMediaUrl && (
              <div className="mt-2 relative">
                <button onClick={clearMedia} className="absolute top-1 right-1 z-10 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
                {postMediaType === 'image' && postMediaPreview && (
                  <img src={postMediaPreview} alt="" className="w-full max-h-48 object-cover rounded-xl" />
                )}
                {postMediaType === 'video' && postMediaPreview && (
                  <video src={postMediaPreview} className="w-full max-h-48 rounded-xl" controls muted />
                )}
                {postMediaType === 'audio' && (
                  <div className="flex items-center gap-3 p-3 bg-neutral-800 rounded-xl border border-neutral-700">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      {postCoverArtPreview ? (
                        <img src={postCoverArtPreview} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <Music className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{postMediaFileName || 'Audio file'}</p>
                      {mediaUploading ? (
                        <p className="text-[9px] text-cyan-400">Uploading...</p>
                      ) : (
                        <p className="text-[9px] text-green-400">Ready</p>
                      )}
                    </div>
                    {!postCoverArtUrl && (
                      <button
                        type="button"
                        onClick={() => coverArtInputRef.current?.click()}
                        className="text-[9px] text-cyan-400 hover:text-cyan-300 bg-neutral-700 hover:bg-neutral-600 px-2 py-1 rounded-lg flex items-center gap-1 flex-shrink-0"
                      >
                        <ImageIcon className="w-3 h-3" />
                        Cover Art
                      </button>
                    )}
                    {postCoverArtUrl && (
                      <button
                        type="button"
                        onClick={() => { setPostCoverArtUrl(null); setPostCoverArtPreview(null) }}
                        className="text-[9px] text-red-400 hover:text-red-300 flex-shrink-0"
                      >
                        Remove Art
                      </button>
                    )}
                    <input
                      ref={coverArtInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={onCoverArtSelect}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Uploading indicator */}
            {(mediaUploading || coverArtUploading) && (
              <div className="mt-1 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[9px] text-cyan-400">
                  {coverArtUploading ? 'Uploading cover art...' : 'Uploading media...'}
                </span>
              </div>
            )}

            <div className="relative mt-2">
              <MentionAutocomplete
                text={body}
                cursorPosition={bodyCursor}
                onSelect={handleBodyMentionSelect}
                inputRef={bodyRef}
              />
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value)
                  setBodyCursor(e.target.selectionStart || 0)
                }}
                onSelect={(e) => setBodyCursor((e.target as HTMLTextAreaElement).selectionStart || 0)}
                placeholder={`Write on ${profileName || 'their'} wall...`}
                className="w-full bg-transparent text-white placeholder-gray-500 resize-none outline-none text-sm min-h-[60px]"
                maxLength={1000}
              />
            </div>
            <div className="flex items-center justify-end mt-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={(!body.trim() && postStickers.length === 0 && !postEmbedUrl.trim() && !postMediaUrl) || posting || mediaUploading || coverArtUploading}
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
            {sortedPosts.map((post: any, postIndex: number) => {
              const isFirstAudioPost = post.mediaType === 'audio' && post.mediaUrl && sortedPosts.findIndex((p: any) => p.mediaType === 'audio' && p.mediaUrl) === postIndex
              return (
              <div key={post.id} id={`wall-post-${post.id}`} className={`p-3.5 rounded-2xl border transition-all duration-500 ${highlightedId === post.id ? 'border-cyan-400/60 bg-cyan-500/10 ring-2 ring-cyan-400/40' : post.pinned ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-white/10 bg-white/[0.03]'}`}>
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
                    {editingPostId === post.id ? (
                      <div className="mt-1">
                        <textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          className="w-full bg-neutral-800 border border-cyan-500/40 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500 transition-colors resize-none min-h-[60px]"
                          maxLength={1000}
                          autoFocus
                        />
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            onClick={() => {
                              if (!editBody.trim()) return
                              updateWallPost({ variables: { wallPostId: post.id, body: editBody.trim() } })
                            }}
                            disabled={!editBody.trim() || updating}
                            className="text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            {updating ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => { setEditingPostId(null); setEditBody('') }}
                            className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                          <span className={`text-[9px] ml-auto ${editBody.length > 800 ? 'text-amber-400' : 'text-neutral-500'}`}>
                            {editBody.length}/1000
                          </span>
                        </div>
                      </div>
                    ) : (
                      post.body && <div className="text-gray-300 text-sm mt-1 whitespace-pre-wrap break-words">{renderBody(post.body)}</div>
                    )}
                    <WallPostMedia post={post} autoPlayAudio={isFirstAudioPost} />

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                      <button
                        onClick={() => viewerProfileId ? setShareModalPost({ id: post.id, body: post.body, mediaUrl: post.mediaUrl, mediaType: post.mediaType, coverArtUrl: post.coverArtUrl, mediaTitle: post.mediaTitle }) : (() => {
                          const url = `${window.location.origin}/users/${userHandle || profileId}?wall=${post.id}`
                          if (navigator.share) { navigator.share({ title: 'SoundChain', text: post.body?.slice(0, 100) || 'Check out this wall post', url }).catch(() => {}) }
                          else { navigator.clipboard.writeText(url).then(() => toast.success('Link copied!')).catch(() => {}) }
                        })()}
                        className="text-gray-500 hover:text-green-400 text-xs flex items-center gap-1 transition-colors"
                      >
                        <Share2 className="w-3 h-3" />
                        Share
                      </button>
                      {viewerProfileId && (() => {
                        const embedUrl = !post.mediaUrl ? getEmbedUrlFromBody(post.body) : null
                        const gifUrl = !post.mediaUrl && !embedUrl ? getGifUrlFromBody(post.body) : null
                        return (
                          <button
                            onClick={() => {
                              if (embedUrl) {
                                setStoryModalPost({ mediaUrl: embedUrl, mediaType: 'video', body: post.body, authorName: post.author?.displayName })
                              } else if (gifUrl) {
                                setStoryModalPost({ mediaUrl: gifUrl, mediaType: 'image', body: post.body, authorName: post.author?.displayName })
                              } else if (post.mediaUrl) {
                                setStoryModalPost({
                                  mediaUrl: post.mediaType === 'audio' ? (post.coverArtUrl || '') : post.mediaUrl,
                                  mediaType: post.mediaType === 'audio' ? 'image' : post.mediaType,
                                  body: post.body,
                                  authorName: post.author?.displayName,
                                  ...(post.mediaType === 'audio' ? {
                                    audioUrl: post.mediaUrl,
                                    audioTitle: post.mediaTitle || post.body?.slice(0, 60) || 'Wall Post',
                                    audioArtist: post.author?.displayName || '',
                                    audioCoverUrl: post.coverArtUrl || '',
                                    needsGeneratedCard: !post.coverArtUrl,
                                  } : {}),
                                })
                              } else {
                                setStoryModalPost({ mediaUrl: '', mediaType: 'image', body: post.body, authorName: post.author?.displayName, needsGeneratedCard: true })
                              }
                            }}
                            className="text-gray-500 hover:text-cyan-400 text-xs flex items-center gap-1 transition-colors"
                            title="Share to Story"
                          >
                            <Film className="w-3 h-3" />
                            Story
                          </button>
                        )
                      })()}
                      {post.authorProfileId === viewerProfileId && (
                        <button
                          onClick={() => {
                            setEditingPostId(editingPostId === post.id ? null : post.id)
                            setEditBody(post.body || '')
                          }}
                          className={`text-xs flex items-center gap-1 transition-colors ${editingPostId === post.id ? 'text-cyan-400' : 'text-gray-500 hover:text-cyan-400'}`}
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                      )}
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
                      {isOwnProfile && post.mediaType === 'audio' && post.mediaUrl && onSetProfileSong && (
                        <button
                          onClick={() => onSetProfileSong({
                            url: post.mediaUrl,
                            title: post.mediaTitle || post.body?.split('\n')[0]?.slice(0, 80) || 'Audio',
                            artist: post.author?.displayName || '',
                            coverUrl: post.coverArtUrl,
                          })}
                          className="text-gray-500 hover:text-amber-400 text-xs flex items-center gap-1 transition-colors"
                          title="Set as Profile Song"
                        >
                          <Headphones className="w-3 h-3" />
                          Profile Song
                        </button>
                      )}
                      {isOwnProfile && post.mediaType === 'audio' && post.mediaUrl && onAddToPlaylist && (
                        <button
                          onClick={() => onAddToPlaylist({
                            url: post.mediaUrl,
                            title: post.mediaTitle || post.body?.split('\n')[0]?.slice(0, 80) || 'Audio',
                            artist: post.author?.displayName || '',
                            coverUrl: post.coverArtUrl,
                            wallPostId: post.id,
                          })}
                          className="text-gray-500 hover:text-purple-400 text-xs flex items-center gap-1 transition-colors"
                          title="Add to Profile Playlist"
                        >
                          <Plus className="w-3 h-3" />
                          Playlist
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
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-white text-xs">{reply.author?.displayName}</span>
                                <span className="text-gray-600 text-[10px]">
                                  {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              {editingPostId === reply.id ? (
                                <div className="mt-0.5">
                                  <textarea
                                    value={editBody}
                                    onChange={(e) => setEditBody(e.target.value)}
                                    className="w-full bg-neutral-800 border border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-cyan-500 transition-colors resize-none min-h-[40px]"
                                    maxLength={1000}
                                    autoFocus
                                  />
                                  <div className="flex items-center gap-2 mt-1">
                                    <button
                                      onClick={() => {
                                        if (!editBody.trim()) return
                                        updateWallPost({ variables: { wallPostId: reply.id, body: editBody.trim() } })
                                      }}
                                      disabled={!editBody.trim() || updating}
                                      className="text-[10px] flex items-center gap-0.5 text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition-colors"
                                    >
                                      <Check className="w-2.5 h-2.5" />
                                      {updating ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                      onClick={() => { setEditingPostId(null); setEditBody('') }}
                                      className="text-[10px] flex items-center gap-0.5 text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                reply.body && <div className="text-gray-300 text-xs mt-0.5 whitespace-pre-wrap break-words">{renderBody(reply.body)}</div>
                              )}
                              <WallPostMedia post={reply} small />
                              {/* Reply action buttons — reply + share + story + delete */}
                              <div className="flex items-center gap-2.5 mt-1.5">
                                <button
                                  onClick={() => {
                                    setReplyingTo(replyingTo === post.id ? null : post.id)
                                    setReplyBody('')
                                    setReplyStickers([])
                                    setReplyEmbedUrl('')
                                  }}
                                  className="text-gray-600 hover:text-cyan-400 text-[10px] flex items-center gap-0.5 transition-colors"
                                >
                                  <MessageCircle className="w-2.5 h-2.5" />
                                  Reply
                                </button>
                                <button
                                  onClick={() => viewerProfileId ? setShareModalPost({ id: reply.id, body: reply.body, mediaUrl: reply.mediaUrl, mediaType: reply.mediaType, mediaTitle: reply.mediaTitle, isReply: true, parentId: post.id }) : (() => {
                                    const url = `${window.location.origin}/users/${userHandle || profileId}?wall=${post.id}`
                                    if (navigator.share) { navigator.share({ title: 'SoundChain', text: reply.body?.slice(0, 100) || 'Check out this wall post', url }).catch(() => {}) }
                                    else { navigator.clipboard.writeText(url).then(() => toast.success('Link copied!')).catch(() => {}) }
                                  })()}
                                  className="text-gray-600 hover:text-green-400 text-[10px] flex items-center gap-0.5 transition-colors"
                                >
                                  <Share2 className="w-2.5 h-2.5" />
                                  Share
                                </button>
                                {viewerProfileId && (() => {
                                  const replyEmbedUrl = !reply.mediaUrl ? getEmbedUrlFromBody(reply.body) : null
                                  const replyGifUrl = !reply.mediaUrl && !replyEmbedUrl ? getGifUrlFromBody(reply.body) : null
                                  return (
                                    <button
                                      onClick={() => {
                                        if (replyEmbedUrl) {
                                          setStoryModalPost({ mediaUrl: replyEmbedUrl, mediaType: 'video', body: reply.body, authorName: reply.author?.displayName })
                                        } else if (replyGifUrl) {
                                          setStoryModalPost({ mediaUrl: replyGifUrl, mediaType: 'image', body: reply.body, authorName: reply.author?.displayName })
                                        } else if (reply.mediaUrl) {
                                          setStoryModalPost({
                                            mediaUrl: reply.mediaType === 'audio' ? (reply.coverArtUrl || '') : reply.mediaUrl,
                                            mediaType: reply.mediaType === 'audio' ? 'image' : reply.mediaType,
                                            body: reply.body,
                                            authorName: reply.author?.displayName,
                                            ...(reply.mediaType === 'audio' ? {
                                              audioUrl: reply.mediaUrl,
                                              audioTitle: reply.mediaTitle || reply.body?.slice(0, 60) || 'Wall Post',
                                              audioArtist: reply.author?.displayName || '',
                                              audioCoverUrl: reply.coverArtUrl || '',
                                              needsGeneratedCard: !reply.coverArtUrl,
                                            } : {}),
                                          })
                                        } else {
                                          setStoryModalPost({ mediaUrl: '', mediaType: 'image', body: reply.body, authorName: reply.author?.displayName, needsGeneratedCard: true })
                                        }
                                      }}
                                      className="text-gray-600 hover:text-cyan-400 text-[10px] flex items-center gap-0.5 transition-colors"
                                      title="Share to Story"
                                    >
                                      <Film className="w-2.5 h-2.5" />
                                      Story
                                    </button>
                                  )
                                })()}
                                {reply.authorProfileId === viewerProfileId && (
                                  <button
                                    onClick={() => {
                                      setEditingPostId(editingPostId === reply.id ? null : reply.id)
                                      setEditBody(reply.body || '')
                                    }}
                                    className={`text-[10px] flex items-center gap-0.5 transition-colors ${editingPostId === reply.id ? 'text-cyan-400' : 'text-gray-600 hover:text-cyan-400'}`}
                                  >
                                    <Pencil className="w-2.5 h-2.5" />
                                    Edit
                                  </button>
                                )}
                                {(reply.authorProfileId === viewerProfileId || isOwnProfile) && (
                                  <button
                                    onClick={() => deleteWallPost({ variables: { wallPostId: reply.id } })}
                                    className="text-gray-600 hover:text-red-400 text-[10px] flex items-center gap-0.5 transition-colors"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                    Delete
                                  </button>
                                )}
                              </div>
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
                              <MentionAutocomplete
                                text={replyBody}
                                cursorPosition={replyCursor}
                                onSelect={handleReplyMentionSelect}
                                inputRef={replyRef}
                              />
                              <input
                                ref={replyRef}
                                value={replyBody}
                                onChange={(e) => {
                                  setReplyBody(e.target.value)
                                  setReplyCursor(e.target.selectionStart || 0)
                                }}
                                onSelect={(e) => setReplyCursor((e.target as HTMLInputElement).selectionStart || 0)}
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
                              showGifPicker={showReplyGif}
                              setShowGifPicker={setShowReplyGif}
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
                              onStoryClick={() => setShowWallStoryModal(true)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )})}
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

      {/* Share Post Modal (DM share sheet — matches PostActions) */}
      {portalContainer && shareModalPost && createPortal(
        <SharePostModal
          isOpen={!!shareModalPost}
          onClose={() => setShareModalPost(null)}
          postId={shareModalPost.id}
          postBody={shareModalPost.body}
          customUrl={typeof window !== 'undefined' ? `${window.location.origin}/users/${userHandle || profileId}?wall=${shareModalPost.isReply && shareModalPost.parentId ? shareModalPost.parentId : shareModalPost.id}` : undefined}
          onShareToStory={() => {
            const shareEmbedUrl = !shareModalPost.mediaUrl ? getEmbedUrlFromBody(shareModalPost.body) : null
            const shareGifUrl = !shareModalPost.mediaUrl && !shareEmbedUrl ? getGifUrlFromBody(shareModalPost.body) : null
            if (shareEmbedUrl) {
              const shareEmbedThumb = getYouTubeThumbnail(shareEmbedUrl)
              setStoryModalPost({
                mediaUrl: shareEmbedThumb || '',
                mediaType: shareEmbedThumb ? 'image' : 'video',
                body: shareModalPost.body,
                authorName: profileName,
                needsGeneratedCard: !shareEmbedThumb,
              })
            } else if (shareGifUrl) {
              setStoryModalPost({ mediaUrl: shareGifUrl, mediaType: 'image', body: shareModalPost.body, authorName: profileName })
            } else if (shareModalPost.mediaUrl) {
              setStoryModalPost({
                mediaUrl: shareModalPost.mediaType === 'audio' ? (shareModalPost.coverArtUrl || '') : shareModalPost.mediaUrl!,
                mediaType: shareModalPost.mediaType === 'audio' ? 'image' : shareModalPost.mediaType!,
                body: shareModalPost.body,
                authorName: profileName,
                ...(shareModalPost.mediaType === 'audio' ? {
                  audioUrl: shareModalPost.mediaUrl!,
                  audioTitle: shareModalPost.mediaTitle || shareModalPost.body?.slice(0, 60) || 'Wall Post',
                  audioArtist: profileName || '',
                  audioCoverUrl: shareModalPost.coverArtUrl || '',
                  needsGeneratedCard: !shareModalPost.coverArtUrl,
                } : {}),
              })
            } else {
              setStoryModalPost({ mediaUrl: '', mediaType: 'image', body: shareModalPost.body, authorName: profileName, needsGeneratedCard: true })
            }
            setShareModalPost(null)
          }}
        />,
        portalContainer
      )}

      {/* Create Story Modal (Share to Story — matches PostActions) */}
      {portalContainer && storyModalPost && createPortal(
        <CreateStoryModal
          isOpen={!!storyModalPost}
          onClose={() => setStoryModalPost(null)}
          prefillMedia={{
            url: storyModalPost.mediaUrl,
            type: storyModalPost.mediaType as 'image' | 'video',
            caption: storyModalPost.body || undefined,
            authorName: storyModalPost.authorName || undefined,
            audioUrl: storyModalPost.audioUrl,
            audioTitle: storyModalPost.audioTitle,
            audioArtist: storyModalPost.audioArtist,
            audioCoverUrl: storyModalPost.audioCoverUrl,
            needsGeneratedCard: storyModalPost.needsGeneratedCard,
          }}
        />,
        portalContainer
      )}

      {/* Create Story Modal (from Reel pill in input toolbar) */}
      {showWallStoryModal && (
        <CreateStoryModal
          isOpen={showWallStoryModal}
          onClose={() => setShowWallStoryModal(false)}
        />
      )}

      </div>{/* end CENTER */}

      {/* LEFT RAIL — Their Music + Following (desktop); stacks under the wall on mobile */}
      <aside className="w-full lg:w-[300px] lg:order-1 lg:flex-shrink-0 min-w-0 space-y-3">

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
                      href={user.userHandle ? `/users/${user.userHandle}` : '#'}
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

        </aside>{/* end LEFT RAIL */}

        {/* RIGHT RAIL — Their Collection + Stats (desktop); stacks on mobile */}
        <aside className="w-full lg:w-[340px] lg:order-3 lg:flex-shrink-0 min-w-0 space-y-3">

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
      </aside>{/* end RIGHT RAIL */}
    </div>
  )
}

export default ProfileWall
