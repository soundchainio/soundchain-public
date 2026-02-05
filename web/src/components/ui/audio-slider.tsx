import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'

interface AudioSliderProps {
  min?: number
  max?: number
  value?: number
  onChange?: (value: number) => void
  onCommit?: (value: number) => void
  className?: string
  step?: number
}

// Wrapper for @radix-ui/react-slider with @reach/slider compatible API
// Uses onValueCommit for actual seeking (on release) to prevent audio stuttering during drag
export const AudioSlider = React.forwardRef<HTMLDivElement, AudioSliderProps>(
  ({ className, min = 0, max = 100, value = 0, onChange, onCommit, step = 1, ...props }, ref) => {
    // Track if user is currently interacting (dragging or just committed)
    const [isInteracting, setIsInteracting] = React.useState(false)
    // Local value during interaction - persists after commit until audio catches up
    const [localValue, setLocalValue] = React.useState<number | null>(null)

    // Show local value during/after interaction, otherwise show prop value
    // Only switch back to prop value when it's close enough to our local value (audio caught up)
    const displayValue = React.useMemo(() => {
      if (localValue !== null) {
        // If prop value is within 1 second of local value, audio has caught up - clear local
        if (Math.abs(value - localValue) <= 1) {
          return value
        }
        return localValue
      }
      return value
    }, [localValue, value])

    // Clear local value when prop catches up
    React.useEffect(() => {
      if (localValue !== null && Math.abs(value - localValue) <= 1) {
        setLocalValue(null)
      }
    }, [value, localValue])

    // Called continuously during drag - only updates visual preview
    const handleValueChange = (newValue: number[]) => {
      if (newValue[0] !== undefined) {
        setLocalValue(newValue[0])
        // If no onCommit provided, fall back to onChange during drag (legacy behavior)
        if (!onCommit && onChange) {
          onChange(newValue[0])
        }
      }
    }

    // Called only when user releases the thumb - this is when we actually seek
    const handleValueCommit = (newValue: number[]) => {
      setIsInteracting(false)
      if (newValue[0] !== undefined) {
        // Keep local value visible until audio catches up
        setLocalValue(newValue[0])
        if (onCommit) {
          onCommit(newValue[0])
        } else if (onChange) {
          onChange(newValue[0])
        }
      }
    }

    // Detect interaction start
    const handlePointerDown = () => {
      setIsInteracting(true)
      setLocalValue(value)
    }

    return (
      <SliderPrimitive.Root
        ref={ref}
        min={min}
        max={max}
        step={step}
        value={[displayValue]}
        onValueChange={handleValueChange}
        onValueCommit={handleValueCommit}
        onPointerDown={handlePointerDown}
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
