import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Clock } from 'lucide-react'
import { useUpload } from 'hooks/useUpload'
import { imageMimeTypes, videoMimeTypes, audioMimeTypes } from 'lib/mimeTypes'
import Image from 'next/image'

interface PostMediaUploaderProps {
  onMediaSelected: (url: string, type: 'image' | 'video' | 'audio', thumbnailUrl?: string) => void
  onMediaRemoved: () => void
  currentUrl?: string
  currentType?: string
  isGuest?: boolean // Use guest upload endpoint (images only)
}

const MAX_FILE_SIZE = 1024 * 1024 * 1024 // 1GB - SoundChain supports large audio/video files

// Helper to capture a frame from video file and return as Blob
const captureVideoThumbnail = (videoFile: File): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const objectUrl = URL.createObjectURL(videoFile)
    video.src = objectUrl

    video.onloadeddata = () => {
      // Seek to 1 second or 10% of duration, whichever is smaller
      const seekTime = Math.min(1, video.duration * 0.1)
      video.currentTime = seekTime
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        // Use video dimensions, max 1280px wide for reasonable thumbnail size
        const scale = Math.min(1, 1280 / video.videoWidth)
        canvas.width = video.videoWidth * scale
        canvas.height = video.videoHeight * scale

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(objectUrl)
          resolve(null)
          return
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl)
          resolve(blob)
        }, 'image/jpeg', 0.85)
      } catch (err) {
        console.error('Failed to capture video thumbnail:', err)
        URL.revokeObjectURL(objectUrl)
        resolve(null)
      }
    }

    video.onerror = () => {
      console.error('Video load error for thumbnail capture')
      URL.revokeObjectURL(objectUrl)
      resolve(null)
    }

    // Timeout fallback
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
      resolve(null)
    }, 10000)
  })
}

// Accepted file types for posts (same as NFT minting)
// Note: Use explicit MIME types instead of wildcards for better desktop browser support
const acceptedTypes = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/bmp': ['.bmp'],
  // Videos - explicit MIME types for desktop browser compatibility
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'], // MOV files - important for iOS recordings
  'video/webm': ['.webm'],
  'video/x-msvideo': ['.avi'],
  'video/x-matroska': ['.mkv'],
  // Audio
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/flac': ['.flac'],
  'audio/ogg': ['.ogg'],
  'audio/mp4': ['.m4a'],
  'audio/aiff': ['.aiff'],
  'audio/x-aiff': ['.aiff'],
}

export const PostMediaUploader = ({
  onMediaSelected,
  onMediaRemoved,
  currentUrl,
  currentType,
  isGuest,
}: PostMediaUploaderProps) => {
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | null>(
    (currentType as 'image' | 'video' | 'audio') || null
  )
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync internal state when parent clears the media (after successful post)
  useEffect(() => {
    setPreview(currentUrl || null)
    setMediaType((currentType as 'image' | 'video' | 'audio') || null)
  }, [currentUrl, currentType])

  // Track pending thumbnail URL for video uploads
  const [pendingThumbnailUrl, setPendingThumbnailUrl] = useState<string | undefined>()

  const { upload } = useUpload(undefined, (url) => {
    if (url && mediaType) {
      onMediaSelected(url, mediaType, pendingThumbnailUrl)
      setPendingThumbnailUrl(undefined)
    }
  }, isGuest)

  // Separate upload hook for thumbnail (always use regular endpoint, thumbnails are small images)
  const { upload: uploadThumbnail } = useUpload(undefined, () => {}, false)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setError(null)
      setUploading(true)

      // Determine media type
      let type: 'image' | 'video' | 'audio'
      if (file.type.startsWith('image/')) {
        type = 'image'
      } else if (file.type.startsWith('video/')) {
        type = 'video'
      } else if (file.type.startsWith('audio/')) {
        type = 'audio'
      } else {
        setError('Unsupported file type')
        setUploading(false)
        return
      }

      setMediaType(type)

      // Create local preview
      const objectUrl = URL.createObjectURL(file)
      setPreview(objectUrl)

      try {
        // For videos, capture and upload thumbnail first
        let thumbnailUrl: string | undefined
        if (type === 'video') {
          const thumbnailBlob = await captureVideoThumbnail(file)
          if (thumbnailBlob) {
            // Convert blob to File for upload
            const thumbnailFile = new File(
              [thumbnailBlob],
              `thumbnail-${Date.now()}.jpg`,
              { type: 'image/jpeg' }
            )
            thumbnailUrl = await uploadThumbnail([thumbnailFile])
            setPendingThumbnailUrl(thumbnailUrl || undefined)
          }
        }

        // Upload main media to S3
        const url = await upload([file])
        if (url) {
          onMediaSelected(url, type, thumbnailUrl)
        }
      } catch (err: any) {
        console.error('Upload failed:', err)
        setError(err.message || 'Upload failed')
        setPreview(null)
        setMediaType(null)
        setPendingThumbnailUrl(undefined)
      } finally {
        setUploading(false)
      }
    },
    [upload, uploadThumbnail, onMediaSelected]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: uploading,
    onDropRejected: (rejections) => {
      const rejection = rejections[0]
      if (rejection?.errors[0]?.code === 'file-too-large') {
        setError('File too large. Max size is 1GB.')
      } else {
        setError('Invalid file type')
      }
    },
  })

  const handleRemove = () => {
    setPreview(null)
    setMediaType(null)
    setError(null)
    onMediaRemoved()
  }

  // Show preview if media is selected
  if (preview) {
    return (
      <div className="relative rounded-lg overflow-hidden bg-neutral-800 mb-3">
        {/* Remove button */}
        <button
          onClick={handleRemove}
          className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Ephemeral badge */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 bg-amber-500/90 rounded-full text-xs font-medium text-black">
          <Clock className="w-3 h-3" />
          <span>24h</span>
        </div>

        {/* Media preview */}
        {mediaType === 'image' && (
          <div className="relative w-full aspect-video">
            <Image
              src={preview}
              alt="Upload preview"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}

        {mediaType === 'video' && (
          <video
            src={preview}
            controls
            className="w-full max-h-80"
          />
        )}

        {mediaType === 'audio' && (
          <div className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <span className="text-2xl">🎵</span>
            </div>
            <audio src={preview} controls className="flex-1" />
          </div>
        )}

        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>
    )
  }

  // Show upload button
  return (
    <div className="mb-3">
      <div
        {...getRootProps()}
        className={`
          flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors
          ${isDragActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/50'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <span className={`text-sm ${isDragActive ? 'text-cyan-400' : 'text-gray-400'}`}>
          {isDragActive ? 'Drop file here' : 'Add photo, video, or audio (24h)'}
        </span>
      </div>
      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}
