import * as React from 'react'

export interface SliderProps {
  className?: string
  value?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className = '', value = [0], onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => (
    <input
      type="range"
      ref={ref}
      className={`w-full accent-cyan-500 ${className}`}
      value={value[0]}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      {...props}
    />
  )
)
Slider.displayName = 'Slider'
