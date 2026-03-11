'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Pause, Heart, Share2, Clock, X, Trash2, ExternalLink, Music, Loader2, Plus, Search, SkipBack, SkipForward, Link2, Import, Check, CheckSquare, Square, Camera, MessageSquare, Film, Copy } from 'lucide-react'
import { useAudioPlayerContext, Song } from 'hooks/useAudioPlayer'
import { GetUserPlaylistsQuery, useDeletePlaylistItemMutation, useDeletePlaylistMutation, useTogglePlaylistFavoriteMutation, useCreatePlaylistTracksMutation, useExploreTracksQuery, PlaylistTrackSourceType, TrackDocument, SortExploreTracksField, SortOrder, useAddPlaylistItemMutation, useUpdatePlaylistMutation } from 'lib/graphql'
import { useApolloClient } from '@apollo/client'
import Asset from 'components/Asset/Asset'
import { useUpload } from 'hooks/useUpload'
import { useRouter } from 'next/router'
import { useModalDispatch } from 'contexts/ModalContext'
import { toast } from 'react-toastify'
import dynamic from 'next/dynamic'

const CreateStoryModal = dynamic(() => import('components/dex/CreateStoryModal').then(m => ({ default: m.CreateStoryModal })), { ssr: false })

// Extract URL from Bandcamp iframe embed code
// Bandcamp shares as HTML: <iframe ... src="https://bandcamp.com/EmbeddedPlayer/..." ...></iframe>
const extractBandcampUrl = (input: string): string | null => {
  // Check if it's an iframe embed code
  if (input.includes('<iframe') && input.includes('bandcamp.com')) {
    // Extract the src URL from the iframe
    const srcMatch = input.match(/src=["']([^"']+)["']/)
    if (srcMatch && srcMatch[1]) {
      return srcMatch[1]
    }
    // Also try to extract the album/track URL from the anchor tag inside
    const hrefMatch = input.match(/href=["'](https:\/\/[^"']*bandcamp\.com[^"']*)["']/)
    if (hrefMatch && hrefMatch[1]) {
      return hrefMatch[1]
    }
  }
  return null
}

// Normalize external link input - handles embed codes, cleans URLs
const normalizeExternalLink = (input: string): { url: string; isBandcampEmbed: boolean } => {
  const trimmed = input.trim()

  // Check for Bandcamp iframe embed
  const bandcampUrl = extractBandcampUrl(trimmed)
  if (bandcampUrl) {
    return { url: bandcampUrl, isBandcampEmbed: true }
  }

  // Return as-is for regular URLs
  return { url: trimmed, isBandcampEmbed: false }
}

// Platform detection from URL - returns platform info OR generic "External" for any URL
const detectPlatformFromUrl = (url: string): { platform: string; sourceType: PlaylistTrackSourceType } => {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return { platform: 'YouTube', sourceType: PlaylistTrackSourceType.Youtube }
    }
    if (hostname.includes('spotify.com')) {
      return { platform: 'Spotify', sourceType: PlaylistTrackSourceType.Spotify }
    }
    if (hostname.includes('soundcloud.com')) {
      return { platform: 'SoundCloud', sourceType: PlaylistTrackSourceType.Soundcloud }
    }
    if (hostname.includes('bandcamp.com')) {
      return { platform: 'Bandcamp', sourceType: PlaylistTrackSourceType.Bandcamp }
    }
    if (hostname.includes('music.apple.com')) {
      return { platform: 'Apple Music', sourceType: PlaylistTrackSourceType.AppleMusic }
    }
    if (hostname.includes('tidal.com')) {
      return { platform: 'Tidal', sourceType: PlaylistTrackSourceType.Tidal }
    }
    if (hostname.includes('vimeo.com')) {
      return { platform: 'Vimeo', sourceType: PlaylistTrackSourceType.Vimeo }
    }
    // Accept ANY external URL - use hostname as platform name
    return { platform: hostname.replace('www.', ''), sourceType: PlaylistTrackSourceType.Upload }
  } catch {
    // Even invalid URLs get accepted with generic type
    return { platform: 'External', sourceType: PlaylistTrackSourceType.Upload }
  }
}

type PlaylistType = GetUserPlaylistsQuery['getUserPlaylists']['nodes'][0]
type PlaylistTrackType = NonNullable<NonNullable<PlaylistType['tracks']>['nodes']>[0]

interface PlaylistDetailProps {
  playlist: PlaylistType
  onClose: () => void
  onDelete?: () => void
  isOwner?: boolean
  currentUserWallet?: string
}

// Helper to get embed URL for external sources - ALWAYS returns an embed URL (never null)
// Users must NEVER leave SoundChain - everything plays inline!
const getEmbedUrl = (url: string, sourceType: PlaylistTrackSourceType): string => {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://soundchain.fm'
    if (sourceType === PlaylistTrackSourceType.Youtube) {
      // Handle YouTube playlist URLs first (youtube.com/playlist?list=...)
      const playlistMatch = url.match(/[?&]list=([A-Za-z0-9_-]+)/)
      if (url.includes('/playlist') && playlistMatch) {
        return `https://www.youtube.com/embed/videoseries?list=${playlistMatch[1]}&autoplay=1&index=0&enablejsapi=1&origin=${origin}`
      }
      // Extract YouTube video ID — enablejsapi=1 allows us to receive postMessage events (ended, paused, etc.)
      const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
      if (match) {
        // Preserve playlist context if present (watch?v=VIDEO_ID&list=PLAYLIST_ID)
        const listParam = url.match(/[?&]list=([a-zA-Z0-9_-]+)/)
        const listSuffix = listParam ? `&list=${listParam[1]}&index=0` : ''
        return `https://www.youtube.com/embed/${match[1]}?autoplay=1&enablejsapi=1&origin=${origin}${listSuffix}`
      }
    }
    if (sourceType === PlaylistTrackSourceType.Spotify) {
      // Convert Spotify URLs to embed format
      const match = url.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/)
      if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}`
    }
    if (sourceType === PlaylistTrackSourceType.Soundcloud) {
      // SoundCloud widget with dark theme params
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&visual=true&color=%2306b6d4&buying=false&sharing=false&show_comments=false`
    }
    if (sourceType === PlaylistTrackSourceType.Vimeo) {
      const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
      if (match) return `https://player.vimeo.com/video/${match[1]}?autoplay=1`
    }
    if (sourceType === PlaylistTrackSourceType.AppleMusic) {
      // Apple Music embed
      return url.replace('music.apple.com', 'embed.music.apple.com')
    }
    if (sourceType === PlaylistTrackSourceType.Tidal) {
      // Tidal embed
      const match = url.match(/tidal\.com\/(?:browse\/)?(track|album|playlist)\/(\d+)/)
      if (match) return `https://embed.tidal.com/${match[1]}s/${match[2]}`
    }
    if (sourceType === PlaylistTrackSourceType.Bandcamp) {
      // If already an EmbeddedPlayer URL (from iframe paste), use as-is
      if (url.includes('/EmbeddedPlayer/')) return url
      // Regular bandcamp page URL — wrap in embed player
      return `https://bandcamp.com/EmbeddedPlayer/size=large/bgcol=333333/linkcol=e99708/tracklist=false/artwork=small/transparent=true/url=${encodeURIComponent(url)}/`
    }

    // For ALL other URLs - embed directly in iframe
    // This keeps users on SoundChain - no redirects!
    return url
  } catch (e) {
    console.error('Error parsing embed URL:', e)
    return url // Always return the URL for iframe embedding
  }
}

// Check if URL is a direct audio file that can be played natively
const isDirectAudioUrl = (url: string): boolean => {
  const lowerUrl = url.toLowerCase()
  return !!lowerUrl.match(/\.(mp3|wav|ogg|flac|aac|m4a)(\?|$)/)
}

// Validate YouTube video embeddability via oEmbed API
// Returns true if video can be embedded, false if unavailable/restricted
const validateYouTubeEmbeddable = async (videoId: string): Promise<boolean> => {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)
    // YouTube returns 401/403 for non-embeddable, 404 for non-existent
    return res.ok
  } catch {
    // Network error or timeout — allow save (don't block on flaky network)
    return true
  }
}

// Extract Bandcamp track title from EmbeddedPlayer URL or page
// EmbeddedPlayer URLs look like: bandcamp.com/EmbeddedPlayer/album=123/size=large/.../transparent=true/
// The title is NOT in the URL params — we need to fetch it from the page's og:title
const fetchBandcampTitle = async (url: string): Promise<string | null> => {
  try {
    // If it's an EmbeddedPlayer URL, try to extract the album/track page URL from it
    // and fetch og:title from there via our oembed proxy
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    // Use noembed which supports Bandcamp
    const res = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)
    if (res.ok) {
      const data = await res.json()
      if (data.title) {
        return data.author_name ? `${data.title} — ${data.author_name}` : data.title
      }
    }
    // Fallback: try to extract from URL path segments
    // e.g. https://artist.bandcamp.com/track/song-name
    const bcPageMatch = url.match(/([a-z0-9-]+)\.bandcamp\.com\/(?:track|album)\/([a-z0-9-]+)/i)
    if (bcPageMatch) {
      const artist = bcPageMatch[1].replace(/-/g, ' ')
      const track = bcPageMatch[2].replace(/-/g, ' ')
      return `${track} — ${artist}`
    }
    return null
  } catch {
    return null
  }
}

// Extract YouTube video ID from various URL formats
const extractYouTubeVideoId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

export const PlaylistDetail = ({ playlist, onClose, onDelete, isOwner = false, currentUserWallet }: PlaylistDetailProps) => {
  const apolloClient = useApolloClient()
  const router = useRouter()
  const { dispatchShowPostModal } = useModalDispatch()
  const { playlistState, currentSong, isPlaying, togglePlay, isCurrentSong } = useAudioPlayerContext()
  const [deletePlaylistItem] = useDeletePlaylistItemMutation()
  const [deletePlaylist] = useDeletePlaylistMutation()
  const [toggleFavorite] = useTogglePlaylistFavoriteMutation()
  const [createPlaylistTracks] = useCreatePlaylistTracksMutation()
  const [addPlaylistItem] = useAddPlaylistItemMutation()
  const [updatePlaylist] = useUpdatePlaylistMutation()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [coverArtUrl, setCoverArtUrl] = useState<string | null>(playlist.artworkUrl || null)
  const { preview: coverPreview, uploading: coverUploading, upload: uploadCover } = useUpload(
    coverArtUrl || undefined,
    async (url) => {
      setCoverArtUrl(url)
      try {
        await updatePlaylist({ variables: { input: { playlistId: playlist.id, artworkUrl: url } } })
        await apolloClient.refetchQueries({ include: ['GetUserPlaylists'] })
      } catch (err) {
        console.error('Failed to update cover art:', err)
      }
    }
  )
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) return
    try { await uploadCover([file]) } catch {}
  }
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showShareToast, setShowShareToast] = useState(false)
  const [showAddTracks, setShowAddTracks] = useState(false)
  const [addMode, setAddMode] = useState<'nft' | 'external' | 'import'>('nft')
  const [trackSearchQuery, setTrackSearchQuery] = useState('')
  const [externalLinkUrl, setExternalLinkUrl] = useState('')
  const [externalLinkTitle, setExternalLinkTitle] = useState('')
  const [addingTracks, setAddingTracks] = useState(false)
  const [addLinkError, setAddLinkError] = useState('')
  const [playError, setPlayError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFavorite, setIsFavorite] = useState(playlist.isFavorite || false)
  const [activeEmbed, setActiveEmbed] = useState<{ url: string; title: string; sourceType: PlaylistTrackSourceType } | null>(null)
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1)
  const [isPlayingAll, setIsPlayingAll] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')
  const [importedTracks, setImportedTracks] = useState<Array<{ title: string; url: string; thumbnail: string | null; selected: boolean }>>([])
  const [importPlatform, setImportPlatform] = useState('')
  const [importNote, setImportNote] = useState('')
  const [importAdding, setImportAdding] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showStoryModal, setShowStoryModal] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  // Local tracks state for optimistic updates (Bug #4 fix)
  const [localTracks, setLocalTracks] = useState<PlaylistTrackType[]>(playlist.tracks?.nodes || [])
  useEffect(() => {
    setLocalTracks(playlist.tracks?.nodes || [])
  }, [playlist.tracks?.nodes])
  const tracks = localTracks
  const existingTrackIds = new Set(tracks.map(t => t.trackId).filter(Boolean))

  // Close share menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false)
      }
    }
    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showShareMenu])

  // Sync queue state with global player on mount/reopen
  useEffect(() => {
    if (!currentSong?.trackId || tracks.length === 0) return
    const songId = currentSong.trackId
    // Match NFT tracks by trackId, external tracks by external_{id} pattern
    const matchIndex = tracks.findIndex((t, _i) => {
      if (t.trackId && songId === t.trackId) return true
      if (songId === `external_${t.id}`) return true
      return false
    })
    if (matchIndex >= 0) {
      setCurrentQueueIndex(matchIndex)
      setIsPlayingAll(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fetch metadata for NFT tracks that are missing title/artist
  const [nftTrackMeta, setNftTrackMeta] = useState<Record<string, { title: string; artist: string; artworkUrl: string | null; duration: number | null }>>({})

  useEffect(() => {
    const fetchMissing = async () => {
      const nftTracks = tracks.filter(t =>
        ((t.sourceType === PlaylistTrackSourceType.Nft || t.sourceType === null || t.sourceType === undefined) && t.trackId) &&
        (!t.title || !t.artist)
      )
      if (nftTracks.length === 0) return

      const meta: typeof nftTrackMeta = {}
      for (const pt of nftTracks) {
        if (!pt.trackId) continue
        try {
          const trackData = await fetchTrackData(pt.trackId)
          if (trackData) {
            meta[pt.trackId] = {
              title: trackData.title || 'Untitled',
              artist: trackData.artist || 'Unknown Artist',
              artworkUrl: trackData.artworkUrl || null,
              duration: trackData.duration || null,
            }
          }
        } catch {
          // ignore fetch errors
        }
      }
      if (Object.keys(meta).length > 0) {
        setNftTrackMeta(prev => ({ ...prev, ...meta }))
      }
    }
    fetchMissing()
  }, [tracks.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for external track events from AudioEngine
  useEffect(() => {
    const handleExternalTrack = (event: CustomEvent) => {
      const { sourceType, externalUrl, title } = event.detail
      console.log('[PlaylistDetail] External track event received:', { sourceType, externalUrl, title })

      // Map sourceType string back to enum
      const sourceTypeEnum = sourceType as PlaylistTrackSourceType
      const embedUrl = getEmbedUrl(externalUrl, sourceTypeEnum)

      // Always show inline embed - NEVER redirect users away from SoundChain!
      setActiveEmbed({ url: embedUrl, title: title || 'External Track', sourceType: sourceTypeEnum })
      setIsPlayingAll(true)
    }

    window.addEventListener('externalTrackPlay', handleExternalTrack as EventListener)
    return () => window.removeEventListener('externalTrackPlay', handleExternalTrack as EventListener)
  }, [])

  // BUG-001 FIX: Auto-advance when external embeds end
  // YouTube: IFrame API postMessage events (enablejsapi=1 on embed URL enables this)
  // Spotify: 30s preview timer (free embeds only play 30s snippets)
  useEffect(() => {
    if (!activeEmbed) return

    if (activeEmbed.sourceType === PlaylistTrackSourceType.Youtube) {
      const handleYouTubeMessage = (event: MessageEvent) => {
        if (typeof event.data !== 'string') return
        try {
          const data = JSON.parse(event.data)
          // YouTube state 0 = video ended
          if (data.event === 'onStateChange' && data.info === 0) {
            console.log('[PlaylistDetail] YouTube video ended, auto-advancing')
            playNextInQueue()
          }
        } catch {
          // Not a YouTube message
        }
      }

      window.addEventListener('message', handleYouTubeMessage)

      // Send "listening" command to YouTube iframe to subscribe to state changes
      const sendListening = () => {
        const iframe = document.querySelector('iframe[src*="youtube.com"]') as HTMLIFrameElement
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'sc-playlist' }), '*')
        }
      }
      const t1 = setTimeout(sendListening, 500)
      const t2 = setTimeout(sendListening, 2000)

      return () => {
        window.removeEventListener('message', handleYouTubeMessage)
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }

    // Spotify free embeds play ~30s previews then stop
    if (activeEmbed.sourceType === PlaylistTrackSourceType.Spotify) {
      const timer = setTimeout(() => {
        console.log('[PlaylistDetail] Spotify preview ended, auto-advancing')
        playNextInQueue()
      }, 35000)
      return () => clearTimeout(timer)
    }
  }, [activeEmbed?.url, currentQueueIndex, tracks.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Query for tracks to add
  const { data: searchTracksData, loading: searchLoading } = useExploreTracksQuery({
    variables: {
      page: { first: 50 },
      sort: { field: SortExploreTracksField.CreatedAt, order: SortOrder.Desc },
      search: trackSearchQuery || undefined,
    },
    skip: !showAddTracks,
  })

  const availableTracks = searchTracksData?.exploreTracks?.nodes || []

  // Add track to playlist
  const handleAddTrack = async (trackId: string) => {
    setAddingTracks(true)
    try {
      await createPlaylistTracks({
        variables: {
          input: {
            playlistId: playlist.id,
            trackIds: [trackId],
          },
        },
      })
      toast.success('Track added!')
      await apolloClient.refetchQueries({ include: ['GetUserPlaylists'] })
    } catch (err) {
      console.error('Failed to add track:', err)
    } finally {
      setAddingTracks(false)
    }
  }

  // Add external link to playlist - accepts URLs and Bandcamp embed codes
  const handleAddExternalLink = async () => {
    if (!externalLinkUrl.trim()) {
      setAddLinkError('Please enter a URL')
      return
    }

    // Normalize input - extract URL from Bandcamp iframe embeds
    const { url: normalizedUrl, isBandcampEmbed } = normalizeExternalLink(externalLinkUrl)

    // Basic URL validation
    try {
      new URL(normalizedUrl)
    } catch {
      setAddLinkError('Please enter a valid URL (e.g., https://example.com/audio) or Bandcamp embed code')
      return
    }

    // Detect platform from URL - now accepts ANY URL
    const detected = detectPlatformFromUrl(normalizedUrl)

    // Log for debugging
    console.log('[Playlist] Adding external link:', {
      original: externalLinkUrl.substring(0, 100),
      normalized: normalizedUrl,
      isBandcampEmbed,
      platform: detected.platform,
      sourceType: detected.sourceType,
    })

    setAddingTracks(true)
    setAddLinkError('')

    // BUG-001 FIX: Validate YouTube embeddability before saving
    if (detected.sourceType === PlaylistTrackSourceType.Youtube) {
      const videoId = extractYouTubeVideoId(normalizedUrl)
      if (videoId) {
        const embeddable = await validateYouTubeEmbeddable(videoId)
        if (!embeddable) {
          setAddLinkError('This YouTube video is unavailable or does not allow embedding. Please use a different link.')
          setAddingTracks(false)
          return
        }
      }
    }

    // BUG-003 FIX: Fetch oEmbed metadata for auto-title when user doesn't provide one
    let resolvedTitle = externalLinkTitle.trim()
    if (!resolvedTitle) {
      // BUG-002 FIX: Special handling for Bandcamp EmbeddedPlayer URLs
      // noembed.com doesn't understand EmbeddedPlayer URLs, so we use a dedicated fetcher
      if (detected.sourceType === PlaylistTrackSourceType.Bandcamp || normalizedUrl.includes('bandcamp.com')) {
        const bcTitle = await fetchBandcampTitle(normalizedUrl)
        if (bcTitle) {
          resolvedTitle = bcTitle
        }
      }

      // Generic oEmbed fallback for other platforms (or if Bandcamp fetch failed)
      if (!resolvedTitle) {
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 3000)
          const oembedRes = await fetch(
            `https://noembed.com/embed?url=${encodeURIComponent(normalizedUrl)}`,
            { signal: controller.signal }
          )
          clearTimeout(timeout)
          if (oembedRes.ok) {
            const oembed = await oembedRes.json()
            if (oembed.title) {
              resolvedTitle = oembed.author_name
                ? `${oembed.title} — ${oembed.author_name}`
                : oembed.title
            }
          }
        } catch {
          // oEmbed fetch failed (timeout, CORS, network) — use platform name as fallback
        }
      }
    }

    try {
      await addPlaylistItem({
        variables: {
          input: {
            playlistId: playlist.id,
            sourceType: detected.sourceType,
            externalUrl: normalizedUrl,
            title: resolvedTitle || detected.platform,
          },
        },
      })
      // Clear form, show toast, and refetch
      setExternalLinkUrl('')
      setExternalLinkTitle('')
      toast.success('Link added!')
      await apolloClient.refetchQueries({ include: ['GetUserPlaylists'] })
    } catch (err) {
      console.error('Failed to add external link:', err)
      setAddLinkError('Failed to add link. Please try again.')
    } finally {
      setAddingTracks(false)
    }
  }

  // Fetch track data to get playbackUrl
  const fetchTrackData = async (trackId: string) => {
    try {
      const { data } = await apolloClient.query({
        query: TrackDocument,
        variables: { id: trackId },
        fetchPolicy: 'cache-first',
      })
      return data?.track
    } catch (error) {
      console.error('Error fetching track:', error)
      return null
    }
  }

  // Build playable songs by fetching track data - NOW INCLUDES EXTERNAL LINKS
  const buildSongsWithPlaybackUrls = async (): Promise<Song[]> => {
    console.log('[PlaylistDetail] Building songs. Total tracks:', tracks.length)
    console.log('[PlaylistDetail] Tracks:', tracks.map(t => ({ id: t.id, sourceType: t.sourceType, trackId: t.trackId, title: t.title, externalUrl: t.externalUrl })))

    const songs: Song[] = []

    for (const pt of tracks) {
      console.log('[PlaylistDetail] Processing track:', { id: pt.id, sourceType: pt.sourceType, trackId: pt.trackId, externalUrl: pt.externalUrl?.substring(0, 50) })

      // NFT tracks: sourceType is 'nft' OR null (for backwards compatibility with old playlist tracks)
      if ((pt.sourceType === PlaylistTrackSourceType.Nft || pt.sourceType === null || pt.sourceType === undefined) && pt.trackId) {
        // NFT track - fetch playback URL
        const trackData = await fetchTrackData(pt.trackId)
        console.log('[PlaylistDetail] NFT track data:', { trackId: pt.trackId, hasPlaybackUrl: !!trackData?.playbackUrl, playbackUrl: trackData?.playbackUrl?.substring(0, 50) })

        if (trackData?.playbackUrl) {
          songs.push({
            trackId: pt.trackId,
            src: trackData.playbackUrl,
            art: trackData?.artworkUrl || pt.artworkUrl || undefined,
            title: trackData?.title || pt.title || 'Unknown',
            artist: trackData?.artist || pt.artist || 'Unknown Artist',
            isFavorite: trackData?.isFavorite || false,
          })
        } else {
          console.warn('[PlaylistDetail] NFT track missing playbackUrl:', pt.trackId, '- track may still be processing or have no audio uploaded')
          // Still add to queue as a placeholder so index mapping stays correct,
          // but mark it so AudioEngine skips it gracefully
          songs.push({
            trackId: pt.trackId,
            src: '', // Empty src — AudioEngine will skip/error and auto-advance
            art: trackData?.artworkUrl || pt.artworkUrl || undefined,
            title: trackData?.title || pt.title || 'Unknown',
            artist: trackData?.artist || pt.artist || 'Unknown Artist',
            isFavorite: false,
          })
        }
      } else if (pt.externalUrl || pt.uploadedFileUrl) {
        // External link - check if it's a direct audio file or needs embed
        const url = pt.externalUrl || pt.uploadedFileUrl!

        const resolvedTitle = resolveDisplayTitle(pt.title, url, pt.sourceType)
        const resolvedArtist = pt.artist || getSourceLabel(pt.sourceType)

        if (isDirectAudioUrl(url)) {
          // Direct audio file (MP3, WAV, etc.) - can play directly in audio player!
          songs.push({
            trackId: `external_${pt.id}`,
            src: url, // Direct URL, no EXTERNAL prefix needed
            art: pt.artworkUrl || undefined,
            title: resolvedTitle,
            artist: resolvedArtist,
            isFavorite: false,
          })
          console.log('[PlaylistDetail] Added direct audio URL:', resolvedTitle, url)
        } else {
          // Platform URL (YouTube, Spotify, etc.) - needs embed player
          songs.push({
            trackId: `external_${pt.id}`,
            src: `EXTERNAL:${pt.sourceType}:${url}`, // Special format for embed handling
            art: pt.artworkUrl || undefined,
            title: resolvedTitle,
            artist: resolvedArtist,
            isFavorite: false,
          })
          console.log('[PlaylistDetail] Added external platform track:', resolvedTitle, url)
        }
      }
    }

    console.log('[PlaylistDetail] Total playable songs (NFT + External):', songs.length)
    return songs
  }

  // Play a specific track in the queue (NFT or external)
  // ALWAYS routes through the unified audio engine queue so prev/next works
  // and SC audio is properly paused when external embeds play
  const playTrackAtIndex = async (index: number) => {
    if (index < 0 || index >= tracks.length) return

    const track = tracks[index]
    const isNftTrack = (track.sourceType === PlaylistTrackSourceType.Nft || !track.sourceType) && track.trackId

    setCurrentQueueIndex(index)
    setIsPlayingAll(true)

    // Close embed when transitioning to NFT track
    if (isNftTrack) {
      setActiveEmbed(null)
    }

    // Build unified queue and route through playlistState for ALL track types.
    // For NFT tracks: AudioEngine plays audio directly.
    // For external tracks: AudioEngine detects EXTERNAL: prefix, pauses audio,
    // dispatches externalTrackPlay event → our listener opens the embed.
    const songs = await buildSongsWithPlaybackUrls()

    // Find the matching song index in the built queue
    let songIndex = -1
    if (isNftTrack) {
      songIndex = songs.findIndex(s => s.trackId === track.trackId)
    } else {
      songIndex = songs.findIndex(s => s.trackId === `external_${track.id}`)
    }

    if (songIndex >= 0) {
      playlistState(songs, songIndex)
    }
  }

  // Play next track in queue
  const playNextInQueue = () => {
    if (currentQueueIndex < tracks.length - 1) {
      playTrackAtIndex(currentQueueIndex + 1)
    }
  }

  // Play previous track in queue
  const playPreviousInQueue = () => {
    if (currentQueueIndex > 0) {
      playTrackAtIndex(currentQueueIndex - 1)
    }
  }

  const handlePlayAll = async () => {
    setIsLoading(true)
    setPlayError('')
    setActiveEmbed(null) // Close any open embed

    try {
      console.log('[PlaylistDetail] handlePlayAll called. tracks.length:', tracks.length)

      if (tracks.length === 0) {
        setPlayError('No tracks in this playlist')
        return
      }

      // Build unified song list (NFT + External tracks)
      const songs = await buildSongsWithPlaybackUrls()
      console.log('[PlaylistDetail] Built unified queue with', songs.length, 'songs')

      if (songs.length === 0) {
        setPlayError('No playable tracks found. NFT tracks may still be processing, or external links need to be re-added.')
        return
      }

      // Start playing from the first track
      // The audio player will handle NFT tracks directly
      // External tracks will trigger the 'externalTrackPlay' event via AudioEngine
      setCurrentQueueIndex(0)
      setIsPlayingAll(true)
      playlistState(songs, 0)
    } catch (error) {
      console.error('Error loading tracks:', error)
      setPlayError('Error loading tracks. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlayTrack = async (index: number) => {
    const track = tracks[index]
    if (!track) return

    setIsLoading(true)
    setActiveEmbed(null) // Close any open embed

    try {
      // Build unified queue with all tracks
      const songs = await buildSongsWithPlaybackUrls()

      // Find the song in our unified queue
      // For NFT tracks, match by trackId
      // For external tracks, match by the special external_ID format
      let playableIndex = -1

      if (track.sourceType === PlaylistTrackSourceType.Nft && track.trackId) {
        playableIndex = songs.findIndex(s => s.trackId === track.trackId)
      } else if (track.externalUrl || track.uploadedFileUrl) {
        playableIndex = songs.findIndex(s => s.trackId === `external_${track.id}`)
      }

      console.log('[PlaylistDetail] handlePlayTrack index:', index, 'playableIndex:', playableIndex)

      if (playableIndex >= 0) {
        setCurrentQueueIndex(playableIndex)
        setIsPlayingAll(true)
        playlistState(songs, playableIndex)
      } else {
        console.warn('[PlaylistDetail] Track not found in unified queue')
      }
    } catch (error) {
      console.error('Error loading track:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenExternal = (url: string, title: string | null, sourceType: PlaylistTrackSourceType, trackIndex?: number) => {
    // Always show inline embed - NEVER redirect users away from SoundChain!
    const embedUrl = getEmbedUrl(url, sourceType)
    setActiveEmbed({ url: embedUrl, title: title || 'External Track', sourceType })
    setIsPlayingAll(true)
    if (trackIndex !== undefined) {
      setCurrentQueueIndex(trackIndex)
    }
  }

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite({
        variables: { playlistId: playlist.id },
      })
      setIsFavorite(!isFavorite)
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const playlistShareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/dex/playlist/${playlist.id}`

  const handleShareCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(playlistShareUrl)
      toast('Link copied to clipboard')
    } catch {
      setShowShareToast(true)
      setTimeout(() => setShowShareToast(false), 2000)
    }
    setShowShareMenu(false)
  }

  const handleShareAsPost = async () => {
    // Copy playlist link to clipboard so user can paste in post
    try { await navigator.clipboard.writeText(playlistShareUrl) } catch {}
    setShowShareMenu(false)
    onClose()
    toast('Playlist link copied — paste it in your post!')
    dispatchShowPostModal({ show: true })
  }

  const handleShareToStory = () => {
    setShowShareMenu(false)
    setShowStoryModal(true)
  }

  const handleShareToPulse = () => {
    setShowShareMenu(false)
    onClose()
    router.push(`/dex/pulse?share=${encodeURIComponent(playlistShareUrl)}`)
  }

  const handleRemoveTrack = async (playlistItemId: string) => {
    try {
      // BUG-003 FIX: Check if deleted track is currently playing
      const deletedTrack = tracks.find(t => t.id === playlistItemId)
      const deletedTrackId = deletedTrack?.trackId || `external_${playlistItemId}`
      const isCurrentlyPlaying = currentSong?.trackId === deletedTrackId || currentSong?.trackId === deletedTrack?.trackId

      await deletePlaylistItem({
        variables: { playlistItemId },
      })
      // Optimistic removal from local state
      setLocalTracks(prev => prev.filter(t => t.id !== playlistItemId))
      toast.success('Track removed')

      // If the deleted track was currently playing, close embed and advance to next track
      if (isCurrentlyPlaying) {
        setActiveEmbed(null)
        // Find the index of the deleted track and play the next one
        const deletedIndex = tracks.findIndex(t => t.id === playlistItemId)
        const remainingTracks = tracks.filter(t => t.id !== playlistItemId)
        if (remainingTracks.length > 0) {
          // Play next track (or first if deleted was last)
          const nextIndex = Math.min(deletedIndex, remainingTracks.length - 1)
          // Defer to after state update so localTracks is current
          setTimeout(() => playTrackAtIndex(nextIndex), 100)
        } else {
          // No tracks left — stop playback
          setIsPlayingAll(false)
          setCurrentQueueIndex(0)
        }
      }

      await apolloClient.refetchQueries({ include: ['GetUserPlaylists'] })
    } catch (error) {
      console.error('Failed to remove track:', error)
    }
  }

  const handleDeletePlaylist = async () => {
    try {
      await deletePlaylist({
        variables: { playlistId: playlist.id },
      })
      onDelete?.()
      onClose()
    } catch (error) {
      console.error('Failed to delete playlist:', error)
    }
  }

  // Import playlist from URL
  const handleImportFetch = async () => {
    if (!importUrl.trim()) return
    setImportLoading(true)
    setImportError('')
    setImportedTracks([])
    setImportNote('')

    try {
      const res = await fetch('/api/playlist/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setImportError(data.error || 'Failed to import')
        return
      }

      setImportPlatform(data.platform)
      setImportNote(data.note || '')
      setImportedTracks(data.tracks.map((t: any) => ({ ...t, selected: true })))
    } catch {
      setImportError('Network error. Please try again.')
    } finally {
      setImportLoading(false)
    }
  }

  // Add selected imported tracks to playlist
  const handleImportAdd = async () => {
    const selected = importedTracks.filter(t => t.selected)
    if (selected.length === 0) return

    setImportAdding(true)
    try {
      for (const track of selected) {
        const detected = detectPlatformFromUrl(track.url)
        await addPlaylistItem({
          variables: {
            input: {
              playlistId: playlist.id,
              sourceType: detected.sourceType,
              externalUrl: track.url,
              title: track.title,
            },
          },
        })
      }
      await apolloClient.refetchQueries({ include: ['GetUserPlaylists'] })
      toast.success(`${selected.length} tracks imported!`)
      setImportedTracks([])
      setImportUrl('')
      setImportPlatform('')
      setImportNote('')
    } catch (err) {
      console.error('Failed to add imported tracks:', err)
      setImportError('Failed to add some tracks. Please try again.')
    } finally {
      setImportAdding(false)
    }
  }

  const toggleImportTrack = (index: number) => {
    setImportedTracks(prev => prev.map((t, i) => i === index ? { ...t, selected: !t.selected } : t))
  }

  const toggleAllImportTracks = () => {
    const allSelected = importedTracks.every(t => t.selected)
    setImportedTracks(prev => prev.map(t => ({ ...t, selected: !allSelected })))
  }

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get source type label
  const getSourceLabel = (sourceType: PlaylistTrackSourceType) => {
    switch (sourceType) {
      case PlaylistTrackSourceType.Nft: return 'SoundChain'
      case PlaylistTrackSourceType.Youtube: return 'YouTube'
      case PlaylistTrackSourceType.Spotify: return 'Spotify'
      case PlaylistTrackSourceType.Soundcloud: return 'SoundCloud'
      case PlaylistTrackSourceType.Bandcamp: return 'Bandcamp'
      case PlaylistTrackSourceType.AppleMusic: return 'Apple Music'
      case PlaylistTrackSourceType.Tidal: return 'Tidal'
      case PlaylistTrackSourceType.Vimeo: return 'Vimeo'
      case PlaylistTrackSourceType.Upload: return 'Upload'
      default: return 'External'
    }
  }

  // Extract a meaningful title from a URL when oEmbed title resolution failed
  // e.g. soundcloud.com/artist-name/cool-track → "cool track"
  // e.g. youtube.com/watch?v=abc → null (no useful path info)
  const extractTitleFromUrl = (url: string): string | null => {
    try {
      const parsed = new URL(url)
      // BUG-002 FIX: Skip Bandcamp EmbeddedPlayer URLs — path segments are params like
      // "size=large", "bgcol=333333", "transparent=true" which are NOT track titles
      if (parsed.pathname.includes('EmbeddedPlayer')) return null
      const segments = parsed.pathname.split('/').filter(Boolean)
      // Get the last meaningful path segment (usually the track/video slug)
      const slug = segments.length > 0 ? segments[segments.length - 1] : null
      if (!slug || slug.length < 3) return null
      // Skip common non-title segments
      if (['watch', 'embed', 'track', 'album', 'playlist', 'v', 'e'].includes(slug.toLowerCase())) return null
      // Skip segments that look like key=value params (e.g. Bandcamp EmbeddedPlayer path segments)
      if (slug.includes('=')) return null
      // Convert slug to readable title: "my-cool-track" → "my cool track"
      return slug.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()
    } catch {
      return null
    }
  }

  // Check if a stored title is just the platform name (oEmbed failed during add)
  const platformNames = ['YouTube', 'Spotify', 'SoundCloud', 'Bandcamp', 'Apple Music', 'Tidal', 'Vimeo', 'External']
  const isTitleJustPlatformName = (title: string | null | undefined): boolean => {
    if (!title) return true
    return platformNames.some(p => p.toLowerCase() === title.toLowerCase())
  }

  // Resolve display title: prefer stored title, but if it's just a platform name, try URL extraction
  const resolveDisplayTitle = (title: string | null | undefined, url: string | null | undefined, sourceType: PlaylistTrackSourceType): string => {
    if (title && !isTitleJustPlatformName(title)) return title
    if (url) {
      const urlTitle = extractTitleFromUrl(url)
      if (urlTitle) return urlTitle
    }
    return `Track from ${getSourceLabel(sourceType)}`
  }

  // Get first 4 artworks for mosaic
  const firstFourArtworks = tracks.slice(0, 4).map(t => t.artworkUrl)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto md:overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 rounded-2xl border border-cyan-500/20 shadow-[0_0_60px_rgba(6,182,212,0.15),0_0_120px_rgba(168,85,247,0.08)]">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                <div className="absolute inset-0 w-10 h-10 rounded-full border border-cyan-400/30 animate-ping" />
              </div>
              <span className="text-cyan-300 text-sm font-mono tracking-wider uppercase">Initializing queue...</span>
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-cyan-500/30 flex items-center justify-center hover:border-cyan-400/60 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all"
        >
          <X className="w-4 h-4 text-cyan-400" />
        </button>

        <div className="flex flex-col md:flex-row md:h-full md:max-h-[90vh]">
          {/* Left - Playlist Info */}
          <div className="w-full md:w-80 p-6 flex-shrink-0 bg-gradient-to-b from-cyan-500/5 via-purple-500/5 to-transparent">
            {/* Artwork */}
            <div
              className="aspect-square rounded-xl overflow-hidden mb-6 shadow-[0_0_40px_rgba(6,182,212,0.2),0_0_80px_rgba(168,85,247,0.1)] border border-cyan-500/10 relative group cursor-pointer"
              onClick={isOwner ? () => coverInputRef.current?.click() : undefined}
            >
              {coverPreview || coverArtUrl ? (
                <img src={coverPreview || coverArtUrl || ''} alt={playlist.title} className="w-full h-full object-cover" />
              ) : firstFourArtworks.length >= 4 ? (
                <div className="grid grid-cols-2 gap-px w-full h-full bg-cyan-500/20">
                  {firstFourArtworks.map((url, i) => (
                    <div key={i} className="bg-neutral-900">
                      {url && <img src={url} alt="" className="w-full h-full object-cover" />}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center relative playlist-scanline">
                  <Music className="w-16 h-16 text-cyan-400/60" />
                </div>
              )}
              {isOwner && (
                <>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {coverUploading ? (
                      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Camera className="w-6 h-6 text-cyan-400" />
                        <span className="text-cyan-400 text-xs font-mono">Change Cover</span>
                      </div>
                    )}
                  </div>
                  <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverChange} />
                </>
              )}
            </div>

            {/* Info */}
            <h1 className="text-2xl font-extrabold text-white mb-1 tracking-tight">{playlist.title}</h1>
            {playlist.description && (
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">{playlist.description}</p>
            )}

            <div className="flex items-center gap-3 text-xs font-mono text-gray-500 mb-4 uppercase tracking-wider">
              <span className="text-cyan-400/80">{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</span>
              <span className="text-cyan-500/30">|</span>
              <span className="text-pink-400/80">{playlist.favoriteCount} likes</span>
            </div>


            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handlePlayAll}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-full hover:opacity-90 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]"
                style={!isLoading ? { animation: 'playlist-play-glow 3s ease-in-out infinite' } : undefined}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" fill="white" />
                )}
                <span className="font-mono uppercase tracking-wider text-sm">{isLoading ? 'Loading' : 'Play All'}</span>
              </button>
              <button
                onClick={handleToggleFavorite}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all border ${
                  isFavorite
                    ? 'bg-pink-500/20 border-pink-500/40 shadow-[0_0_12px_rgba(236,72,153,0.3)]'
                    : 'bg-neutral-900 border-neutral-700 hover:border-pink-500/30'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'text-pink-400 fill-pink-400' : 'text-gray-500'}`} />
              </button>
              <div className="relative" ref={shareMenuRef}>
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className={`w-11 h-11 rounded-full bg-neutral-900 border flex items-center justify-center transition-all ${
                    showShareMenu ? 'border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : 'border-neutral-700 hover:border-cyan-500/30'
                  }`}
                >
                  <Share2 className={`w-4 h-4 ${showShareMenu ? 'text-cyan-400' : 'text-gray-500 hover:text-cyan-400'}`} />
                </button>
                {showShareMenu && (
                  <div className="absolute bottom-full mb-2 left-0 w-52 rounded-xl bg-black/90 backdrop-blur-xl border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden z-50">
                    <button
                      onClick={handleShareCopyLink}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-cyan-500/10 transition-colors"
                    >
                      <Copy className="w-4 h-4 text-cyan-400" />
                      Copy Link
                    </button>
                    <button
                      onClick={handleShareAsPost}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-cyan-500/10 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4 text-purple-400" />
                      Share to Feed
                    </button>
                    <button
                      onClick={handleShareToStory}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-cyan-500/10 transition-colors"
                    >
                      <Film className="w-4 h-4 text-pink-400" />
                      Share to Story/Reel
                    </button>
                    <button
                      onClick={handleShareToPulse}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-cyan-500/10 transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-green-400" />
                      Send via Pulse
                    </button>
                  </div>
                )}
              </div>
              {isOwner && (
                <>
                  <button
                    onClick={() => setShowAddTracks(!showAddTracks)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all border ${
                      showAddTracks
                        ? 'bg-green-500/20 border-green-500/40 shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                        : 'bg-neutral-900 border-neutral-700 hover:border-green-500/30'
                    }`}
                  >
                    <Plus className="w-4 h-4 text-green-400" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-11 h-11 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center hover:border-red-500/30 transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-red-400/70" />
                  </button>
                </>
              )}
            </div>

            {/* Play Error Message */}
            {playError && (
              <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{playError}</p>
              </div>
            )}

            {/* Add Songs Panel */}
            {isOwner && showAddTracks && (
              <div className="mt-4 bg-neutral-800 border border-green-500/30 rounded-xl overflow-hidden">
                {/* Tab Switcher */}
                <div className="flex border-b border-neutral-700">
                  <button
                    onClick={() => setAddMode('nft')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                      addMode === 'nft'
                        ? 'text-green-400 border-b-2 border-green-400 bg-green-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-neutral-700/50'
                    }`}
                  >
                    <Music className="w-4 h-4" />
                    <span className="hidden sm:inline">NFT Tracks</span>
                    <span className="sm:hidden">NFTs</span>
                  </button>
                  <button
                    onClick={() => setAddMode('external')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                      addMode === 'external'
                        ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-neutral-700/50'
                    }`}
                  >
                    <Link2 className="w-4 h-4" />
                    <span className="hidden sm:inline">External Link</span>
                    <span className="sm:hidden">Links</span>
                  </button>
                  <button
                    onClick={() => setAddMode('import')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                      addMode === 'import'
                        ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-neutral-700/50'
                    }`}
                  >
                    <Import className="w-4 h-4" />
                    <span className="hidden sm:inline">Import</span>
                    <span className="sm:hidden">Import</span>
                  </button>
                </div>

                {/* NFT Track Search */}
                {addMode === 'nft' && (
                  <>
                    <div className="p-3 border-b border-neutral-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          type="text"
                          value={trackSearchQuery}
                          onChange={(e) => setTrackSearchQuery(e.target.value)}
                          placeholder="Search tracks to add..."
                          className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-green-500 text-sm"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {searchLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                        </div>
                      ) : availableTracks.length > 0 ? (
                        availableTracks.map((track) => {
                          const isAlreadyInPlaylist = existingTrackIds.has(track.id)
                          return (
                            <div
                              key={track.id}
                              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                                isAlreadyInPlaylist
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'hover:bg-neutral-700 cursor-pointer'
                              }`}
                              onClick={() => !isAlreadyInPlaylist && !addingTracks && handleAddTrack(track.id)}
                            >
                              <div className="w-10 h-10 rounded bg-neutral-700 overflow-hidden flex-shrink-0">
                                {track.artworkUrl ? (
                                  <Asset src={track.artworkUrl} sizes="40px" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-green-500 to-cyan-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{track.title}</p>
                                <p className="text-neutral-500 text-xs truncate">{track.artist}</p>
                              </div>
                              {isAlreadyInPlaylist ? (
                                <span className="text-neutral-500 text-xs">Added</span>
                              ) : addingTracks ? (
                                <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                              ) : (
                                <Plus className="w-4 h-4 text-green-400" />
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <div className="py-8 text-center text-neutral-500 text-sm">
                          {trackSearchQuery ? 'No tracks found' : 'Search for tracks to add'}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* External Link Input */}
                {addMode === 'external' && (
                  <div className="p-4 space-y-3">
                    <p className="text-gray-400 text-xs">
                      Add ANY link - audio files, YouTube, Spotify, SoundCloud, or any URL!
                    </p>

                    {/* URL Input */}
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="url"
                        value={externalLinkUrl}
                        onChange={(e) => { setExternalLinkUrl(e.target.value); setAddLinkError(''); }}
                        placeholder="Paste URL here (e.g., youtube.com/watch?v=...)"
                        className="w-full pl-10 pr-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 text-sm"
                        autoFocus
                      />
                    </div>

                    {/* Title Input (optional) */}
                    <input
                      type="text"
                      value={externalLinkTitle}
                      onChange={(e) => setExternalLinkTitle(e.target.value)}
                      placeholder="Title (optional - auto-detected from platform)"
                      className="w-full px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 text-sm"
                    />

                    {/* Error Message */}
                    {addLinkError && (
                      <p className="text-red-400 text-xs">{addLinkError}</p>
                    )}

                    {/* Platform Preview */}
                    {externalLinkUrl && detectPlatformFromUrl(externalLinkUrl) && (
                      <div className="flex items-center gap-2 text-xs text-cyan-400">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        Detected: {detectPlatformFromUrl(externalLinkUrl)?.platform}
                      </div>
                    )}

                    {/* Add Button */}
                    <button
                      onClick={handleAddExternalLink}
                      disabled={addingTracks || !externalLinkUrl.trim()}
                      className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {addingTracks ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Add to Playlist
                        </>
                      )}
                    </button>

                    {/* Supported Formats */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {['MP3', 'WAV', 'YouTube', 'Spotify', 'SoundCloud', 'Any URL'].map(p => (
                        <span key={p} className="px-2 py-0.5 bg-neutral-700 text-neutral-400 text-xs rounded-full">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Import Playlist */}
                {addMode === 'import' && (
                  <div className="p-4 space-y-3">
                    <p className="text-gray-400 text-xs font-mono">
                      Import all tracks from a YouTube playlist — unlimited.
                    </p>

                    {/* URL Input */}
                    <div className="relative">
                      <Import className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="url"
                        value={importUrl}
                        onChange={(e) => { setImportUrl(e.target.value); setImportError(''); }}
                        placeholder="Paste YouTube playlist URL..."
                        className="w-full pl-10 pr-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleImportFetch()}
                      />
                    </div>

                    {/* Fetch Button */}
                    <button
                      onClick={handleImportFetch}
                      disabled={importLoading || !importUrl.trim()}
                      className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {importLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="font-mono text-sm">Fetching tracks...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span className="font-mono text-sm">Fetch Tracks</span>
                        </>
                      )}
                    </button>

                    {importError && (
                      <p className="text-red-400 text-xs">{importError}</p>
                    )}

                    {/* Imported Tracks List */}
                    {importedTracks.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-pink-400">{importPlatform} — {importedTracks.filter(t => t.selected).length}/{importedTracks.length} selected</span>
                          <button
                            onClick={toggleAllImportTracks}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                          >
                            {importedTracks.every(t => t.selected) ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>

                        {importNote && (
                          <p className="text-yellow-400/70 text-[10px] font-mono">{importNote}</p>
                        )}

                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {importedTracks.map((track, i) => (
                            <div
                              key={i}
                              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                                track.selected ? 'bg-pink-500/10 border border-pink-500/20' : 'bg-neutral-800/50 border border-transparent hover:bg-neutral-800'
                              }`}
                              onClick={() => toggleImportTrack(i)}
                            >
                              {track.selected ? (
                                <CheckSquare className="w-4 h-4 text-pink-400 flex-shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-600 flex-shrink-0" />
                              )}
                              {track.thumbnail && (
                                <img src={track.thumbnail} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                              )}
                              <span className={`text-xs truncate ${track.selected ? 'text-white' : 'text-gray-500'}`}>{track.title}</span>
                            </div>
                          ))}
                        </div>

                        {/* Add Selected Button */}
                        <button
                          onClick={handleImportAdd}
                          disabled={importAdding || importedTracks.filter(t => t.selected).length === 0}
                          className="w-full py-3 bg-gradient-to-r from-green-500 to-cyan-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {importAdding ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="font-mono text-sm">Adding {importedTracks.filter(t => t.selected).length} tracks...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              <span className="font-mono text-sm">Add {importedTracks.filter(t => t.selected).length} Tracks</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Supported Platforms */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded-full border border-red-500/20 font-mono">YouTube <span className="text-[9px] text-red-300">unlimited</span></span>
                      <span className="px-2 py-0.5 bg-neutral-800 text-neutral-500 text-xs rounded-full font-mono">SoundCloud <span className="text-[9px]">soon</span></span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right - Track List */}
          <div className="flex-1 overflow-y-auto">
            {/* Embedded Player for External Sources */}
            {activeEmbed && (
              <div className="sticky top-0 z-10 bg-neutral-950 border-b border-cyan-500/20">
                {/* Player Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-cyan-500/10">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-mono text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">{currentQueueIndex + 1}/{tracks.length}</span>
                    <span className="text-white font-semibold text-sm truncate">{activeEmbed.title}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={playPreviousInQueue}
                      disabled={currentQueueIndex <= 0}
                      className="p-2 hover:bg-cyan-500/10 rounded-full transition-all disabled:opacity-20"
                      aria-label="Previous track"
                    >
                      <SkipBack className="w-4 h-4 text-cyan-400" />
                    </button>
                    <button
                      onClick={playNextInQueue}
                      disabled={currentQueueIndex >= tracks.length - 1}
                      className="p-2 hover:bg-cyan-500/10 rounded-full transition-all disabled:opacity-20"
                      aria-label="Next track"
                    >
                      <SkipForward className="w-4 h-4 text-cyan-400" />
                    </button>
                    <button
                      onClick={() => {
                        if (currentQueueIndex < tracks.length - 1) {
                          playNextInQueue()
                        } else {
                          setActiveEmbed(null)
                          setIsPlayingAll(false)
                          setCurrentQueueIndex(-1)
                        }
                      }}
                      className="p-2 hover:bg-red-500/10 rounded-full transition-all"
                      aria-label="Skip to next / Close player"
                    >
                      <X className="w-4 h-4 text-gray-500 hover:text-red-400" />
                    </button>
                  </div>
                </div>
                {/* Embed Container — capped on mobile to prevent track list crush */}
                <div
                  className="relative w-full playlist-scanline bg-black rounded-b-lg overflow-hidden"
                  style={{
                    paddingBottom: activeEmbed.sourceType === PlaylistTrackSourceType.Spotify ? 'min(352px, 45vh)'
                      : activeEmbed.sourceType === PlaylistTrackSourceType.Bandcamp ? 'min(380px, 50vh)'
                      : 'min(56.25%, 50vh)',
                  }}
                >
                  <iframe
                    src={activeEmbed.url}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    frameBorder="0"
                  />
                </div>
              </div>
            )}

            {/* Header */}
            <div className="sticky bg-black/90 backdrop-blur-sm px-6 py-3 border-b border-cyan-500/10" style={{ top: activeEmbed ? 'auto' : 0, zIndex: 5 }}>
              <div className="flex items-center text-[10px] font-mono text-cyan-500/50 uppercase tracking-[0.2em]">
                <span className="w-8 text-center">#</span>
                <span className="flex-1 ml-4">Title</span>
                <span className="w-24 text-right hidden sm:block">Source</span>
                <span className="w-16 text-right">
                  <Clock className="w-3.5 h-3.5 inline text-cyan-500/40" />
                </span>
                {isOwner && <span className="w-10" />}
              </div>
            </div>

            {/* Tracks */}
            <div className="p-1.5 sm:p-2">
              {tracks.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/5 border border-cyan-500/10 mb-4">
                    <Music className="w-8 h-8 text-cyan-500/30" />
                  </div>
                  <p className="text-lg font-bold text-white/60 mb-1">No tracks yet</p>
                  <p className="text-sm text-gray-600 font-mono">Add tracks to initialize the queue</p>
                </div>
              ) : (
                tracks.map((pt, index) => {
                  const isNft = (pt.sourceType === PlaylistTrackSourceType.Nft || pt.sourceType === null || pt.sourceType === undefined) && !!pt.trackId
                  const isCurrentTrack = isNft && pt.trackId ? isCurrentSong(pt.trackId) : false
                  const isActiveExternal = !isNft && isPlayingAll && currentQueueIndex === index
                  const isHighlighted = isCurrentTrack || isActiveExternal
                  const isTrackPlaying = (isCurrentTrack && isPlaying) || isActiveExternal
                  const hasExternalUrl = pt.externalUrl || pt.uploadedFileUrl

                  const meta = pt.trackId ? nftTrackMeta[pt.trackId] : undefined
                  const displayTitle = isNft
                    ? (pt.title || meta?.title || 'Untitled')
                    : resolveDisplayTitle(pt.title, pt.externalUrl || pt.uploadedFileUrl, pt.sourceType)
                  const displayArtist = pt.artist || meta?.artist || (isNft ? 'SoundChain NFT' : getSourceLabel(pt.sourceType))
                  const displayArtwork = pt.artworkUrl || meta?.artworkUrl
                  const displayDuration = pt.duration || meta?.duration

                  const handleClick = () => {
                    if (isNft && pt.trackId) {
                      if (isCurrentTrack) {
                        togglePlay()
                      } else {
                        handlePlayTrack(index)
                      }
                    } else if (hasExternalUrl) {
                      // Bug #2B fix: Route through unified queue so global player syncs
                      handlePlayTrack(index)
                    }
                  }

                  // Platform-specific badge colors
                  const getPlatformColor = () => {
                    if (isNft) return { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/20' }
                    switch (pt.sourceType) {
                      case PlaylistTrackSourceType.Youtube: return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/20' }
                      case PlaylistTrackSourceType.Spotify: return { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/20' }
                      case PlaylistTrackSourceType.Soundcloud: return { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/20' }
                      case PlaylistTrackSourceType.Bandcamp: return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' }
                      case PlaylistTrackSourceType.AppleMusic: return { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/20' }
                      default: return { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/20' }
                    }
                  }
                  const platformColor = getPlatformColor()

                  return (
                    <div
                      key={pt.id}
                      className={`group flex items-center px-3 sm:px-4 py-2.5 rounded-lg transition-all ${
                        isHighlighted
                          ? 'playlist-now-playing bg-cyan-500/5'
                          : 'hover:bg-white/[0.03] border-l-2 border-transparent'
                      }`}
                    >
                      {/* Number / Play indicator / EQ bars */}
                      <div
                        className="w-8 text-center cursor-pointer flex-shrink-0"
                        onClick={handleClick}
                      >
                        {isTrackPlaying ? (
                          <div className="flex items-end justify-center gap-[2px] h-4 mx-auto">
                            <div className="playlist-eq-bar" style={{ animationDelay: '0s' }} />
                            <div className="playlist-eq-bar" style={{ animationDelay: '0.2s' }} />
                            <div className="playlist-eq-bar" style={{ animationDelay: '0.4s' }} />
                          </div>
                        ) : isHighlighted ? (
                          <Play className="w-4 h-4 text-cyan-400 mx-auto" fill="currentColor" />
                        ) : (
                          <>
                            <span className="font-mono text-xs text-gray-600 group-hover:hidden">{String(index + 1).padStart(2, '0')}</span>
                            <Play className="w-4 h-4 text-cyan-400/70 mx-auto hidden group-hover:block" fill="currentColor" />
                          </>
                        )}
                      </div>

                      {/* Track info */}
                      <div
                        className="flex items-center gap-3 flex-1 ml-3 min-w-0 cursor-pointer"
                        onClick={handleClick}
                      >
                        <div className={`w-10 h-10 rounded overflow-hidden flex-shrink-0 ${
                          isHighlighted ? 'ring-1 ring-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : ''
                        }`}>
                          {displayArtwork ? (
                            <img src={displayArtwork} alt={displayTitle} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${
                              isNft ? 'bg-purple-500/10' : 'bg-cyan-500/10'
                            }`}>
                              <Music className={`w-4 h-4 ${isNft ? 'text-purple-500/40' : 'text-cyan-500/40'}`} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-semibold text-sm truncate ${
                            isHighlighted ? 'text-cyan-300' : 'text-white/90'
                          }`}>
                            {displayTitle}
                          </p>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-gray-500 text-xs truncate">{displayArtist}</p>
                            {/* Mobile platform badge */}
                            <span className={`sm:hidden text-[9px] px-1.5 py-0.5 rounded ${platformColor.bg} ${platformColor.text} font-mono uppercase flex-shrink-0`}>
                              {isNft ? 'SC' : getSourceLabel(pt.sourceType).substring(0, 3)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Source Type — desktop */}
                      <div className="w-24 text-right hidden sm:block flex-shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase tracking-wider ${platformColor.bg} ${platformColor.text} ${platformColor.border}`}>
                          {isNft ? 'SoundChain' : getSourceLabel(pt.sourceType)}
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="w-14 sm:w-16 text-right text-gray-600 text-xs font-mono flex-shrink-0">
                        {formatDuration(displayDuration)}
                      </div>

                      {/* Remove button (owner only) */}
                      {isOwner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveTrack(pt.id)
                          }}
                          className="w-8 sm:w-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-red-400" />
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Share Toast */}
            {showShareToast && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-60 bg-cyan-500 text-black px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)] font-mono text-sm font-bold tracking-wide">
                Link copied to clipboard
              </div>
            )}

            {/* Story/Reel Creation Modal */}
            {showStoryModal && (
              <CreateStoryModal
                isOpen={showStoryModal}
                onClose={() => setShowStoryModal(false)}
                prefillTrack={{
                  trackId: playlist.id,
                  title: playlist.title || 'Playlist',
                  artist: 'SoundChain Playlist',
                  artworkUrl: coverArtUrl || '',
                }}
              />
            )}

            {/* Delete Playlist Confirmation */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="bg-neutral-900 rounded-xl p-6 max-w-sm w-full mx-4 border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
                  <h3 className="text-lg font-bold text-white mb-2">Delete Playlist?</h3>
                  <p className="text-gray-400 text-sm mb-5">This action cannot be undone. All tracks will be removed.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-neutral-800 border border-neutral-700 text-white hover:border-neutral-600 transition-all font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeletePlaylist}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
