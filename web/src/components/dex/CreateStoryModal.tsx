import { useState, useRef, useCallback } from 'react'
import { X, Camera, Image as ImageIcon, Video, Sparkles, Upload, Type, Sticker, Music, Trash2, Share2, Clock, HardDrive, Loader2, CheckCircle } from 'lucide-react'
import { useMe } from 'hooks/useMe'
import { smartCompress, needsCompression, formatBytes, CompressionProgress } from 'lib/mediaCompression'

// Story/Reel constraints - file size is hidden (easter egg!), but time is shown
const STORY_CONSTRAINTS = {
  MIN_DURATION: 1, // 1 second minimum
  MAX_DURATION_GUEST: 30, // 30 seconds max for public/guest
  MAX_DURATION_MEMBER: 600, // 10 minutes max for logged-in users
  DEFAULT_DURATION_GUEST: 15, // 15 seconds default for guests
  DEFAULT_DURATION_MEMBER: 60, // 1 minute default for members
  EXPIRY_HOURS: 24, // All stories expire after 24 hours
  MAX_FILE_SIZE_GUEST: 10 * 1024 * 1024, // 10 MB for public/guest users
  MAX_FILE_SIZE_MEMBER: 1024 * 1024 * 1024, // 1 GB for SC members
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov'],
}

// Duration options for LOGGED IN users (1-10 minutes)
const DURATION_OPTIONS_MEMBER = [
  { label: '1 min', value: 60 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
]

// Duration options for PUBLIC/GUEST posts (max 30 seconds, 24hr expiry)
const DURATION_OPTIONS_GUEST = [
  { label: '10s', value: 10 },
  { label: '15s', value: 15 },
  { label: '20s', value: 20 },
  { label: '30s', value: 30 },
]

interface CreateStoryModalProps {
  isOpen: boolean
  onClose: () => void
  onPublish?: (mediaUrl: string, mediaType: 'image' | 'video') => void
}

export const CreateStoryModal = ({ isOpen, onClose, onPublish }: CreateStoryModalProps) => {
  const meData = useMe()
  const me = meData?.me

  // Determine if user is logged in - affects duration and file size limits
  const isLoggedIn = !!me?.profile
  const maxDuration = isLoggedIn ? STORY_CONSTRAINTS.MAX_DURATION_MEMBER : STORY_CONSTRAINTS.MAX_DURATION_GUEST
  const maxFileSize = isLoggedIn ? STORY_CONSTRAINTS.MAX_FILE_SIZE_MEMBER : STORY_CONSTRAINTS.MAX_FILE_SIZE_GUEST
  const defaultDuration = isLoggedIn ? STORY_CONSTRAINTS.DEFAULT_DURATION_MEMBER : STORY_CONSTRAINTS.DEFAULT_DURATION_GUEST
  const durationOptions = isLoggedIn ? DURATION_OPTIONS_MEMBER : DURATION_OPTIONS_GUEST

  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const [showCaptionInput, setShowCaptionInput] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState(defaultDuration)
  const [wasCompressed, setWasCompressed] = useState(false)
  const [originalSize, setOriginalSize] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  // Format duration for display
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

    // Validate file type
    const isImage = STORY_CONSTRAINTS.SUPPORTED_IMAGE_TYPES.includes(file.type)
    const isVideo = STORY_CONSTRAINTS.SUPPORTED_VIDEO_TYPES.includes(file.type) || file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      setUploadError('Unsupported file type. Please use JPG, PNG, GIF, WebP for images or MP4, WebM, MOV for videos.')
      return
    }

    // Validate file size based on user type
    if (file.size > maxFileSize) {
      const maxSizeLabel = isLoggedIn ? '1 GB' : '10 MB'
      setUploadError(`File too large. Max: ${maxSizeLabel}. Your file: ${formatFileSize(file.size)}${!isLoggedIn ? ' - Login for up to 1 GB!' : ''}`)
      return
    }

    // For videos, check duration first
    if (isVideo) {
      const previewUrl = URL.createObjectURL(file)
      const tempVideo = document.createElement('video')
      tempVideo.preload = 'metadata'
      tempVideo.src = previewUrl

      tempVideo.onloadedmetadata = async () => {
        const duration = tempVideo.duration
        setVideoDuration(duration)

        if (duration > maxDuration) {
          const maxMsg = isLoggedIn ? '10 minutes' : '30 seconds'
          setUploadError(`Video too long. Max: ${maxMsg}. Your video: ${formatDuration(duration)}`)
          URL.revokeObjectURL(previewUrl)
          return
        }

        // Check if compression is needed (file too large)
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
            console.error('Compression failed:', err)
            // Fall back to original file
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
        setUploadError('Could not read video file. Please try a different format.')
        URL.revokeObjectURL(previewUrl)
      }
    } else {
      // Image - check if compression is needed
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
          console.error('Compression failed:', err)
          // Fall back to original file
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
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const input = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>
      handleFileSelect(input)
    }
  }, [handleFileSelect])

  const handlePublish = async () => {
    if (!mediaFile || !mediaPreview || !mediaType) return

    setIsUploading(true)

    try {
      // TODO: Upload to IPFS via Pinata
      // const ipfsUrl = await uploadToIPFS(mediaFile)

      // For now, simulate upload
      await new Promise(resolve => setTimeout(resolve, 1500))

      // TODO: Create story via GraphQL mutation
      // await createStory({ mediaUrl: ipfsUrl, mediaType, caption })

      console.log('Publishing story:', { mediaType, caption })

      if (onPublish) {
        onPublish(mediaPreview, mediaType)
      }

      // Reset and close
      handleClear()
      onClose()
    } catch (error) {
      console.error('Failed to publish story:', error)
      alert('Failed to publish story. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClear = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview)
    }
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType(null)
    setCaption('')
    setShowCaptionInput(false)
    setCompressionProgress(null)
    setIsCompressing(false)
    setSelectedDuration(STORY_CONSTRAINTS.DEFAULT_DURATION)
    setVideoDuration(0)
    setWasCompressed(false)
    setOriginalSize(0)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Modal container */}
      <div className="relative w-full max-w-md md:max-w-lg bg-neutral-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Create Story</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!mediaPreview ? (
            /* Upload area */
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="relative aspect-[9/16] max-h-[60vh] rounded-xl border-2 border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center gap-4 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                <Upload className="w-8 h-8 text-cyan-400" />
              </div>

              <div className="text-center">
                <p className="text-white font-medium">Tap to upload</p>
                <p className="text-white/50 text-sm mt-1">or drag and drop</p>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-white/40 text-xs">
                  <ImageIcon className="w-4 h-4" />
                  <span>Images</span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-1 text-white/40 text-xs">
                  <Video className="w-4 h-4" />
                  <span>Videos</span>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 text-white/30 text-xs">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{isLoggedIn ? 'Up to 10 min' : 'Up to 30 sec'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  <span>{isLoggedIn ? 'Max 1 GB' : 'Max 10 MB'}</span>
                </div>
              </div>

              <p className="text-white/30 text-xs mt-2">
                {isLoggedIn ? (
                  <>Stories expire after 24 hours<br />Pay OGUN to make permanent • Shareable everywhere</>
                ) : (
                  <>Public stories: 30 sec max, 24hr expiry<br />Login for up to 10 min • Pay OGUN to make permanent</>
                )}
              </p>

              {/* Compression progress */}
              {isCompressing && compressionProgress && (
                <div className="mt-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                    <span className="text-cyan-400 text-sm">{compressionProgress.message}</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${compressionProgress.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error display */}
              {uploadError && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {uploadError}
                </div>
              )}
            </div>
          ) : (
            /* Preview area */
            <div className="relative aspect-[9/16] max-h-[60vh] rounded-xl overflow-hidden bg-black">
              {/* Media preview */}
              {mediaType === 'image' ? (
                <img
                  src={mediaPreview}
                  alt="Story preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={mediaPreview}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />

              {/* Caption overlay */}
              {showCaptionInput && (
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2">
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="w-full bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg p-3 text-white text-center placeholder-white/50 resize-none focus:outline-none focus:border-cyan-500/50"
                    rows={3}
                    maxLength={200}
                  />
                </div>
              )}

              {/* Caption display */}
              {caption && !showCaptionInput && (
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center">
                  <p className="text-white text-lg font-medium drop-shadow-lg">{caption}</p>
                </div>
              )}

              {/* Tools sidebar */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button
                  onClick={() => setShowCaptionInput(!showCaptionInput)}
                  className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors ${
                    showCaptionInput || caption ? 'bg-cyan-500 text-white' : 'bg-black/50 text-white/70 hover:text-white'
                  }`}
                  title="Add caption"
                >
                  <Type className="w-5 h-5" />
                </button>
                <button
                  className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors"
                  title="Add sticker"
                >
                  <Sticker className="w-5 h-5" />
                </button>
                <button
                  className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors"
                  title="Add music"
                >
                  <Music className="w-5 h-5" />
                </button>
              </div>

              {/* Clear button */}
              <button
                onClick={handleClear}
                className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-red-400 transition-colors"
                title="Clear"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              {/* User info - bottom left */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 p-[2px]">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                    {me?.profile?.profilePicture ? (
                      <img src={me.profile.profilePicture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-white">
                        {me?.profile?.displayName?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-white text-sm font-medium drop-shadow-lg">
                  {me?.profile?.displayName || me?.profile?.userHandle}
                </span>
              </div>

              {/* Duration selector for images */}
              {mediaType === 'image' && (
                <div className="absolute bottom-16 left-4 right-4">
                  <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="text-white/70 text-xs mr-2">Display:</span>
                    {durationOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedDuration(option.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedDuration === option.value
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                            : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Compression success badge */}
              {wasCompressed && originalSize > 0 && (
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 backdrop-blur-sm border border-green-500/30 text-xs text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  <span>Optimized ({Math.round((1 - (mediaFile?.size || 0) / originalSize) * 100)}% smaller)</span>
                </div>
              )}

              {/* File info badge - bottom right */}
              {mediaFile && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs text-white/70">
                  {mediaType === 'video' && videoDuration > 0 && (
                    <>
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(videoDuration)}</span>
                      <span className="text-white/30">•</span>
                    </>
                  )}
                  {mediaType === 'image' && (
                    <>
                      <Clock className="w-3 h-3" />
                      <span>{durationOptions.find(d => d.value === selectedDuration)?.label || (isLoggedIn ? '1 min' : '15s')}</span>
                      <span className="text-white/30">•</span>
                    </>
                  )}
                  <HardDrive className="w-3 h-3" />
                  <span>{formatFileSize(mediaFile.size)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span>Stories expire in 24h</span>
          </div>

          <div className="flex items-center gap-2">
            {mediaPreview && (
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-full bg-white/10 text-white/70 text-sm font-medium hover:bg-white/20 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={handlePublish}
              disabled={!mediaPreview || isUploading || isCompressing}
              className={`px-6 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${
                mediaPreview && !isUploading && !isCompressing
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-400 hover:to-purple-400'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {isCompressing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Optimizing...
                </>
              ) : isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Share Story
                </>
              )}
            </button>
          </div>
        </div>

        {/* Decentralized badge */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black border border-cyan-500/30 text-[10px] text-cyan-400">
          Stored on IPFS • Decentralized
        </div>
      </div>
    </div>
  )
}
