import { useMintPlayer } from 'contexts/MintPlayerProvider'

/**
 * FooterPlayer — persistent now-playing bar pinned to the bottom of the mint
 * app, mirroring soundchain.io's footer player. Driven entirely by the global
 * MintPlayerProvider so it survives navigation. Hidden until something plays.
 */
function fmt(t: number): string {
  if (!isFinite(t) || t < 0) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function FooterPlayer() {
  const { current, isPlaying, currentTime, duration, toggle, seekToFraction, close } = useMintPlayer()
  if (!current) return null

  const frac = duration ? currentTime / duration : 0

  return (
    <div className="fixed bottom-0 inset-x-0 z-[150] border-t border-neon-cyan/25 bg-ink-900/95 backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
      {/* scrub bar */}
      <div
        className="group/scrub h-1.5 w-full bg-white/5 cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          seekToFraction((e.clientX - rect.left) / rect.width)
        }}
      >
        <div className="h-full bg-neon-cyan relative" style={{ width: `${Math.max(0, Math.min(100, frac * 100))}%` }}>
          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 rounded-full bg-neon-cyan opacity-0 group-hover/scrub:opacity-100 shadow-neon-cyan" />
        </div>
      </div>

      <div className="flex items-center gap-3 px-3 sm:px-5 py-2">
        {/* cover */}
        <div className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 overflow-hidden bg-ink-700 border border-white/10">
          {current.coverArtUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.coverArtUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[8px] font-mono text-gray-600">SC</div>
          )}
        </div>

        {/* title / artist */}
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-bold text-white truncate">{current.title || 'Untitled'}</div>
          {current.artist && <div className="text-[10px] sm:text-xs font-mono text-neon-magenta truncate">{current.artist}</div>}
        </div>

        {/* time */}
        <div className="hidden sm:block text-[10px] font-mono text-gray-500 tabular-nums flex-shrink-0">
          {fmt(currentTime)} / {fmt(duration)}
        </div>

        {/* play / pause */}
        <button
          type="button"
          onClick={() => toggle(current)}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className={`w-9 h-9 flex-shrink-0 flex items-center justify-center text-sm font-bold border transition-all ${
            isPlaying
              ? 'bg-neon-cyan text-black border-neon-cyan shadow-neon-cyan'
              : 'bg-ink-900/85 text-neon-cyan border-neon-cyan/60 hover:bg-neon-cyan hover:text-black'
          }`}
          style={{ clipPath: 'polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)' }}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>

        {/* close */}
        <button
          type="button"
          onClick={close}
          aria-label="Close player"
          className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-xs text-gray-500 hover:text-neon-magenta border border-white/10 hover:border-neon-magenta/40 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
