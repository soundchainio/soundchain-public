import { useEffect } from 'react'
import { X } from 'lucide-react'
import { buildEmbedUrl } from '@/lib/youtube'

interface HighlightModalProps {
  videoId: string
  title: string
  onClose: () => void
}

export function HighlightModal({ videoId, title, onClose }: HighlightModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-arena-card dark:bg-arena-surface text-arena-fg-l dark:text-arena-fg-d flex items-center justify-center hover:bg-arena-red hover:text-white transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
      <div
        className="w-full max-w-5xl aspect-video rounded-xl overflow-hidden border border-arena-border-l dark:border-arena-border-d shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={buildEmbedUrl(videoId, { autoplay: true })}
          title={title}
          width="100%"
          height="100%"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
      <div className="absolute bottom-6 left-0 right-0 text-center px-4 pointer-events-none">
        <p className="text-white text-sm font-bold line-clamp-2 max-w-3xl mx-auto drop-shadow-lg">{title}</p>
      </div>
    </div>
  )
}
