import React from 'react'

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function ScrollArea({ className = '', children, ...props }: ScrollAreaProps) {
  return (
    <div
      className={`relative overflow-auto ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
