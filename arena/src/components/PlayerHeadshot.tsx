import { useState } from 'react'

interface PlayerHeadshotProps {
  src?: string
  name: string
  size?: number                 // px, square. Default 44.
  ringColor?: string            // hex w/o # OR w/ # — team accent
  className?: string
}

/** ESPN headshot with initials-bubble fallback when CDN 404s. */
export function PlayerHeadshot({
  src,
  name,
  size = 44,
  ringColor,
  className = '',
}: PlayerHeadshotProps) {
  const [failed, setFailed] = useState(false)
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')

  const ringStyle = ringColor
    ? { boxShadow: `inset 0 0 0 2px ${ringColor.startsWith('#') ? ringColor : `#${ringColor}`}` }
    : undefined

  const dim = { width: size, height: size }

  if (!src || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-arena-paper dark:bg-arena-carbon font-black text-arena-muted-l dark:text-arena-muted-d flex-shrink-0 ${className}`}
        style={{ ...dim, ...ringStyle, fontSize: Math.round(size * 0.36) }}
        title={name}
        aria-label={name}
      >
        {initials || '?'}
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      title={name}
      width={size}
      height={size}
      style={{ ...dim, ...ringStyle, objectFit: 'cover', borderRadius: '9999px', background: '#0a0a0a' }}
      className={`flex-shrink-0 ${className}`}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  )
}

export default PlayerHeadshot
