import React, { useRef, useState, useCallback, useEffect } from 'react'
import { X, Download, Share2, Play, Pause, AlertTriangle } from 'lucide-react'
import { Button } from 'components/ui/button'
import { toast } from 'react-toastify'
import type { StoryboardFrame } from './storyboardTypes'
import { FRAME_DURATION_MIN, FRAME_DURATION_MAX, FRAME_DURATION_DEFAULT } from './storyboardConstants'

interface VideoExporterProps {
  frames: StoryboardFrame[]
  onClose: () => void
  onShareToStory?: (imageDataUrl: string) => void
}

type TransitionType = 'cut' | 'crossfade'

export function VideoExporter({ frames, onClose, onShareToStory }: VideoExporterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [duration, setDuration] = useState(FRAME_DURATION_DEFAULT)
  const [transition, setTransition] = useState<TransitionType>('cut')
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [previewing, setPreviewing] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)

  const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const supportsMediaRecorder = typeof MediaRecorder !== 'undefined'

  // Load images
  const imagesRef = useRef<HTMLImageElement[]>([])
  useEffect(() => {
    const loadImages = async () => {
      const imgs: HTMLImageElement[] = []
      for (const frame of frames) {
        if (!frame.result?.image) continue
        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve()
          img.src = frame.result!.image
        })
        imgs.push(img)
      }
      imagesRef.current = imgs

      // Draw first frame on canvas
      if (imgs.length > 0 && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')!
        canvasRef.current.width = imgs[0].width
        canvasRef.current.height = imgs[0].height
        ctx.drawImage(imgs[0], 0, 0)
      }
    }
    loadImages()
  }, [frames])

  // Preview slideshow
  const togglePreview = useCallback(() => {
    if (previewing) {
      setPreviewing(false)
      if (previewTimerRef.current) clearInterval(previewTimerRef.current)
      return
    }

    setPreviewing(true)
    setPreviewIndex(0)

    previewTimerRef.current = setInterval(() => {
      setPreviewIndex((prev) => {
        const next = (prev + 1) % imagesRef.current.length
        const canvas = canvasRef.current
        if (canvas && imagesRef.current[next]) {
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(imagesRef.current[next], 0, 0, canvas.width, canvas.height)
        }
        return next
      })
    }, duration * 1000)
  }, [previewing, duration])

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current)
    }
  }, [])

  const handleExport = useCallback(async () => {
    const canvas = canvasRef.current
    const images = imagesRef.current
    if (!canvas || images.length === 0 || !supportsMediaRecorder) return

    setExporting(true)
    setExportProgress(0)

    const ctx = canvas.getContext('2d')!
    const fps = 30
    const fadeDuration = transition === 'crossfade' ? 0.5 : 0
    const frameMs = 1000 / fps

    // Try VP9, fallback to VP8
    let mimeType = 'video/webm;codecs=vp9'
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8'
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm'
    }

    const stream = canvas.captureStream(fps)
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 })
    const chunks: Blob[] = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    const exportPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: 'video/webm' }))
      }
    })

    recorder.start()

    // Render frames
    const totalFrames = images.length
    for (let i = 0; i < totalFrames; i++) {
      const currentImg = images[i]
      const nextImg = images[(i + 1) % totalFrames]
      const frameTotalMs = duration * 1000
      const fadeMs = fadeDuration * 1000

      // Draw current image for (duration - fade) time
      const holdMs = frameTotalMs - fadeMs
      const holdFrames = Math.round(holdMs / frameMs)
      for (let f = 0; f < holdFrames; f++) {
        ctx.drawImage(currentImg, 0, 0, canvas.width, canvas.height)
        await new Promise((r) => setTimeout(r, frameMs))
      }

      // Crossfade if enabled and not last frame
      if (fadeDuration > 0 && i < totalFrames - 1) {
        const fadeFrames = Math.round(fadeMs / frameMs)
        for (let f = 0; f < fadeFrames; f++) {
          const alpha = f / fadeFrames
          ctx.globalAlpha = 1
          ctx.drawImage(currentImg, 0, 0, canvas.width, canvas.height)
          ctx.globalAlpha = alpha
          ctx.drawImage(nextImg, 0, 0, canvas.width, canvas.height)
          ctx.globalAlpha = 1
          await new Promise((r) => setTimeout(r, frameMs))
        }
      }

      setExportProgress(Math.round(((i + 1) / totalFrames) * 100))
    }

    recorder.stop()
    const blob = await exportPromise

    // Download
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `soundchain-storyboard-${Date.now()}.webm`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setExporting(false)
    toast.success('Video exported!')
  }, [duration, transition, supportsMediaRecorder])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-semibold text-sm">Video Export</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Safari warning */}
          {(isSafari || !supportsMediaRecorder) && (
            <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-amber-400">
                {!supportsMediaRecorder
                  ? 'Your browser does not support video recording. Try Chrome or Firefox.'
                  : 'Safari has limited MediaRecorder support. Export may not work — try Chrome.'}
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Duration:</span>
              <input
                type="range"
                min={FRAME_DURATION_MIN}
                max={FRAME_DURATION_MAX}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-24 h-1 accent-violet-500"
              />
              <span className="text-xs text-violet-400 w-6">{duration}s</span>
            </div>

            <div className="flex gap-1.5">
              {(['cut', 'crossfade'] as TransitionType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTransition(t)}
                  className={`px-2 py-1 rounded text-xs border transition-all ${
                    transition === t
                      ? 'bg-violet-500/30 text-violet-300 border-violet-400/50'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {t === 'cut' ? 'Cut' : 'Crossfade'}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas preview */}
          <div className="relative flex justify-center overflow-auto rounded-lg bg-neutral-800 p-2">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto"
              style={{ imageRendering: 'auto' }}
            />
            {/* Preview overlay button */}
            <button
              onClick={togglePreview}
              className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-black/70 text-white hover:bg-violet-500/70 flex items-center justify-center transition-colors"
            >
              {previewing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            {previewing && (
              <span className="absolute top-4 left-4 text-[10px] bg-black/70 text-gray-300 px-2 py-0.5 rounded">
                {previewIndex + 1}/{imagesRef.current.length}
              </span>
            )}
          </div>

          {/* Export progress */}
          {exporting && (
            <div className="space-y-1">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 text-center">Exporting... {exportProgress}%</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              disabled={exporting || !supportsMediaRecorder}
              className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold"
            >
              <Download className="w-4 h-4 mr-2" />
              Export WebM
            </Button>
            {onShareToStory && (
              <Button
                variant="outline"
                onClick={() => {
                  if (canvasRef.current) {
                    onShareToStory(canvasRef.current.toDataURL('image/png'))
                  }
                }}
                className="border-white/10 text-white hover:bg-white/10"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Frame
              </Button>
            )}
          </div>

          <p className="text-[9px] text-gray-600 text-center">
            Total: ~{frames.length * duration}s ({frames.length} frames × {duration}s)
          </p>
        </div>
      </div>
    </div>
  )
}
