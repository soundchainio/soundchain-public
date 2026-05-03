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
    'text-white bg-arena-red hover:bg-arena-red-soft shadow-md hover:shadow-lg hover:shadow-arena-red/30 transition',
  secondary:
    'text-arena-red border border-arena-red/40 hover:bg-arena-red hover:text-white transition',
  ghost:
    'text-arena-muted-l dark:text-arena-muted-d border border-arena-border-l dark:border-arena-border-d hover:border-arena-red hover:text-arena-red transition',
}

export function PillButton({
  href,
  external,
  variant = 'primary',
  children,
  className = '',
  onClick,
}: PillButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-bold text-sm ${variants[variant]} ${className}`

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
