import React from 'react'

import Link from 'next/link'

export const steps = 7

type Props = {
  href: string
}

export const SkipButton = ({ href }: Props) => {
  return (
    <Link href={href} className="rounded-full bg-gray-30 px-4 py-1 text-xs text-white">
      Skip
    </Link>
  )
}
