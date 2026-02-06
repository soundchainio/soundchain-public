import { useState, useCallback } from 'react'
import Cropper, { Area, Point } from 'react-easy-crop'
import { X, Check, Square, Smartphone, Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { cropImage, captureVideoFrame, CropArea } from 'lib/mediaCrop'

interface MediaCropEditorProps {
  file: File
  mediaType: 'image' | 'video'
  onApply: (croppedFile: File) => void
  onCancel: () => void
}

type AspectRatioPreset = '1:1' | '9:16' | '4:5' | 'free'

const ASPECT_RATIOS: Record<AspectRatioPreset, number | undefined> = {
  '1:1': 1,
  '9:16': 9 / 16,
  '4:5': 4 / 5,
  'free': undefined,
}

export const MediaCropEditor = ({ file, mediaType, onApply, onCancel }: MediaCropEditorProps) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [aspectRatio, setAspectRatio] = useState<AspectRatioPreset>('1:1')
  const [isApplying, setIsApplying] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string>('')
  const [videoFrameLoading, setVideoFrameLoading] = useState(false)

  // Create object URL for image, or capture frame for video
  useState(() => {
    if (mediaType === 'image') {
      setMediaUrl(URL.createObjectURL(file))
    } else {
      // For video, capture a frame for the crop preview
      setVideoFrameLoading(true)
      captureVideoFrame(file)
        .then(({ imageUrl }) => {
          setMediaUrl(imageUrl)
          setVideoFrameLoading(false)
        })
        .catch((err) => {
          console.error('Failed to capture video frame:', err)
          // Fallback to object URL (will show black but cropper will work)
          setMediaUrl(URL.createObjectURL(file))
          setVideoFrameLoading(false)
        })
    }
  })

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleApply = async () => {
    if (!croppedAreaPixels) return

    setIsApplying(true)
    try {
      const cropArea: CropArea = {
        x: Math.round(croppedAreaPixels.x),
        y: Math.round(croppedAreaPixels.y),
        width: Math.round(croppedAreaPixels.width),
        height: Math.round(croppedAreaPixels.height),
      }

      // For images, crop directly. For videos, we crop the preview frame
      // (full video cropping would need FFmpeg which isn't available in browser)
      const croppedFile = await cropImage(
        mediaType === 'image' ? file : await fetch(mediaUrl).then(r => r.blob()).then(b => new File([b], 'frame.jpg', { type: 'image/jpeg' })),
        cropArea
      )

      onApply(croppedFile)
    } catch (err) {
      console.error('Failed to crop:', err)
    } finally {
      setIsApplying(false)
    }
  }

  const handleReset = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-800">
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-white/80 hover:text-white hover:bg-neutral-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="text-white font-semibold">Crop {mediaType === 'video' ? 'Thumbnail' : 'Image'}</span>
        <button
          onClick={handleApply}
          disabled={isApplying || !croppedAreaPixels}
          className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white disabled:opacity-50 hover:bg-cyan-400 transition-colors"
        >
          {isApplying ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Crop Area */}
      <div className="flex-1 relative bg-black">
        {videoFrameLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white/60 text-sm flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Loading video frame...
            </div>
          </div>
        ) : mediaUrl ? (
          <Cropper
            image={mediaUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={ASPECT_RATIOS[aspectRatio]}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            showGrid
            style={{
              containerStyle: {
                background: '#000',
              },
              cropAreaStyle: {
                border: '2px solid rgba(6, 182, 212, 0.8)',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
              },
            }}
          />
        ) : null}
      </div>

      {/* Controls */}
      <div className="bg-neutral-900/80 backdrop-blur-sm border-t border-neutral-800 px-4 py-4 space-y-4">
        {/* Aspect Ratio Presets */}
        <div className="flex items-center justify-center gap-2">
          {[
            { key: '1:1' as const, icon: Square, label: 'Square' },
            { key: '9:16' as const, icon: Smartphone, label: 'Story' },
            { key: '4:5' as const, icon: Smartphone, label: 'Portrait' },
            { key: 'free' as const, icon: Maximize2, label: 'Free' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setAspectRatio(key)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                aspectRatio === key
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-neutral-800 text-neutral-400 border border-transparent hover:bg-neutral-700 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </div>

        {/* Zoom Slider */}
        <div className="flex items-center gap-3">
          <ZoomOut className="w-4 h-4 text-neutral-500" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500"
          />
          <ZoomIn className="w-4 h-4 text-neutral-500" />
        </div>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-sm">Reset</span>
        </button>

        {/* Video note */}
        {mediaType === 'video' && (
          <p className="text-neutral-500 text-xs text-center">
            Note: Cropping applies to the thumbnail preview. Video itself is not modified.
          </p>
        )}
      </div>
    </div>
  )
}
