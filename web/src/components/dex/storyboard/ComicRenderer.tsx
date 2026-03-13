import React, { useRef, useEffect, useState, useCallback } from 'react'
import { X, Download, Share2 } from 'lucide-react'
import { Button } from 'components/ui/button'
import { toast } from 'react-toastify'
import type { StoryboardFrame, ComicLayout } from './storyboardTypes'

interface ComicRendererProps {
  frames: StoryboardFrame[]
  onClose: () => void
  onShareToStory?: (imageDataUrl: string) => void
}

const LAYOUTS: { id: ComicLayout; label: string; cols: number; rows: number }[] = [
  { id: 'strip', label: 'Strip (1×N)', cols: 1, rows: 0 },
  { id: '2x2', label: '2×2 Grid', cols: 2, rows: 2 },
  { id: '2x3', label: '2×3 Grid', cols: 2, rows: 3 },
  { id: '3x2', label: '3×2 Grid', cols: 3, rows: 2 },
]

const BORDER = 3
const PADDING = 6

export function ComicRenderer({ frames, onClose, onShareToStory }: ComicRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [layout, setLayout] = useState<ComicLayout>('2x2')
  const [bgColor, setBgColor] = useState<'white' | 'black'>('white')
  const [rendering, setRendering] = useState(false)

  const renderComic = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || frames.length === 0) return

    setRendering(true)
    const ctx = canvas.getContext('2d')!

    const layoutConfig = LAYOUTS.find((l) => l.id === layout)!
    const cols = layoutConfig.id === 'strip' ? frames.length : layoutConfig.cols
    const rows = layoutConfig.id === 'strip' ? 1 : layoutConfig.rows

    // Load all images first
    const images: HTMLImageElement[] = []
    for (const frame of frames.slice(0, cols * rows)) {
      if (!frame.result?.image) continue
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.onerror = () => resolve()
        img.src = frame.result!.image
      })
      images.push(img)
    }

    if (images.length === 0) {
      setRendering(false)
      return
    }

    // Calculate cell size from first image
    const cellW = images[0].width
    const cellH = images[0].height

    const totalW = cols * cellW + (cols + 1) * BORDER + 2 * PADDING
    const totalH = rows * cellH + (rows + 1) * BORDER + 2 * PADDING

    canvas.width = totalW
    canvas.height = totalH

    // Background
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, totalW, totalH)

    // Draw panels
    let idx = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (idx >= images.length) break
        const x = PADDING + c * (cellW + BORDER) + BORDER
        const y = PADDING + r * (cellH + BORDER) + BORDER

        // Panel border
        ctx.strokeStyle = bgColor === 'white' ? '#000' : '#555'
        ctx.lineWidth = BORDER
        ctx.strokeRect(x - BORDER / 2, y - BORDER / 2, cellW + BORDER, cellH + BORDER)

        // Image
        ctx.drawImage(images[idx], x, y, cellW, cellH)

        // Caption/speech bubble
        const frame = frames[idx]
        if (frame?.caption) {
          const bubbleW = Math.min(cellW * 0.8, 300)
          const bubbleH = 40
          const bx = x + (cellW - bubbleW) / 2
          const by = y + cellH - bubbleH - 10

          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
          ctx.beginPath()
          ctx.roundRect(bx, by, bubbleW, bubbleH, 12)
          ctx.fill()
          ctx.strokeStyle = '#000'
          ctx.lineWidth = 2
          ctx.stroke()

          // Tail
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
          ctx.beginPath()
          ctx.moveTo(bx + bubbleW * 0.3, by + bubbleH)
          ctx.lineTo(bx + bubbleW * 0.3 - 8, by + bubbleH + 12)
          ctx.lineTo(bx + bubbleW * 0.3 + 8, by + bubbleH)
          ctx.closePath()
          ctx.fill()
          ctx.strokeStyle = '#000'
          ctx.lineWidth = 2
          ctx.stroke()

          // Text
          ctx.fillStyle = '#000'
          ctx.font = 'bold 14px "Comic Sans MS", "Comic Neue", cursive, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(frame.caption, bx + bubbleW / 2, by + bubbleH / 2, bubbleW - 20)
        }

        idx++
      }
    }

    setRendering(false)
  }, [frames, layout, bgColor])

  useEffect(() => {
    renderComic()
  }, [renderComic])

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `soundchain-comic-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('Comic saved!')
    }, 'image/png')
  }, [])

  const handleShare = useCallback(() => {
    if (!onShareToStory) return
    const canvas = canvasRef.current
    if (!canvas) return
    onShareToStory(canvas.toDataURL('image/png'))
  }, [onShareToStory])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-semibold text-sm">Comic Export</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLayout(l.id)}
                className={`px-3 py-1 rounded text-xs border transition-all ${
                  layout === l.id
                    ? 'bg-violet-500/30 text-violet-300 border-violet-400/50'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                }`}
              >
                {l.label}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => setBgColor(bgColor === 'white' ? 'black' : 'white')}
              className="px-3 py-1 rounded text-xs border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 transition-all"
            >
              BG: {bgColor}
            </button>
          </div>

          {/* Canvas preview */}
          <div className="flex justify-center overflow-auto rounded-lg bg-neutral-800 p-2">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto"
              style={{ imageRendering: 'auto' }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              disabled={rendering}
              className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PNG
            </Button>
            {onShareToStory && (
              <Button
                variant="outline"
                onClick={handleShare}
                disabled={rendering}
                className="border-white/10 text-white hover:bg-white/10"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share to Story
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
