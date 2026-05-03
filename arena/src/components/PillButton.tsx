import Link from 'next/link'
import { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

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
    'text-white bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 shadow-[0_0_32px_rgba(168,85,247,0.35)] hover:shadow-[0_0_42px_rgba(168,85,247,0.5)]',
  secondary:
    'text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/10 hover:border-cyan-400 hover:shadow-[0_0_18px_rgba(34,211,238,0.35)]',
  ghost:
    'text-gray-300 border border-arena-border hover:bg-white/5 hover:text-white',
}

export function PillButton({
  href,
  external,
  variant = 'primary',
  children,
  className = '',
  onClick,
}: PillButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-bold text-sm transition ${variants[variant]} ${className}`

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
