import React, { ReactNode } from 'react'
import classNames from 'classnames'
import { LinkAnchor } from '../LinkAnchor'

type Props = {
  containerClassName?: string
  className?: string
  children: ReactNode
} & Record<string, unknown>

function RainbowLink({ containerClassName, children, className, ...rest }: Props) {
  return (
    <div className={classNames(containerClassName, 'bg-rainbow-gradient p-0.5 hover:bg-rainbow-gradient-dark')}>
      <LinkAnchor
        className={classNames(
          'flex h-full w-full items-center justify-center bg-black bg-opacity-60 py-3 font-bold font-extrabold uppercase text-white sm:px-4',
          className,
        )}
        {...rest}
      >
        <span>{children}</span>
      </LinkAnchor>
    </div>
  )
}

export default RainbowLink
