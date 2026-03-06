import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'md', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none disabled:opacity-50'
    const variantClasses = {
      default: 'bg-cyan-500 text-white hover:bg-cyan-600',
      outline: 'border border-white/20 bg-transparent text-white hover:bg-white/10',
      ghost: 'bg-transparent text-white hover:bg-white/10',
    }
    const sizeClasses = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    }
    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
