import React, { PropsWithChildren } from 'react'
import Link from 'next/link'

interface LinkAnchorProps extends PropsWithChildren<Record<string, unknown>> {
  href?: string
}

export const LinkAnchor: React.FC<Record<string, unknown>> = ({ href, children, ...props }: LinkAnchorProps) => (
  <Link href={href as string}>
    <a {...props}>{children}</a>
  </Link>
)
