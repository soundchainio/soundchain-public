import * as React from "react"

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}

interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50"

  const variants = {
    default: "bg-gradient-to-r from-orange-500 via-yellow-500 to-cyan-500 text-black hover:opacity-90",
    outline: "border border-cyan-500/50 bg-transparent text-cyan-400 hover:bg-cyan-500/10",
    ghost: "hover:bg-gray-800 text-gray-300",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  }

  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-10 px-6",
    icon: "h-9 w-9",
  }

  return (
    <button
      data-slot="button"
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}

export { Button }
