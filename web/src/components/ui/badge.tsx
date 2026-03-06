import * as React from "react"

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}

interface BadgeProps extends React.ComponentProps<"span"> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const baseStyles = "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap gap-1 transition-colors"

  const variants = {
    default: "border-transparent bg-cyan-500/20 text-cyan-400",
    secondary: "border-transparent bg-gray-700 text-gray-300",
    outline: "border-gray-600 text-gray-300",
    destructive: "border-transparent bg-red-500/20 text-red-400",
  }

  return (
    <span
      data-slot="badge"
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    />
  )
}

export { Badge }
