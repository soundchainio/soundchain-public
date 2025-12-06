import * as React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full rounded border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none ${className}`}
      {...props}
    />
  )
)
Input.displayName = 'Input'
