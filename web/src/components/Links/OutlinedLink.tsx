import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { LinkAnchor } from '../LinkAnchor';

type Props = {
  children: ReactNode
  className?: string
  bgColor?: string
  borderColor?: string
} & Record<string, unknown>

function OutlinedLink({ bgColor, borderColor, className, children, ...rest }: Props) {
  return (
    <div className={classNames('p-0.5', borderColor)}>
      <LinkAnchor
        className={classNames(
          'flex items-center justify-center w-full h-full font-bold h-full bg-opacity-75 text-xs font-semibold text-white',
          className,
          bgColor ? bgColor : 'bg-gray-10',
        )}
        {...rest}
      >
        <span>{children}</span>
      </LinkAnchor>
    </div>
  );
}

export default OutlinedLink;