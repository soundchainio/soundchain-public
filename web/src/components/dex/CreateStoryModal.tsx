import { useState, useRef, useCallback } from 'react'
import { X, Image as ImageIcon, Video, Upload, Clock, HardDrive, Loader2, CheckCircle, Sparkles } from 'lucide-react'
import { useMe } from 'hooks/useMe'
import { smartCompress, needsCompression, CompressionProgress } from 'lib/mediaCompression'
import { useUpload } from 'hooks/useUpload'
import { usePinToIpfsMutation } from 'lib/graphql'
import { toast } from 'react-toastify'
import { gql, useMutation } from '@apollo/client'

// GraphQL mutation for creating story (until codegen runs)
const CREATE_STORY = gql`
  mutation createStory($mediaUrl: String!, $mediaType: String!, $caption: String, $duration: Int) {
    createStory(mediaUrl: $mediaUrl, mediaType: $mediaType, caption: $caption, duration: $duration) {
      id
      mediaUrl
      mediaType
      createdAt
      expiresAt
    }
  }
`

// GraphQL mutation for guest story (no login required)
const GUEST_CREATE_STORY = gql`
  mutation guestCreateStory($mediaUrl: String!, $mediaType: String!, $walletAddress: String!, $caption: String, $duration: Int) {
    guestCreateStory(mediaUrl: $mediaUrl, mediaType: $mediaType, walletAddress: $walletAddress, caption: $caption, duration: $duration) {
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

interface CreateStoryModalProps {
  isOpen: boolean
  onClose: () => void
  onPublish?: (mediaUrl: string, mediaType: 'image' | 'video') => void
}

export const CreateStoryModal = ({ isOpen, onClose, onPublish }: CreateStoryModalProps) => {
  const meData = useMe()
  const me = meData?.me

  const isLoggedIn = !!me?.profile
  const maxDuration = isLoggedIn ? STORY_CONSTRAINTS.MAX_DURATION_MEMBER : STORY_CONSTRAINTS.MAX_DURATION_GUEST
  const maxFileSize = isLoggedIn ? STORY_CONSTRAINTS.MAX_FILE_SIZE_MEMBER : STORY_CONSTRAINTS.MAX_FILE_SIZE_GUEST

  // Upload hooks
  const { upload } = useUpload(undefined, undefined, !isLoggedIn)
  const [pinToIPFS] = usePinToIpfsMutation()
  const [createStory] = useMutation(CREATE_STORY, {
    refetchQueries: ['publicStories', 'myFollowingStories'],
  })

  const [guestCreateStory] = useMutation(GUEST_CREATE_STORY, {
    refetchQueries: ['publicStories'],
  })

  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [wasCompressed, setWasCompressed] = useState(false)
  const [originalSize, setOriginalSize] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handlePublish = async () => {
    if (!mediaFile || !mediaPreview || !mediaType) return
    setIsUploading(true)
    setUploadError(null)

    try {
      // Step 1: Upload to S3
      const s3Url = await upload([mediaFile])
      if (!s3Url) {
        throw new Error('Failed to upload file')
      }

      // Step 2: Pin to IPFS
      const fileKey = s3Url.substring(s3Url.lastIndexOf('/') + 1)
      const { data: pinResult } = await pinToIPFS({
        variables: {
          input: {
            fileKey,
            fileName: `story-${Date.now()}`,
          },
        },
      })

      if (!pinResult?.pinToIPFS?.cid) {
        throw new Error('Failed to pin to IPFS')
      }

      const ipfsUrl = `ipfs://${pinResult.pinToIPFS.cid}`

      // Step 3: Create story in database
      if (isLoggedIn) {
        await createStory({
          variables: {
            mediaUrl: ipfsUrl,
            mediaType,
            duration: mediaType === 'video' ? Math.floor(videoDuration) : 60,
          },
        })
        toast.success('Story shared!')
      } else {
        // Guest users - create guest story with anonymous wallet address
        const hexChars = '0123456789abcdef'
        let addressBody = ''
        for (let i = 0; i < 40; i++) {
          addressBody += hexChars[Math.floor(Math.random() * 16)]
        }
        const anonymousAddress = `0x${addressBody}`

        await guestCreateStory({
          variables: {
            mediaUrl: ipfsUrl,
            mediaType,
            walletAddress: anonymousAddress,
            duration: mediaType === 'video' ? Math.floor(videoDuration) : 60,
          },
        })
        toast.success('Story shared! Login to keep permanently.')
      }

      if (onPublish) {
        onPublish(ipfsUrl, mediaType)
      }

      handleClear()
      onClose()
    } catch (error: any) {
      console.error('Failed to publish:', error)
      setUploadError(error?.message || 'Upload failed. Try again.')
      toast.error('Failed to share story')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClear = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType(null)
    setCompressionProgress(null)
    setIsCompressing(false)
    setVideoDuration(0)
    setWasCompressed(false)
    setOriginalSize(0)
    setUploadError(null)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop - no blur */}
      <div
        className="fixed inset-0 z-[100] bg-black/50"
        onClick={onClose}
      />

      {/* Ultra-slim modal - positioned at top below header */}
      <div className="fixed z-[101] top-14 sm:top-16 left-1/2 -translate-x-1/2 w-[94vw] max-w-sm animate-in slide-in-from-top-2 duration-150">
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden shadow-xl">
          {/* Compact header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
            <span className="text-xs font-medium text-white flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Story
            </span>
            <button onClick={onClose} className="text-neutral-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-2 space-y-2">
            {/* Always visible upload area - slim inline style */}
            <div
              onClick={() => !mediaPreview && fileInputRef.current?.click()}
              className={`flex items-center gap-2 p-2 rounded-lg border border-dashed transition-all ${
                mediaPreview
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
              <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center flex-shrink-0">
                {mediaPreview ? (
                  mediaType === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-cyan-400" /> : <Video className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[11px] font-medium truncate">
                  {mediaPreview ? (mediaFile?.name || 'Media selected') : 'Add photo or video'}
                </p>
                <p className="text-neutral-500 text-[9px]">
                  {mediaPreview && videoDuration > 0 ? formatDuration(videoDuration) + ' • ' : ''}
                  {isLoggedIn ? '10min • 1GB' : '30sec • 10MB'} • 24h
                </p>
              </div>
              {mediaPreview && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleClear() }}
                  className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-red-500/20"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Preview - only when media selected */}
            {mediaPreview && (
              <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-black">
                {mediaType === 'image' ? (
                  <img src={mediaPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <video src={mediaPreview} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                )}
              </div>
            )}

            {/* Share button - always visible */}
            <button
              onClick={handlePublish}
              disabled={isUploading || !mediaPreview}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-medium disabled:opacity-50 disabled:from-neutral-700 disabled:to-neutral-700 flex items-center justify-center gap-1.5"
            >
              {isUploading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              {isUploading ? 'Uploading...' : 'Share Story'}
            </button>

            {/* Compression progress - inline */}
            {isCompressing && compressionProgress && (
              <div className="mt-2 flex items-center gap-2 text-[10px] text-cyan-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{compressionProgress.message}</span>
              </div>
            )}

            {uploadError && (
              <p className="mt-2 text-red-400 text-[10px]">{uploadError}</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
