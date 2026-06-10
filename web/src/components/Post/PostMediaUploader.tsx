import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Clock, ImagePlus } from 'lucide-react'
import { useUpload } from 'hooks/useUpload'
import { imageMimeTypes, videoMimeTypes, audioMimeTypes } from 'lib/mimeTypes'
import Image from 'next/image'

interface PostMediaUploaderProps {
  onMediaSelected: (url: string, type: 'image' | 'video' | 'audio', thumbnailUrl?: string) => void
  onMediaRemoved: () => void
  /** Fired when >1 image is selected — an IG-style carousel gallery of URLs. */
  onGalleryUploaded?: (urls: string[]) => void
  currentUrl?: string
  currentType?: string
  isGuest?: boolean // Use guest upload endpoint (images only)
}

const MAX_FILE_SIZE_MEMBER = 1024 * 1024 * 1024 // 1GB for SC members
const MAX_FILE_SIZE_GUEST = 10 * 1024 * 1024 // 10MB for public/guest users

// Helper to capture a frame from video file and return as Blob
const captureVideoThumbnail = (videoFile: File): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    // Use 'auto' preload to ensure video data loads for frame capture
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    // Cross-origin for blob URLs
    video.crossOrigin = 'anonymous'

    const objectUrl = URL.createObjectURL(videoFile)
    video.src = objectUrl

    let resolved = false
    const cleanup = () => {
      if (!resolved) {
        resolved = true
        URL.revokeObjectURL(objectUrl)
      }
    }

    // Wait for enough data to seek - use canplaythrough for large files
    video.oncanplaythrough = () => {
      if (resolved) return
      // Seek to 1 second or 10% of duration, whichever is smaller
      const seekTime = Math.min(1, video.duration * 0.1)
      video.currentTime = seekTime
    }

    // Fallback for browsers that fire loadeddata before canplaythrough
    video.onloadeddata = () => {
      if (resolved) return
      // Give it a moment to buffer more data
      setTimeout(() => {
        if (resolved) return
        const seekTime = Math.min(1, video.duration * 0.1)
        video.currentTime = seekTime
      }, 500)
    }

    video.onseeked = () => {
      if (resolved) return
      try {
        const canvas = document.createElement('canvas')
        // Use video dimensions, max 1280px wide for reasonable thumbnail size
        const scale = Math.min(1, 1280 / video.videoWidth)
        canvas.width = Math.max(1, video.videoWidth * scale)
        canvas.height = Math.max(1, video.videoHeight * scale)

        const ctx = canvas.getContext('2d')
        if (!ctx || video.videoWidth === 0) {
          console.warn('Canvas context or video dimensions unavailable')
          cleanup()
          resolve(null)
          return
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        canvas.toBlob((blob) => {
          cleanup()
          resolve(blob)
        }, 'image/jpeg', 0.85)
      } catch (err) {
        console.error('Failed to capture video thumbnail:', err)
        cleanup()
        resolve(null)
      }
    }

    video.onerror = (e) => {
      console.error('Video load error for thumbnail capture:', e)
      cleanup()
      resolve(null)
    }

    // Increased timeout to 30 seconds for large files
    setTimeout(() => {
      if (!resolved) {
        console.warn('Thumbnail capture timed out after 30s')
        cleanup()
        resolve(null)
      }
    }, 30000)
  })
}

// Accepted file types for posts (same as NFT minting)
// Note: Use explicit MIME types instead of wildcards for better desktop browser support
// Extended MIME types for cross-browser compatibility - browsers report different types!
const acceptedTypes = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/bmp': ['.bmp'],
  // Videos - extended for cross-browser compatibility
  'video/mp4': ['.mp4', '.m4v'],
  'video/quicktime': ['.mov', '.qt'], // MOV files - important for iOS recordings
  'video/webm': ['.webm'],
  'video/x-msvideo': ['.avi'],
  'video/x-matroska': ['.mkv'],
  'video/x-m4v': ['.m4v'], // Some browsers report this instead of video/mp4
  'video/3gpp': ['.3gp', '.3gpp'],
  'video/3gpp2': ['.3g2', '.3gpp2'],
  'video/ogg': ['.ogv', '.ogg'],
  // Audio
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/wave': ['.wav'], // Some browsers use audio/wave
  'audio/x-wav': ['.wav'], // Some browsers use audio/x-wav
  'audio/flac': ['.flac'],
  'audio/x-flac': ['.flac'],
  'audio/ogg': ['.ogg', '.oga'],
  'audio/mp4': ['.m4a', '.mp4'],
  'audio/x-m4a': ['.m4a'],
  'audio/aiff': ['.aiff', '.aif'],
  'audio/x-aiff': ['.aiff', '.aif'],
  'audio/webm': ['.weba'],
}

export const PostMediaUploader = ({
  onMediaSelected,
  onMediaRemoved,
  onGalleryUploaded,
  currentUrl,
  currentType,
  isGuest,
}: PostMediaUploaderProps) => {
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [gallery, setGallery] = useState<string[]>([]) // IG carousel — uploaded image URLs when >1
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | null>(
    (currentType as 'image' | 'video' | 'audio') || null
  )
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync internal state when parent clears the media (after successful post)
  useEffect(() => {
    setPreview(currentUrl || null)
    setMediaType((currentType as 'image' | 'video' | 'audio') || null)
    // Parent cleared the media (post submitted / removed) → drop the gallery too,
    // otherwise the carousel strip lingers after posting. Building a gallery sets
    // currentUrl to the first image, so this only fires on a real clear.
    if (!currentUrl) setGallery([])
  }, [currentUrl, currentType])

  // Track pending thumbnail URL for video uploads
  const [pendingThumbnailUrl, setPendingThumbnailUrl] = useState<string | undefined>()

  // While we're assembling a multi-image carousel we push URLs ourselves and
  // fire onGalleryUploaded once at the end. Suppress useUpload's per-file
  // onMediaSelected during that window so it can't clobber the assembled array
  // (which would collapse the carousel back to a single image).
  const buildingGalleryRef = useRef(false)
  // Hidden input for the "Add photos" affordance (append to an existing image/gallery).
  const addMoreRef = useRef<HTMLInputElement>(null)

  const { upload } = useUpload(undefined, (url) => {
    if (buildingGalleryRef.current) return
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

      // IG-style carousel that ACCUMULATES. Any time images come in — whether
      // multi-selected at once OR added one at a time — append them to whatever
      // images the post already has, instead of replacing. So 2+ images always
      // become a swipeable carousel, never just the last one added. (The old
      // logic only built a gallery when 2+ arrived in a single drop, and once a
      // single image was set the dropzone disappeared, making a second image
      // impossible — that's why multi-image posts weren't swiping.)
      const incomingImages = acceptedFiles.filter((f) => f.type.startsWith('image/'))
      const allIncomingAreImages = incomingImages.length > 0 && incomingImages.length === acceptedFiles.length
      // Images already on the post: the working gallery, or a single uploaded image.
      const existing = gallery.length > 0
        ? gallery
        : currentUrl && (currentType as string) === 'image'
          ? [currentUrl]
          : []
      const willHaveMultiple = existing.length + incomingImages.length > 1
      if (allIncomingAreImages && onGalleryUploaded && (willHaveMultiple || existing.length > 0)) {
        setError(null)
        setUploading(true)
        setMediaType('image')
        setPreview(URL.createObjectURL(incomingImages[0]))
        buildingGalleryRef.current = true
        try {
          const newUrls: string[] = []
          for (const f of incomingImages.slice(0, 10)) {
            const u = await upload([f])
            if (u) newUrls.push(u)
          }
          const combined = [...existing, ...newUrls].slice(0, 10)
          if (combined.length > 1) {
            setGallery(combined)
            onGalleryUploaded(combined)
          } else if (combined.length === 1) {
            setGallery([])
            onMediaSelected(combined[0], 'image')
          }
        } catch (err: any) {
          setError(err.message || 'Upload failed')
        } finally {
          buildingGalleryRef.current = false
          setUploading(false)
        }
        return
      }

      setError(null)
      setUploading(true)

      // Log file info for debugging
      console.log('[PostMediaUploader] File accepted:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      })

      // Determine media type - with extension fallback for edge cases
      let type: 'image' | 'video' | 'audio'
      const ext = file.name.toLowerCase().split('.').pop()

      if (file.type.startsWith('image/')) {
        type = 'image'
      } else if (file.type.startsWith('video/') || ['mov', 'mp4', 'webm', 'avi', 'mkv', 'm4v', '3gp'].includes(ext || '')) {
        type = 'video'
      } else if (file.type.startsWith('audio/') || ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aiff'].includes(ext || '')) {
        type = 'audio'
      } else {
        setError(`Unsupported file type: ${file.type || ext}`)
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
    [upload, uploadThumbnail, onMediaSelected, onGalleryUploaded]
  )

  // Dynamic file size limit based on user type
  const maxFileSize = isGuest ? MAX_FILE_SIZE_GUEST : MAX_FILE_SIZE_MEMBER
  const maxSizeLabel = isGuest ? '10 MB' : '1 GB'

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize: maxFileSize,
    multiple: true,   // allow multi-select for IG-style image carousels (single still works)
    disabled: uploading,
    onDropRejected: (rejections) => {
      const rejection = rejections[0]
      const errorCode = rejection?.errors[0]?.code
      const fileType = rejection?.file?.type || 'unknown'

      if (errorCode === 'file-too-large') {
        const sizeMB = Math.round((rejection?.file?.size || 0) / (1024 * 1024))
        setError(`File too large (${sizeMB} MB). Maximum size is ${maxSizeLabel}.${isGuest ? ' Login for up to 1 GB!' : ''}`)
      } else if (errorCode === 'file-invalid-type') {
        console.error('Rejected file type:', fileType, rejection?.file?.name)
        setError(`Unsupported format (${fileType}). Try MP4, MOV, MP3, or common image formats.`)
      } else {
        setError(`Upload error: ${rejection?.errors[0]?.message || 'Unknown error'}`)
      }
    },
  })

  const handleRemove = () => {
    setPreview(null)
    setMediaType(null)
    setGallery([])
    setError(null)
    onMediaRemoved()
  }

  // "Add photos" — append more images to the current image/gallery. Routes the
  // picked files through onDrop, which accumulates them into the carousel.
  const onAddMore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length) onDrop(files)
  }

  // Multi-image carousel preview — a thumbnail strip so you SEE the gallery
  // you're building before posting.
  if (gallery.length > 1) {
    return (
      <div className="relative rounded-lg overflow-hidden bg-neutral-800 mb-3 p-2">
        <button
          onClick={handleRemove}
          className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <span className="text-xs font-bold text-white">🎠 Carousel</span>
          <span className="text-[11px] text-neutral-400">{gallery.length} photos · swipe in the post</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {gallery.map((url, i) => (
            <div key={i} className="relative flex-shrink-0 w-24 h-24 rounded-md overflow-hidden border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <span className="absolute top-0.5 left-0.5 px-1 rounded bg-black/60 text-white text-[9px] font-bold tabular-nums">{i + 1}</span>
            </div>
          ))}
          {gallery.length < 10 && (
            <button
              type="button"
              onClick={() => addMoreRef.current?.click()}
              disabled={uploading}
              className="flex-shrink-0 w-24 h-24 rounded-md border border-dashed border-white/25 hover:border-white/50 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:text-white transition disabled:opacity-50"
            >
              <ImagePlus className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Add</span>
            </button>
          )}
        </div>
        <input ref={addMoreRef} type="file" accept="image/*" multiple className="hidden" onChange={onAddMore} />
      </div>
    )
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
            {/* Add more photos → turns a single image into a swipeable carousel */}
            <button
              type="button"
              onClick={() => addMoreRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              Add photos
            </button>
            <input ref={addMoreRef} type="file" accept="image/*" multiple className="hidden" onChange={onAddMore} />
          </div>
        )}

        {mediaType === 'video' && (
          <video
            src={preview}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-80 bg-black"
            onError={(e) => {
              console.error('Video preview error:', e)
              setError('Video format may not be supported by your browser. Try MP4 format.')
            }}
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

        {/* Error message */}
        {error && (
          <div className="p-2 bg-red-500/20 border-t border-red-500/30">
            <p className="text-red-400 text-xs">{error}</p>
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
        {!isDragActive && (
          <span className="block text-[11px] text-neutral-500 mt-0.5">Pick 2+ photos for a swipeable carousel 🎠</span>
        )}
      </div>
      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}
