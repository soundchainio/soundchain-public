import { useEffect, useRef, useState } from 'react'
import ReactPlayer from 'react-player'
import { IdentifySource, getNormalizedLink, canPlayWithReactPlayer } from 'utils/NormalizeEmbedLinks'
import { MediaProvider } from 'types/MediaProvider'

/**
 * MultiEmbedCarousel — IG-style swipeable deck of EMBEDS (music + video links).
 *
 * Renders only when a post carries 2+ embed links (post.mediaLinks). A single
 * embed still goes through Post.tsx's existing (autoplay-sensitive) path — this
 * component is intentionally separate so it never touches that logic. Each slide
 * renders its provider: ReactPlayer for the players it supports (YouTube, Vimeo,
 * Twitch, SoundCloud, Facebook), a normalized iframe for the rest (Spotify,
 * Bandcamp, TikTok, Instagram, X). Pure CSS scroll-snap, no deps.
 */
export function MultiEmbedCarousel({ links, className = '' }: { links: string[]; className?: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const count = links.length

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
    <div className={`relative group/embeds rounded-xl overflow-hidden ${className}`}>
      {/* counter */}
      <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-semibold tabular-nums backdrop-blur-sm pointer-events-none">
        {index + 1}/{count}
      </div>

      {/* scroll-snap track — only the active slide loads its player */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {links.map((url, i) => (
          <div key={`${i}-${url}`} className="snap-center shrink-0 w-full">
            <EmbedSlide url={url} active={Math.abs(i - index) <= 1} />
          </div>
        ))}
      </div>

      {/* desktop arrows */}
      {index > 0 && (
        <button
          type="button"
          aria-label="Previous embed"
          onClick={() => goTo(index - 1)}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 group-hover/embeds:opacity-100 transition hover:bg-black/75"
        >
          ‹
        </button>
      )}
      {index < count - 1 && (
        <button
          type="button"
          aria-label="Next embed"
          onClick={() => goTo(index + 1)}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 group-hover/embeds:opacity-100 transition hover:bg-black/75"
        >
          ›
        </button>
      )}

      {/* dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
        {links.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to embed ${i + 1}`}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all ${i === index ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  )
}

// Audio providers render shorter than video — keep the carousel height sane.
function isAudio(source: MediaProvider | undefined) {
  return source === MediaProvider.SPOTIFY || source === MediaProvider.SOUNDCLOUD || source === MediaProvider.BANDCAMP
}

function EmbedSlide({ url, active }: { url: string; active: boolean }) {
  const source = IdentifySource(url).type
  const playable = canPlayWithReactPlayer(url)
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (playable) return
    let alive = true
    getNormalizedLink(url)
      .then((u) => {
        if (alive) setEmbedUrl(u || url)
      })
      .catch(() => {
        if (alive) setEmbedUrl(url)
      })
    return () => {
      alive = false
    }
  }, [url, playable])

  // Don't mount offscreen players (keeps a 5-embed deck cheap); show the slot.
  if (!active) {
    return <div className={`w-full bg-neutral-900 ${isAudio(source) ? 'h-[160px]' : 'aspect-video'}`} />
  }

  if (playable) {
    return (
      <div className="relative w-full aspect-video bg-black">
        <ReactPlayer
          url={url}
          width="100%"
          height="100%"
          controls
          // never autoplay carousel embeds — the user is swiping, not consuming a feed
          playing={false}
          config={{ youtube: { playerVars: { playsinline: 1 } } } as any}
        />
      </div>
    )
  }

  if (!embedUrl) {
    return <div className={`w-full bg-neutral-900 animate-pulse ${isAudio(source) ? 'h-[160px]' : 'aspect-video'}`} />
  }

  return (
    <iframe
      src={embedUrl}
      title={`Embed ${source || ''}`}
      className={`w-full block ${isAudio(source) ? 'h-[160px]' : 'aspect-video'}`}
      loading="lazy"
      allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
      allowFullScreen
      frameBorder={0}
    />
  )
}
