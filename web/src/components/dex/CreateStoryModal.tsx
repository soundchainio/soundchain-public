import { useState, useRef, useCallback, useEffect } from 'react'
import {
  X, Image as ImageIcon, Video, Upload, Loader2, Sparkles,
  Music2, Type, Link2, ChevronDown, Check, Play, Pause, Crop
} from 'lucide-react'
import { useMe } from 'hooks/useMe'
import { smartCompress, needsCompression, CompressionProgress } from 'lib/mediaCompression'
import { useUpload } from 'hooks/useUpload'
import { usePinToIpfsMutation, Track } from 'lib/graphql'
import { toast } from 'react-toastify'
import { gql, useMutation } from '@apollo/client'
import { NFTMusicPicker } from './NFTMusicPicker'
import { MediaCropEditor } from './MediaCropEditor'
import StoryTextOverlay, { TextLayer } from './StoryTextOverlay'
import { getIpfsUrl } from 'utils/ipfs'
import { getNormalizedLink, IdentifySource } from 'utils/NormalizeEmbedLinks'
import ReactPlayer from 'react-player'
import { MediaProvider } from 'types/MediaProvider'

// GraphQL mutation for creating story WITH overlays and attached track
const CREATE_STORY_WITH_OVERLAYS = gql`
  mutation createStoryWithOverlays(
    $mediaUrl: String!
    $mediaType: String!
    $overlays: [OverlayInput!]
    $attachedTrackId: String
    $caption: String
    $duration: Int
  ) {
    createStoryWithOverlays(
      mediaUrl: $mediaUrl
      mediaType: $mediaType
      overlays: $overlays
      attachedTrackId: $attachedTrackId
      caption: $caption
      duration: $duration
    ) {
      id
      mediaUrl
      mediaType
      createdAt
      expiresAt
      overlays {
        type
        content
        positionX
        positionY
        fontFamily
        color
        fontSize
        rotation
      }
      attachedTrackId
    }
  }
`

// Guest version with overlays
const GUEST_CREATE_STORY_WITH_OVERLAYS = gql`
  mutation guestCreateStoryWithOverlays(
    $mediaUrl: String!
    $mediaType: String!
    $walletAddress: String!
    $overlays: [OverlayInput!]
    $attachedTrackId: String
    $caption: String
    $duration: Int
  ) {
    guestCreateStoryWithOverlays(
      mediaUrl: $mediaUrl
      mediaType: $mediaType
      walletAddress: $walletAddress
      overlays: $overlays
      attachedTrackId: $attachedTrackId
      caption: $caption
      duration: $duration
    ) {
      id
      mediaUrl
      mediaType
      createdAt
      expiresAt
      isGuest
      walletAddress
    }
  }
`

// Guest IPFS pinning mutation (no authentication required)
const GUEST_PIN_TO_IPFS = gql`
  mutation guestPinToIPFS($input: PinToIPFSInput!) {
    guestPinToIPFS(input: $input) {
      cid
    }
  }
`

// FAST DIRECT UPLOAD - Skips S3, pins directly to IPFS (use for files < 50MB)
const DIRECT_PIN_TO_IPFS = gql`
  mutation directPinToIPFS($input: DirectPinInput!) {
    directPinToIPFS(input: $input) {
      cid
    }
  }
`

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] // Remove data URL prefix
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// TEMPORARILY DISABLED: Direct upload causing 413 errors
// Using S3 path for all uploads until root cause is identified
// TODO: Debug why direct upload returns 413 for even small files
const DIRECT_UPLOAD_THRESHOLD = 0 // Force all uploads through S3 path

// Story/Reel constraints
const STORY_CONSTRAINTS = {
  MIN_DURATION: 1,
  MAX_DURATION_GUEST: 30,
  MAX_DURATION_MEMBER: 600,
  DEFAULT_DURATION_GUEST: 15,
  DEFAULT_DURATION_MEMBER: 60,
  EXPIRY_HOURS: 24,
  MAX_FILE_SIZE_GUEST: 10 * 1024 * 1024,
  MAX_FILE_SIZE_MEMBER: 1024 * 1024 * 1024,
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov'],
}

// External embed platforms
const EMBED_PLATFORMS = [
  { id: MediaProvider.SPOTIFY, name: 'Spotify', icon: '🎵', placeholder: 'https://open.spotify.com/track/...' },
  { id: MediaProvider.YOUTUBE, name: 'YouTube', icon: '▶️', placeholder: 'https://youtube.com/watch?v=...' },
  { id: MediaProvider.SOUNDCLOUD, name: 'SoundCloud', icon: '☁️', placeholder: 'https://soundcloud.com/...' },
  { id: MediaProvider.BANDCAMP, name: 'Bandcamp', icon: '🎸', placeholder: 'https://artist.bandcamp.com/...' },
]

type MusicSource = 'none' | 'nft' | 'embed'
type EditorTab = 'media' | 'music' | 'text'

interface RadioTrackPrefill {
  trackId: string
  title: string
  artist: string
  artworkUrl?: string
}

interface PrefillMedia {
  url: string
  type: 'image' | 'video'
  caption?: string
  authorName?: string
}

interface CreateStoryModalProps {
  isOpen: boolean
  onClose: () => void
  onPublish?: (mediaUrl: string, mediaType: 'image' | 'video') => void
  /** Pre-fill with a radio/NFT track (artwork as media + track attached) */
  prefillTrack?: RadioTrackPrefill | null
  /** Pre-fill with a post's media (Share to Story) */
  prefillMedia?: PrefillMedia | null
}

export const CreateStoryModal = ({ isOpen, onClose, onPublish, prefillTrack, prefillMedia }: CreateStoryModalProps) => {
  // useMe() returns the User object directly, not { me: User }
  const me = useMe()

  // More robust login check - check for user ID, profile, OR any OAuth wallet
  const isLoggedIn = !!(me?.id || me?.profile || me?.magicWalletAddress || me?.googleWalletAddress)
  const maxDuration = isLoggedIn ? STORY_CONSTRAINTS.MAX_DURATION_MEMBER : STORY_CONSTRAINTS.MAX_DURATION_GUEST
  const maxFileSize = isLoggedIn ? STORY_CONSTRAINTS.MAX_FILE_SIZE_MEMBER : STORY_CONSTRAINTS.MAX_FILE_SIZE_GUEST

  // Upload hooks
  const { upload } = useUpload(undefined, undefined, !isLoggedIn)
  const [pinToIPFS] = usePinToIpfsMutation()
  const [guestPinToIPFS] = useMutation(GUEST_PIN_TO_IPFS)
  const [directPinToIPFS] = useMutation(DIRECT_PIN_TO_IPFS)
  const [createStoryWithOverlays] = useMutation(CREATE_STORY_WITH_OVERLAYS, {
    refetchQueries: ['publicStories', 'myFollowingStories'],
  })
  const [guestCreateStoryWithOverlays] = useMutation(GUEST_CREATE_STORY_WITH_OVERLAYS, {
    refetchQueries: ['publicStories'],
  })

  // Media state
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState<'uploading' | 'pinning' | 'creating' | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [wasCompressed, setWasCompressed] = useState(false)
  const [originalSize, setOriginalSize] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Music state
  const [musicSource, setMusicSource] = useState<MusicSource>('none')
  const [selectedNftTrack, setSelectedNftTrack] = useState<Track | null>(null)
  const [embedUrl, setEmbedUrl] = useState('')
  const [normalizedEmbedUrl, setNormalizedEmbedUrl] = useState<string | null>(null)
  const [embedPlatform, setEmbedPlatform] = useState<MediaProvider | null>(null)
  const [showMusicPicker, setShowMusicPicker] = useState(false)

  // Overlay state
  const [textLayers, setTextLayers] = useState<TextLayer[]>([])
  const [isEditingText, setIsEditingText] = useState(false)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // Editor state
  const [activeTab, setActiveTab] = useState<EditorTab>('media')
  const [showEmbedInput, setShowEmbedInput] = useState(false)

  // Crop editor state
  const [showCropEditor, setShowCropEditor] = useState(false)
  const prefillApplied = useRef(false)

  // Pre-filled media from shared post (Share to Story)
  const [prefillMediaUrl, setPrefillMediaUrl] = useState<string | null>(null)

  // Generate a radio story card using canvas (always works, no CORS issues)
  const generateRadioCard = useCallback((artworkImg?: HTMLImageElement) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1920 // 9:16 story ratio
    const ctx = canvas.getContext('2d')!
    const track = prefillTrack
    if (!track) return

    // Check if artwork image can be drawn without tainting the canvas
    let canUseArtwork = false
    if (artworkImg) {
      const testCanvas = document.createElement('canvas')
      testCanvas.width = 1
      testCanvas.height = 1
      const testCtx = testCanvas.getContext('2d')!
      testCtx.drawImage(artworkImg, 0, 0, 1, 1)
      try {
        testCtx.getImageData(0, 0, 1, 1)
        canUseArtwork = true
      } catch (e) {
        console.warn('[CreateStoryModal] Canvas tainted by cross-origin artwork, using fallback')
        canUseArtwork = false
      }
    }

    // Dark background
    const bg = ctx.createLinearGradient(0, 0, 0, 1920)
    bg.addColorStop(0, '#030d1b')
    bg.addColorStop(0.5, '#0a1628')
    bg.addColorStop(1, '#030d1b')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 1080, 1920)

    if (artworkImg && canUseArtwork) {
      // Draw artwork large and centered
      const size = Math.min(artworkImg.width, artworkImg.height)
      const sx = (artworkImg.width - size) / 2
      const sy = (artworkImg.height - size) / 2
      ctx.drawImage(artworkImg, sx, sy, size, size, 40, 340, 1000, 1000)

      // Bottom gradient overlay for text readability
      const grad = ctx.createLinearGradient(0, 1050, 0, 1920)
      grad.addColorStop(0, 'rgba(3, 13, 27, 0)')
      grad.addColorStop(0.3, 'rgba(3, 13, 27, 0.85)')
      grad.addColorStop(1, 'rgba(3, 13, 27, 1)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 1050, 1080, 870)

      // Top gradient overlay
      const topGrad = ctx.createLinearGradient(0, 0, 0, 420)
      topGrad.addColorStop(0, 'rgba(3, 13, 27, 1)')
      topGrad.addColorStop(1, 'rgba(3, 13, 27, 0)')
      ctx.fillStyle = topGrad
      ctx.fillRect(0, 0, 1080, 420)
    } else {
      // No artwork - draw a vinyl record graphic
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'
      ctx.beginPath()
      ctx.arc(540, 760, 280, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)'
      ctx.lineWidth = 2
      ctx.stroke()
      // Inner rings
      for (let r = 220; r > 40; r -= 40) {
        ctx.beginPath()
        ctx.arc(540, 760, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.1 + (220 - r) * 0.001})`
        ctx.stroke()
      }
      // Center hole
      ctx.fillStyle = '#030d1b'
      ctx.beginPath()
      ctx.arc(540, 760, 30, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.textAlign = 'center'

    // OGUN RADIO header with red dot
    ctx.fillStyle = '#ef4444'
    ctx.font = 'bold 38px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText('\u{1F534} OGUN RADIO', 540, 180)

    // NOW PLAYING
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '600 26px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.letterSpacing = '4px'
    ctx.fillText('NOW PLAYING', 540, 240)

    // Track title (word-wrapped)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 54px -apple-system, BlinkMacSystemFont, sans-serif'
    const title = track.title || 'Unknown Track'
    const titleWords = title.split(' ')
    let line = ''
    let y = artworkImg ? 1440 : 1150
    for (const word of titleWords) {
      const test = line + word + ' '
      if (ctx.measureText(test).width > 920 && line) {
        ctx.fillText(line.trim(), 540, y)
        line = word + ' '
        y += 68
      } else {
        line = test
      }
    }
    ctx.fillText(line.trim(), 540, y)

    // Artist
    ctx.fillStyle = '#9ca3af'
    ctx.font = '38px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(track.artist || 'Unknown Artist', 540, y + 70)

    // NFT badge
    ctx.fillStyle = '#eab308'
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText('\u2666 TRACK \u2022 EARNING OGUN', 540, y + 130)

    // Watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.font = '22px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText('soundchain.io/radio', 540, 1860)

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'radio-story.jpg', { type: 'image/jpeg' })
        setMediaFile(file)
        setMediaPreview(URL.createObjectURL(file))
        setMediaType('image')
        setActiveTab('text')
      }
    }, 'image/jpeg', 0.92)
  }, [prefillTrack])

  // Pre-fill from radio track when modal opens
  useEffect(() => {
    if (!isOpen || !prefillTrack || prefillApplied.current) return
    prefillApplied.current = true

    // Set the track as attached NFT music
    setSelectedNftTrack({
      id: prefillTrack.trackId,
      title: prefillTrack.title,
      artist: prefillTrack.artist,
      artworkUrl: prefillTrack.artworkUrl || '',
    } as Track)
    setMusicSource('nft')

    // Load artwork - try crossOrigin first, then proxy, then vinyl fallback
    if (prefillTrack.artworkUrl) {
      const artUrl = getIpfsUrl(prefillTrack.artworkUrl)

      // Attempt 1: With CORS headers (allows clean canvas export)
      const img1 = new Image()
      img1.crossOrigin = 'anonymous'
      img1.onload = () => generateRadioCard(img1)
      img1.onerror = () => {
        // Attempt 2: Proxy through our API (bypasses CORS for S3 artwork)
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(artUrl)}`
        const img2 = new Image()
        img2.crossOrigin = 'anonymous'
        img2.onload = () => generateRadioCard(img2)
        img2.onerror = () => {
          console.warn('[CreateStoryModal] Artwork proxy failed, using vinyl fallback')
          generateRadioCard()
        }
        img2.src = proxyUrl
      }
      img1.src = artUrl
    } else {
      generateRadioCard()
    }
  }, [isOpen, prefillTrack, generateRadioCard])

  // Pre-fill from shared post media when modal opens (Share to Story)
  useEffect(() => {
    if (!isOpen || !prefillMedia || prefillApplied.current) return
    prefillApplied.current = true

    const resolvedUrl = getIpfsUrl(prefillMedia.url)
    setMediaPreview(resolvedUrl)
    setMediaType(prefillMedia.type)
    setPrefillMediaUrl(prefillMedia.url) // Store original URL for publish

    // Detect video duration for proper story timing
    if (prefillMedia.type === 'video') {
      // Embed URLs (YouTube etc) can't be loaded in a <video> element — use default duration
      const isEmbed = /(?:youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitch\.tv|soundcloud\.com|spotify\.com|bandcamp\.com)/i.test(resolvedUrl)
      if (isEmbed) {
        setVideoDuration(60) // Default 60s for embeds — StoryViewer will detect actual duration
      } else {
        const tempVideo = document.createElement('video')
        tempVideo.preload = 'metadata'
        tempVideo.crossOrigin = 'anonymous'
        tempVideo.src = resolvedUrl
        tempVideo.onloadedmetadata = () => {
          setVideoDuration(tempVideo.duration)
        }
      }
    }

    setActiveTab('text') // Let user add overlays before sharing
  }, [isOpen, prefillMedia])

  // Reset prefill flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      prefillApplied.current = false
      setPrefillMediaUrl(null)
    }
  }, [isOpen])

  // Handle crop result
  const handleCropApply = useCallback((croppedFile: File) => {
    // Update media file with cropped version
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview)
    }
    setMediaFile(croppedFile)
    setMediaPreview(URL.createObjectURL(croppedFile))
    setShowCropEditor(false)
    toast.success('Crop applied!')
  }, [mediaPreview])

  // Process embed URL when changed
  useEffect(() => {
    const processEmbed = async () => {
      if (!embedUrl.trim()) {
        setNormalizedEmbedUrl(null)
        setEmbedPlatform(null)
        return
      }

      const source = IdentifySource(embedUrl)
      if (source.type) {
        setEmbedPlatform(source.type)
        const normalized = await getNormalizedLink(embedUrl)
        if (normalized) {
          setNormalizedEmbedUrl(normalized)
        }
      }
    }

    const timeout = setTimeout(processEmbed, 500)
    return () => clearTimeout(timeout)
  }, [embedUrl])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setCompressionProgress(null)

    const isImage = STORY_CONSTRAINTS.SUPPORTED_IMAGE_TYPES.includes(file.type)
    const isVideo = STORY_CONSTRAINTS.SUPPORTED_VIDEO_TYPES.includes(file.type) || file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      setUploadError('Use JPG, PNG, GIF, WebP, MP4, WebM, or MOV')
      return
    }

    if (file.size > maxFileSize) {
      const maxSizeLabel = isLoggedIn ? '1 GB' : '10 MB'
      setUploadError(`File too large. Max: ${maxSizeLabel}${!isLoggedIn ? ' - Login for 1 GB!' : ''}`)
      return
    }

    if (isVideo) {
      const previewUrl = URL.createObjectURL(file)
      const tempVideo = document.createElement('video')
      tempVideo.preload = 'metadata'
      tempVideo.src = previewUrl

      tempVideo.onloadedmetadata = async () => {
        const duration = tempVideo.duration
        setVideoDuration(duration)

        if (duration > maxDuration) {
          const maxMsg = isLoggedIn ? '10 min' : '30 sec'
          setUploadError(`Video too long. Max: ${maxMsg}`)
          URL.revokeObjectURL(previewUrl)
          return
        }

        if (needsCompression(file, 'story')) {
          setIsCompressing(true)
          setOriginalSize(file.size)
          try {
            const result = await smartCompress(file, 'story', (progress) => {
              setCompressionProgress(progress)
            })
            setMediaFile(result.file)
            setMediaType('video')
            setMediaPreview(URL.createObjectURL(result.file))
            setWasCompressed(result.wasCompressed)
            URL.revokeObjectURL(previewUrl)
          } catch (err) {
            setMediaFile(file)
            setMediaType('video')
            setMediaPreview(previewUrl)
            setWasCompressed(false)
          } finally {
            setIsCompressing(false)
            setCompressionProgress(null)
          }
        } else {
          setMediaFile(file)
          setMediaType('video')
          setMediaPreview(previewUrl)
          setWasCompressed(false)
        }
      }

      tempVideo.onerror = () => {
        setUploadError('Could not read video. Try different format.')
        URL.revokeObjectURL(previewUrl)
      }
    } else {
      if (needsCompression(file, 'story')) {
        setIsCompressing(true)
        setOriginalSize(file.size)
        try {
          const result = await smartCompress(file, 'story', (progress) => {
            setCompressionProgress(progress)
          })
          setMediaFile(result.file)
          setMediaType('image')
          setMediaPreview(URL.createObjectURL(result.file))
          setWasCompressed(result.wasCompressed)
        } catch (err) {
          const previewUrl = URL.createObjectURL(file)
          setMediaFile(file)
          setMediaType('image')
          setMediaPreview(previewUrl)
          setWasCompressed(false)
        } finally {
          setIsCompressing(false)
          setCompressionProgress(null)
        }
      } else {
        const previewUrl = URL.createObjectURL(file)
        setMediaFile(file)
        setMediaType('image')
        setMediaPreview(previewUrl)
        setWasCompressed(false)
      }
      setVideoDuration(0)
    }
  }, [maxFileSize, maxDuration, isLoggedIn])

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      // Create a synthetic event to reuse handleFileSelect logic
      const syntheticEvent = {
        target: { files }
      } as React.ChangeEvent<HTMLInputElement>
      handleFileSelect(syntheticEvent)
    }
  }, [handleFileSelect])

  const handleSelectNftTrack = (track: Track) => {
    setSelectedNftTrack(track)
    setMusicSource('nft')
    setEmbedUrl('')
    setNormalizedEmbedUrl(null)
    setShowMusicPicker(false)
  }

  const handleEmbedUrlChange = (url: string) => {
    setEmbedUrl(url)
    if (url.trim()) {
      setMusicSource('embed')
      setSelectedNftTrack(null)
    }
  }

  const clearMusic = () => {
    setMusicSource('none')
    setSelectedNftTrack(null)
    setEmbedUrl('')
    setNormalizedEmbedUrl(null)
    setEmbedPlatform(null)
  }

  // Convert text layers to overlay format for API
  const convertLayersToOverlays = () => {
    const overlays: any[] = []

    // Add text overlays
    textLayers.forEach(layer => {
      // Check for hashtags in text
      const hashtagMatches = layer.text.match(/#\w+/g) || []
      hashtagMatches.forEach(hashtag => {
        overlays.push({
          type: 'hashtag',
          content: hashtag,
          positionX: layer.x,
          positionY: layer.y,
          color: layer.color,
          fontSize: layer.fontSize,
        })
      })

      // Check for mentions in text
      const mentionMatches = layer.text.match(/@\w+/g) || []
      mentionMatches.forEach(mention => {
        overlays.push({
          type: 'mention',
          content: mention,
          positionX: layer.x,
          positionY: layer.y,
          color: layer.color,
          fontSize: layer.fontSize,
        })
      })

      // Add the text overlay itself
      overlays.push({
        type: 'text',
        content: layer.text,
        positionX: layer.x,
        positionY: layer.y,
        fontFamily: layer.fontId,
        color: layer.color,
        fontSize: layer.fontSize,
        rotation: layer.rotation,
      })
    })

    // Add NFT badge overlay if track is selected
    if (selectedNftTrack && musicSource === 'nft') {
      overlays.push({
        type: 'nft_badge',
        content: JSON.stringify({
          trackId: selectedNftTrack.id,
          title: selectedNftTrack.title,
          artist: selectedNftTrack.artist,
          artworkUrl: selectedNftTrack.artworkUrl,
        }),
        positionX: 50,
        positionY: 90, // Bottom center
      })
    }

    return overlays
  }

  const handlePublish = async () => {
    if ((!mediaFile && !prefillMediaUrl) || !mediaPreview || !mediaType) return
    setIsUploading(true)
    setUploadError(null)
    setUploadProgress(0)

    try {
      let ipfsCid: string
      const useDirectUpload = mediaFile ? mediaFile.size < DIRECT_UPLOAD_THRESHOLD : false

      // Fast path: Pre-filled media from shared post (already hosted)
      if (prefillMediaUrl) {
        setUploadStep('creating')
        setUploadProgress(85)
        // Use the original URL directly — it's already on IPFS or S3
        const ipfsUrl = prefillMediaUrl

        // Prepare overlays
        const overlays = convertLayersToOverlays()

        setUploadProgress(90)

        if (isLoggedIn) {
          await createStoryWithOverlays({
            variables: {
              mediaUrl: ipfsUrl,
              mediaType,
              duration: mediaType === 'video' ? Math.floor(videoDuration) || 15 : 60,
              overlays: overlays.length > 0 ? overlays : null,
              attachedTrackId: selectedNftTrack?.id || null,
              caption: normalizedEmbedUrl || null,
            },
          })
          toast.success('Shared to your Story!')
        } else {
          let walletAddress = me?.magicWalletAddress || me?.googleWalletAddress || me?.discordWalletAddress || me?.twitchWalletAddress
          if (!walletAddress) {
            const hexChars = '0123456789abcdef'
            let addressBody = ''
            for (let i = 0; i < 40; i++) {
              addressBody += hexChars[Math.floor(Math.random() * 16)]
            }
            walletAddress = `0x${addressBody}`
          }
          await guestCreateStoryWithOverlays({
            variables: {
              mediaUrl: ipfsUrl,
              mediaType,
              walletAddress,
              duration: mediaType === 'video' ? Math.floor(videoDuration) || 15 : 60,
              overlays: overlays.length > 0 ? overlays : null,
              attachedTrackId: selectedNftTrack?.id || null,
              caption: normalizedEmbedUrl || null,
            },
          })
          toast.success('Shared to Story! Login to earn SCID rewards.')
        }

        setUploadProgress(100)
        if (onPublish) onPublish(ipfsUrl, mediaType)
        handleClear()
        onClose()
        return
      }

      // At this point, mediaFile is guaranteed non-null (prefillMediaUrl path returned early)
      const file = mediaFile!

      if (useDirectUpload) {
        // 🚀 FAST PATH: Direct upload to IPFS (skips S3 entirely!)
        // One network transfer instead of two = ~2x faster
        setUploadStep('uploading')
        setUploadProgress(20)

        const base64Data = await fileToBase64(file)
        setUploadProgress(50)

        setUploadStep('pinning')
        setUploadProgress(60)

        const { data: pinResult } = await directPinToIPFS({
          variables: {
            input: {
              fileName: `story-${Date.now()}-${file.name}`,
              base64Data,
              mimeType: file.type,
            },
          },
        })

        if (!pinResult?.directPinToIPFS?.cid) {
          throw new Error('Failed to pin to IPFS')
        }
        ipfsCid = pinResult.directPinToIPFS.cid
        setUploadProgress(85)
      } else {
        // Reliable S3 → IPFS path: Upload to S3 first, then pin to IPFS
        setUploadStep('uploading')
        setUploadProgress(10)
        console.log('[CreateStoryModal] Step 1: Uploading to S3...', { isLoggedIn, fileSize: file.size, fileType: file.type })

        let s3Url: string | undefined
        try {
          s3Url = await upload([file])
        } catch (uploadErr: any) {
          console.error('[CreateStoryModal] S3 upload failed:', uploadErr)
          throw new Error(`S3 upload failed: ${uploadErr?.message || 'Unknown error'}`)
        }
        if (!s3Url) {
          throw new Error('Failed to upload file - no URL returned')
        }
        console.log('[CreateStoryModal] Step 1 complete: S3 URL =', s3Url)
        setUploadProgress(50)

        setUploadStep('pinning')
        setUploadProgress(60)

        const fileKey = s3Url.substring(s3Url.lastIndexOf('/') + 1)
        console.log('[CreateStoryModal] Step 2: Pinning to IPFS...', { fileKey, isLoggedIn })

        if (isLoggedIn) {
          try {
            const { data: pinResult } = await pinToIPFS({
              variables: {
                input: {
                  fileKey,
                  fileName: `story-${Date.now()}`,
                },
              },
            })
            if (!pinResult?.pinToIPFS?.cid) {
              throw new Error('No CID returned from pinToIPFS')
            }
            ipfsCid = pinResult.pinToIPFS.cid
            console.log('[CreateStoryModal] Step 2 complete: CID =', ipfsCid)
          } catch (pinErr: any) {
            console.error('[CreateStoryModal] pinToIPFS failed:', pinErr)
            throw new Error(`IPFS pinning failed: ${pinErr?.message || 'Unknown error'}`)
          }
        } else {
          try {
            const { data: pinResult } = await guestPinToIPFS({
              variables: {
                input: {
                  fileKey,
                  fileName: `guest-story-${Date.now()}`,
                },
              },
            })
            if (!pinResult?.guestPinToIPFS?.cid) {
              throw new Error('No CID returned from guestPinToIPFS')
            }
            ipfsCid = pinResult.guestPinToIPFS.cid
            console.log('[CreateStoryModal] Step 2 complete (guest): CID =', ipfsCid)
          } catch (pinErr: any) {
            console.error('[CreateStoryModal] guestPinToIPFS failed:', pinErr)
            throw new Error(`IPFS pinning failed: ${pinErr?.message || 'Unknown error'}`)
          }
        }
        setUploadProgress(85)
      }

      const ipfsUrl = `ipfs://${ipfsCid}`
      console.log('[CreateStoryModal] IPFS URL ready:', ipfsUrl)

      // Prepare overlays
      const overlays = convertLayersToOverlays()

      // Step 3: Create story with overlays
      setUploadStep('creating')
      setUploadProgress(90)
      console.log('[CreateStoryModal] Step 3: Creating story...', { isLoggedIn, overlaysCount: overlays.length })

      if (isLoggedIn) {
        try {
          await createStoryWithOverlays({
            variables: {
              mediaUrl: ipfsUrl,
              mediaType,
              duration: mediaType === 'video' ? Math.floor(videoDuration) : (prefillTrack ? 59 : 60),
              overlays: overlays.length > 0 ? overlays : null,
              attachedTrackId: selectedNftTrack?.id || null,
              caption: normalizedEmbedUrl || null, // Use caption field for embed URL
            },
          })
          console.log('[CreateStoryModal] Step 3 complete: Story created!')
          toast.success(selectedNftTrack ? 'Reel shared with music! SCID rewards enabled.' : 'Story shared!')
        } catch (storyErr: any) {
          console.error('[CreateStoryModal] createStoryWithOverlays failed:', storyErr)
          throw new Error(`Story creation failed: ${storyErr?.message || 'Unknown error'}`)
        }
      } else {
        // Use actual wallet if available, otherwise generate random
        let walletAddress = me?.magicWalletAddress || me?.googleWalletAddress || me?.discordWalletAddress || me?.twitchWalletAddress
        if (!walletAddress) {
          const hexChars = '0123456789abcdef'
          let addressBody = ''
          for (let i = 0; i < 40; i++) {
            addressBody += hexChars[Math.floor(Math.random() * 16)]
          }
          walletAddress = `0x${addressBody}`
        }

        await guestCreateStoryWithOverlays({
          variables: {
            mediaUrl: ipfsUrl,
            mediaType,
            walletAddress,
            duration: mediaType === 'video' ? Math.floor(videoDuration) : (prefillTrack ? 59 : 60),
            overlays: overlays.length > 0 ? overlays : null,
            attachedTrackId: selectedNftTrack?.id || null,
            caption: normalizedEmbedUrl || null,
          },
        })
        toast.success('Story shared! Login to earn SCID rewards.')
      }

      setUploadProgress(100)

      if (onPublish) {
        onPublish(ipfsUrl, mediaType)
      }

      handleClear()
      onClose()
    } catch (error: any) {
      console.error('Failed to publish:', error)
      const errorMsg = error?.graphQLErrors?.[0]?.message || error?.message || 'Upload failed. Try again.'
      setUploadError(errorMsg)
      toast.error(`Failed: ${errorMsg}`)
    } finally {
      setIsUploading(false)
      setUploadStep(null)
      setUploadProgress(0)
    }
  }

  const handleClear = () => {
    if (mediaPreview && !prefillMediaUrl) URL.revokeObjectURL(mediaPreview)
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType(null)
    setCompressionProgress(null)
    setIsCompressing(false)
    setVideoDuration(0)
    setWasCompressed(false)
    setOriginalSize(0)
    setUploadError(null)
    setTextLayers([])
    setPrefillMediaUrl(null)
    clearMusic()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60"
        onClick={onClose}
      />

      {/* Modal - compact on mobile to keep Share button accessible */}
      <div className="fixed z-[101] top-2 sm:top-8 left-1/2 -translate-x-1/2 w-[94vw] max-w-md animate-in slide-in-from-top-2 duration-150">
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden shadow-xl max-h-[75vh] sm:max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Create Reel
            </span>
            <button onClick={onClose} className="text-neutral-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Editor tabs */}
          <div className="flex border-b border-neutral-800">
            {[
              { id: 'media' as EditorTab, icon: ImageIcon, label: 'Media' },
              { id: 'music' as EditorTab, icon: Music2, label: 'Music' },
              { id: 'text' as EditorTab, icon: Type, label: 'Text' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content area - scrollable */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Media Tab */}
            {activeTab === 'media' && (
              <>
                {/* Upload area - supports drag & drop */}
                <div
                  onClick={() => !mediaPreview && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex items-center gap-3 p-3 rounded-xl border border-dashed transition-all ${
                    isDragging
                      ? 'border-cyan-400 bg-cyan-500/20 scale-[1.02]'
                      : mediaPreview
                        ? 'border-cyan-500/30 bg-cyan-500/5'
                        : 'border-neutral-700 hover:border-cyan-500/50 hover:bg-cyan-500/5 cursor-pointer'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.m4v,image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm,video/x-m4v"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center flex-shrink-0">
                    {mediaPreview ? (
                      mediaType === 'image' ? <ImageIcon className="w-5 h-5 text-cyan-400" /> : <Video className="w-5 h-5 text-cyan-400" />
                    ) : (
                      <Upload className="w-5 h-5 text-cyan-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {isDragging ? 'Drop to upload!' : mediaPreview ? (mediaFile?.name || 'Media selected') : 'Drag & drop or tap to add'}
                    </p>
                    <p className="text-neutral-500 text-xs">
                      {mediaPreview && videoDuration > 0 ? formatDuration(videoDuration) + ' • ' : ''}
                      {isLoggedIn ? '10min • 1GB' : '30sec • 10MB'} • 24h
                    </p>
                  </div>
                  {mediaPreview && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleClear() }}
                      className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-red-500/20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Preview with overlays - shorter on mobile to keep Share button visible */}
                {mediaPreview && (
                  <div
                    ref={previewContainerRef}
                    className="relative aspect-square sm:aspect-[9/16] rounded-xl overflow-hidden bg-black"
                  >
                    {/(?:youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitch\.tv|soundcloud\.com|spotify\.com|bandcamp\.com)/i.test(mediaPreview) ? (
                      <ReactPlayer url={mediaPreview} playing muted width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }} playsinline config={{ youtube: { playerVars: { autoplay: 1, modestbranding: 1, rel: 0, playsinline: 1 } } }} />
                    ) : mediaType === 'image' ? (
                      <img src={mediaPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={mediaPreview} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                    )}

                    {/* Crop button overlay */}
                    <button
                      onClick={() => setShowCropEditor(true)}
                      className="absolute top-2 right-2 z-30 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-colors"
                    >
                      <Crop className="w-4 h-4" />
                    </button>

                    {/* Text overlays */}
                    <StoryTextOverlay
                      layers={textLayers}
                      onLayersChange={setTextLayers}
                      containerRef={previewContainerRef}
                      isEditing={isEditingText}
                      onEditingChange={setIsEditingText}
                    />

                    {/* NFT Music badge */}
                    {selectedNftTrack && musicSource === 'nft' && (
                      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 p-2 rounded-lg bg-black/60 backdrop-blur-sm">
                        <img
                          src={getIpfsUrl(selectedNftTrack.artworkUrl, '/default-pictures/album-artwork.png')}
                          alt=""
                          className="w-10 h-10 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{selectedNftTrack.title}</p>
                          <p className="text-neutral-400 text-[10px] truncate">{selectedNftTrack.artist}</p>
                        </div>
                        <div className="px-1.5 py-0.5 rounded bg-purple-500 text-[9px] font-bold text-white">
                          SCID
                        </div>
                      </div>
                    )}

                    {/* External embed indicator */}
                    {normalizedEmbedUrl && musicSource === 'embed' && (
                      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 p-2 rounded-lg bg-black/60 backdrop-blur-sm">
                        <div className="w-10 h-10 rounded bg-neutral-800 flex items-center justify-center text-lg">
                          {EMBED_PLATFORMS.find(p => p.id === embedPlatform)?.icon || '🎵'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium">
                            {EMBED_PLATFORMS.find(p => p.id === embedPlatform)?.name || 'External'} Music
                          </p>
                          <p className="text-neutral-400 text-[10px] truncate">{embedUrl}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Compression progress */}
                {isCompressing && compressionProgress && (
                  <div className="flex items-center gap-2 text-xs text-cyan-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{compressionProgress.message}</span>
                  </div>
                )}

                {uploadError && (
                  <p className="text-red-400 text-xs">{uploadError}</p>
                )}
              </>
            )}

            {/* Music Tab */}
            {activeTab === 'music' && (
              <div className="space-y-3">
                <p className="text-neutral-400 text-xs">Add background music to your reel</p>

                {/* NFT Music option */}
                <div
                  onClick={() => setShowMusicPicker(true)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    musicSource === 'nft'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-neutral-700 hover:border-purple-500/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Music2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Music Library</p>
                    <p className="text-neutral-500 text-xs">Use our tracks - earn SCID rewards!</p>
                  </div>
                  {selectedNftTrack ? (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-purple-400" />
                      <button
                        onClick={(e) => { e.stopPropagation(); clearMusic() }}
                        className="text-neutral-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-500" />
                  )}
                </div>

                {/* Selected NFT track preview */}
                {selectedNftTrack && musicSource === 'nft' && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-neutral-800">
                    <img
                      src={getIpfsUrl(selectedNftTrack.artworkUrl, '/default-pictures/album-artwork.png')}
                      alt=""
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{selectedNftTrack.title}</p>
                      <p className="text-neutral-400 text-xs truncate">{selectedNftTrack.artist}</p>
                    </div>
                    <div className="px-2 py-1 rounded bg-gradient-to-r from-purple-500 to-cyan-500 text-[10px] font-bold text-white">
                      SCID ENABLED
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-neutral-800" />
                  <span className="text-neutral-600 text-xs">or</span>
                  <div className="flex-1 h-px bg-neutral-800" />
                </div>

                {/* External embed option */}
                <div
                  onClick={() => setShowEmbedInput(!showEmbedInput)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    musicSource === 'embed'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-neutral-700 hover:border-cyan-500/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">External Music</p>
                    <p className="text-neutral-500 text-xs">Spotify, YouTube, SoundCloud, Bandcamp</p>
                  </div>
                  {normalizedEmbedUrl ? (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-cyan-400" />
                      <button
                        onClick={(e) => { e.stopPropagation(); clearMusic() }}
                        className="text-neutral-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${showEmbedInput ? 'rotate-180' : ''}`} />
                  )}
                </div>

                {/* Embed URL input */}
                {showEmbedInput && (
                  <div className="space-y-2 pl-2">
                    <input
                      type="text"
                      placeholder="Paste Spotify, YouTube, or SoundCloud link..."
                      value={embedUrl}
                      onChange={(e) => handleEmbedUrlChange(e.target.value)}
                      className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50"
                    />
                    <div className="flex flex-wrap gap-2">
                      {EMBED_PLATFORMS.map((platform) => (
                        <span
                          key={platform.id}
                          className={`px-2 py-1 rounded text-[10px] ${
                            embedPlatform === platform.id
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'bg-neutral-800 text-neutral-500'
                          }`}
                        >
                          {platform.icon} {platform.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Text Tab */}
            {activeTab === 'text' && (
              <div className="space-y-3">
                <p className="text-neutral-400 text-xs">
                  Add text, hashtags, and mentions to your reel
                </p>

                {mediaPreview ? (
                  <>
                    <p className="text-white text-sm">
                      Use the <span className="text-cyan-400">+</span> button on the preview to add text layers.
                      Double-tap text to edit. Drag to reposition.
                    </p>
                    <div className="p-3 rounded-lg bg-neutral-800/50 space-y-2">
                      <p className="text-xs text-neutral-400">
                        <span className="text-cyan-400">#hashtags</span> - Link to hashtag search
                      </p>
                      <p className="text-xs text-neutral-400">
                        <span className="text-purple-400">@mentions</span> - Tag SoundChain users
                      </p>
                    </div>
                    {textLayers.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-neutral-500">{textLayers.length} text layer{textLayers.length !== 1 ? 's' : ''}</p>
                        {textLayers.map((layer, i) => (
                          <div
                            key={layer.id}
                            className="flex items-center gap-2 p-2 rounded bg-neutral-800/50"
                          >
                            <span className="text-xs text-neutral-500">#{i + 1}</span>
                            <span className="text-sm text-white truncate flex-1">{layer.text || '(empty)'}</span>
                            <button
                              onClick={() => setTextLayers(prev => prev.filter(l => l.id !== layer.id))}
                              className="text-neutral-500 hover:text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 rounded-lg bg-neutral-800/50 text-center">
                    <p className="text-neutral-500 text-sm">Upload media first to add text overlays</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-neutral-800 space-y-2">
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              {mediaPreview && (
                <span className="px-2 py-1 rounded-full bg-neutral-800 text-neutral-300 text-[10px] flex items-center gap-1">
                  {mediaType === 'image' ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                  Media
                </span>
              )}
              {selectedNftTrack && (
                <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-[10px] flex items-center gap-1">
                  <Music2 className="w-3 h-3" />
                  NFT Music
                </span>
              )}
              {normalizedEmbedUrl && (
                <span className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  Embed
                </span>
              )}
              {textLayers.length > 0 && (
                <span className="px-2 py-1 rounded-full bg-neutral-800 text-neutral-300 text-[10px] flex items-center gap-1">
                  <Type className="w-3 h-3" />
                  {textLayers.length} text
                </span>
              )}
            </div>

            {/* Upload progress bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-400 font-medium">
                    {uploadStep === 'uploading' && '📤 Uploading media...'}
                    {uploadStep === 'pinning' && '🔗 Pinning to IPFS...'}
                    {uploadStep === 'creating' && '✨ Creating reel...'}
                  </span>
                  <span className="text-neutral-500">{uploadProgress}%</span>
                </div>
                <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Share button */}
            <button
              onClick={handlePublish}
              disabled={isUploading || !mediaPreview}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-semibold disabled:opacity-50 disabled:from-neutral-700 disabled:to-neutral-700 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isUploading
                ? (uploadStep === 'uploading' ? 'Uploading...' : uploadStep === 'pinning' ? 'Pinning...' : 'Saving...')
                : selectedNftTrack ? 'Share Reel (SCID Enabled)' : 'Share Reel'}
            </button>
          </div>
        </div>
      </div>

      {/* NFT Music Picker Modal */}
      <NFTMusicPicker
        isOpen={showMusicPicker}
        onClose={() => setShowMusicPicker(false)}
        onSelect={handleSelectNftTrack}
        selectedTrackId={selectedNftTrack?.id}
      />

      {/* Media Crop Editor */}
      {showCropEditor && mediaFile && mediaType && (
        <MediaCropEditor
          file={mediaFile}
          mediaType={mediaType}
          onApply={handleCropApply}
          onCancel={() => setShowCropEditor(false)}
        />
      )}
    </>
  )
}
