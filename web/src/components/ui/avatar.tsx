import React from 'react'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Avatar({ className = '', children, ...props }: AvatarProps) {
  return (
    <div
      className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string
}

export function AvatarImage({ className = '', src, alt, ...props }: AvatarImageProps) {
  return (
    <img
      src={src}
      alt={alt || 'Avatar'}
      className={`aspect-square h-full w-full object-cover ${className}`}
      {...props}
    />
  )
}

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function AvatarFallback({ className = '', children, ...props }: AvatarFallbackProps) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full bg-gray-700 text-white ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
