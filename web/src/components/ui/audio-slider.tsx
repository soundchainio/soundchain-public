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
    // Track if user is currently dragging
    const [isDragging, setIsDragging] = React.useState(false)
    // Local preview value during drag (doesn't seek audio)
    const [previewValue, setPreviewValue] = React.useState<number | null>(null)

    // During drag, show preview value; otherwise show actual value
    const displayValue = isDragging && previewValue !== null ? previewValue : value

    // Called continuously during drag - only updates visual preview
    const handleValueChange = (newValue: number[]) => {
      if (newValue[0] !== undefined) {
        setPreviewValue(newValue[0])
        // If no onCommit provided, fall back to onChange during drag (legacy behavior)
        if (!onCommit && onChange) {
          onChange(newValue[0])
        }
      }
    }

    // Called only when user releases the thumb - this is when we actually seek
    const handleValueCommit = (newValue: number[]) => {
      setIsDragging(false)
      setPreviewValue(null)
      if (newValue[0] !== undefined) {
        if (onCommit) {
          onCommit(newValue[0])
        } else if (onChange) {
          onChange(newValue[0])
        }
      }
    }

    // Detect drag start via pointer down on thumb or track
    const handlePointerDown = () => {
      setIsDragging(true)
      setPreviewValue(value)
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
