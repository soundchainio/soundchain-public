import * as React from 'react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void
}

export const Select = ({ children, onValueChange, ...props }: SelectProps) => (
  <div className="relative">{children}</div>
)

export const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      className={`flex w-full items-center justify-between rounded border border-white/20 bg-black/40 px-3 py-2 text-sm text-white ${className}`}
      {...props}
    >
      {children}
    </button>
  )
)
SelectTrigger.displayName = 'SelectTrigger'

export const SelectValue = ({ placeholder }: { placeholder?: string }) => (
  <span className="text-gray-400">{placeholder}</span>
)

export const SelectContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`absolute z-50 mt-1 w-full rounded border border-white/20 bg-black/90 backdrop-blur-sm ${className}`}>
    {children}
  </div>
)

export const SelectItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`cursor-pointer px-3 py-2 text-sm text-white hover:bg-white/10 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
)
SelectItem.displayName = 'SelectItem'
