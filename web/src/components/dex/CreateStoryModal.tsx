import { useState, useRef, useCallback } from 'react'
import { X, Camera, Image as ImageIcon, Video, Sparkles, Upload, Type, Sticker, Music, Trash2 } from 'lucide-react'
import { useMe } from 'hooks/useMe'

interface CreateStoryModalProps {
  isOpen: boolean
  onClose: () => void
  onPublish?: (mediaUrl: string, mediaType: 'image' | 'video') => void
}

export const CreateStoryModal = ({ isOpen, onClose, onPublish }: CreateStoryModalProps) => {
  const { me } = useMe()
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const [showCaptionInput, setShowCaptionInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      alert('Please select an image or video file')
      return
    }

    // Validate file size (50MB max for video, 10MB for image)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert(`File too large. Max size: ${isVideo ? '50MB' : '10MB'}`)
      return
    }

    setMediaFile(file)
    setMediaType(isImage ? 'image' : 'video')
    setMediaPreview(URL.createObjectURL(file))
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
                  <span>Videos (15s)</span>
                </div>
              </div>

              <p className="text-white/30 text-xs mt-4">
                Stories disappear after 24 hours<br />
                Pay OGUN to make permanent
              </p>
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
              disabled={!mediaPreview || isUploading}
              className={`px-6 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${
                mediaPreview && !isUploading
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-400 hover:to-purple-400'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
