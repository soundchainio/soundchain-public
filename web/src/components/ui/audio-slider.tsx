import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'

interface AudioSliderProps {
  min?: number
  max?: number
  value?: number
  onChange?: (value: number) => void
  className?: string
  step?: number
}

// Wrapper for @radix-ui/react-slider with @reach/slider compatible API
export const AudioSlider = React.forwardRef<HTMLDivElement, AudioSliderProps>(
  ({ className, min = 0, max = 100, value = 0, onChange, step = 1, ...props }, ref) => {
    const handleValueChange = (newValue: number[]) => {
      if (onChange && newValue[0] !== undefined) {
        onChange(newValue[0])
      }
    }

    return (
      <SliderPrimitive.Root
        ref={ref}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={handleValueChange}
        className={`relative flex w-full select-none items-center cursor-pointer ${className || ''}`}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-700 cursor-pointer">
          <SliderPrimitive.Range className="absolute h-full bg-cyan-400" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-cyan-400 bg-white shadow-lg ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-cyan-50 cursor-grab active:cursor-grabbing" />
      </SliderPrimitive.Root>
    )
  }
)

AudioSlider.displayName = 'AudioSlider'

// Also export a basic Slider for shadcn compatibility
export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={`relative flex w-full select-none items-center cursor-pointer ${className || ''}`}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-700 cursor-pointer">
      <SliderPrimitive.Range className="absolute h-full bg-cyan-400" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-cyan-400 bg-white shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName
