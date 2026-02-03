import { useState, useRef, useCallback } from 'react'
import { X, Image as ImageIcon, Video, Upload, Clock, HardDrive, Loader2, CheckCircle, Sparkles } from 'lucide-react'
import { useMe } from 'hooks/useMe'
import { smartCompress, needsCompression, CompressionProgress } from 'lib/mediaCompression'

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

    try {
      // TODO: Upload to IPFS
      await new Promise(resolve => setTimeout(resolve, 1500))

      if (onPublish) {
        onPublish(mediaPreview, mediaType)
      }

      handleClear()
      onClose()
    } catch (error) {
      console.error('Failed to publish:', error)
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
      {/* Backdrop - translucent */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slim dropdown modal - cyberpunk style like compose button */}
      <div className="fixed z-[101] top-20 left-1/2 -translate-x-1/2 w-[90vw] max-w-sm animate-in slide-in-from-top-4 duration-200">
        <div className="relative bg-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.2)] overflow-hidden">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-purple-500/10 pointer-events-none" />

          {/* Header */}
          <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-white">Create Story</span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="relative p-4">
            {!mediaPreview ? (
              /* Upload area - compact */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border border-dashed border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.m4v,image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm,video/x-m4v"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center border border-cyan-500/30">
                  <Upload className="w-5 h-5 text-cyan-400" />
                </div>

                <div className="text-center">
                  <p className="text-white text-sm font-medium">Tap to upload</p>
                  <p className="text-white/40 text-xs mt-0.5">or drag and drop</p>
                </div>

                <div className="flex items-center gap-3 text-white/40 text-xs">
                  <div className="flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    <span>Images</span>
                  </div>
                  <span className="text-white/20">|</span>
                  <div className="flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    <span>Videos</span>
                  </div>
                </div>

                {/* Compression progress */}
                {isCompressing && compressionProgress && (
                  <div className="w-full mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                      <span className="text-cyan-400 text-xs">{compressionProgress.message}</span>
                    </div>
                    <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                        style={{ width: `${compressionProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {uploadError && (
                  <p className="text-red-400 text-xs mt-1">{uploadError}</p>
                )}
              </div>
            ) : (
              /* Preview - compact */
              <div className="space-y-3">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                  {mediaType === 'image' ? (
                    <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <video src={mediaPreview} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                  )}

                  {/* File info overlay */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/70 backdrop-blur-sm text-[10px] text-white/70">
                    {videoDuration > 0 && (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(videoDuration)}</span>
                        <span className="text-white/30">•</span>
                      </>
                    )}
                    <HardDrive className="w-3 h-3" />
                    <span>{formatFileSize(mediaFile?.size || 0)}</span>
                  </div>

                  {wasCompressed && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-[10px] text-green-400">
                      <CheckCircle className="w-3 h-3" />
                      <span>Optimized</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleClear}
                    className="flex-1 py-2 rounded-lg bg-white/10 text-white/70 text-sm font-medium hover:bg-white/15 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={isUploading}
                    className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-medium hover:from-cyan-400 hover:to-purple-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Share</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer info */}
          <div className="relative px-4 py-2 border-t border-white/5 flex items-center justify-center gap-4 text-[10px] text-white/30">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{isLoggedIn ? 'Up to 10 min' : 'Up to 30 sec'}</span>
            </div>
            <span className="text-white/10">•</span>
            <div className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              <span>{isLoggedIn ? 'Max 1 GB' : 'Max 10 MB'}</span>
            </div>
            <span className="text-white/10">•</span>
            <span>24h expiry</span>
          </div>
        </div>
      </div>
    </>
  )
}
