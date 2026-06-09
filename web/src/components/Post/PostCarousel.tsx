import { useRef, useState } from 'react'

/**
 * PostCarousel — IG-style swipeable multi-image gallery for posts.
 *
 * Pure CSS scroll-snap (no deps): horizontal swipe on touch, arrow buttons on
 * desktop hover, a 1/N counter, and dot indicators. Used by Post + CompactPost
 * whenever a post carries more than one uploaded image.
 */
export function PostCarousel({ images, className = '' }: { images: string[]; className?: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const count = images.length

  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== index) setIndex(Math.max(0, Math.min(count - 1, i)))
  }

  const goTo = (i: number) => {
    const el = trackRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(count - 1, i))
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
    setIndex(clamped)
  }

  if (count === 0) return null

  return (
    <div className={`relative group/carousel select-none ${className}`}>
      {/* counter */}
      <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-semibold tabular-nums backdrop-blur-sm">
        {index + 1}/{count}
      </div>

      {/* scroll-snap track */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {images.map((src, i) => (
          <div key={i} className="snap-center shrink-0 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Image ${i + 1} of ${count}`}
              className="w-full h-auto block"
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
              onError={(e) => {
                const t = e.target as HTMLImageElement
                t.style.display = 'none'
              }}
            />
          </div>
        ))}
      </div>

      {/* desktop arrows */}
      {index > 0 && (
        <button
          type="button"
          aria-label="Previous image"
          onClick={() => goTo(index - 1)}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 group-hover/carousel:opacity-100 transition hover:bg-black/75"
        >
          ‹
        </button>
      )}
      {index < count - 1 && (
        <button
          type="button"
          aria-label="Next image"
          onClick={() => goTo(index + 1)}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 group-hover/carousel:opacity-100 transition hover:bg-black/75"
        >
          ›
        </button>
      )}

      {/* dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to image ${i + 1}`}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all ${i === index ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  )
}
