import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Clock } from 'lucide-react'
import { useUpload } from 'hooks/useUpload'
import { imageMimeTypes, videoMimeTypes, audioMimeTypes } from 'lib/mimeTypes'
import Image from 'next/image'

interface PostMediaUploaderProps {
  onMediaSelected: (url: string, type: 'image' | 'video' | 'audio') => void
  onMediaRemoved: () => void
  currentUrl?: string
  currentType?: string
  isGuest?: boolean // Use guest upload endpoint (images only)
}

const MAX_FILE_SIZE = 1024 * 1024 * 1024 // 1GB - SoundChain supports large audio/video files

// Accepted file types for posts (same as NFT minting)
const acceptedTypes = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
  'video/*': ['.mp4', '.mov', '.webm', '.avi', '.mkv'],
  'audio/*': ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aiff'],
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

  const { upload } = useUpload(undefined, (url) => {
    if (url && mediaType) {
      onMediaSelected(url, mediaType)
    }
  }, isGuest)

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
        // Upload to S3
        const url = await upload([file])
        if (url) {
          onMediaSelected(url, type)
        }
      } catch (err: any) {
        console.error('Upload failed:', err)
        setError(err.message || 'Upload failed')
        setPreview(null)
        setMediaType(null)
      } finally {
        setUploading(false)
      }
    },
    [upload, onMediaSelected]
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
