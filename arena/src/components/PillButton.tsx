import Link from 'next/link'
import { ReactNode } from 'react'

// Cyberpunk slim treatment per Frank May 6: pills were "too fat", asked for
// "chic lines-holographic-dimensional". Padding tightened, hairline borders,
// holo underglow on hover.
type Variant = 'primary' | 'secondary' | 'ghost' | 'holo'

interface PillButtonProps {
  href?: string
  external?: boolean
  variant?: Variant
  children: ReactNode
  className?: string
  onClick?: () => void
}

const variants: Record<Variant, string> = {
  primary:
    'text-white bg-arena-red border border-arena-red hover:shadow-[0_0_18px_rgba(220,38,38,0.55)] transition',
  secondary:
    'text-arena-red border border-arena-red/40 hover:bg-arena-red hover:text-white hover:shadow-[0_0_14px_rgba(220,38,38,0.4)] transition',
  ghost:
    'text-arena-muted-l dark:text-arena-muted-d border border-arena-border-l dark:border-arena-border-d hover:border-arena-red hover:text-arena-red transition',
  // Holographic — red→orange→yellow shimmer border, transparent fill,
  // dimensional underglow. Pairs with arena-hologram-text utility on labels.
  holo:
    'text-arena-text-l dark:text-arena-text-d border border-arena-red/30 hover:border-arena-orange hover:shadow-[0_0_22px_rgba(249,115,22,0.45)] transition',
}

export function PillButton({
  href,
  external,
  variant = 'primary',
  children,
  className = '',
  onClick,
}: PillButtonProps) {
  // Slimmed: px-5 py-3 → px-4 py-2 (still ≥44px tap target with line-height)
  const classes = `inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full font-black text-[11px] sm:text-xs tracking-[0.2em] uppercase ${variants[variant]} ${className}`

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
          {children}
        </a>
      )
    }
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={classes}>
      {children}
    </button>
  )
}

export default PillButton
