import NextLink from 'next/link'
import React from 'react'

export const steps = 7

type Props = {
  href: string
}

export const SkipButton = ({ href }: Props) => {
  return (
    <NextLink href={href}>
      <a className="rounded-full bg-gray-30 px-4 py-1 text-xs text-white">Skip</a>
    </NextLink>
  )
}
