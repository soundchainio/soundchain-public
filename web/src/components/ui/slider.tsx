import React from 'react'

interface SliderProps {
  value: number[]
  max?: number
  step?: number
  onValueChange?: (value: number[]) => void
  className?: string
}

export function Slider({ value, max = 100, step = 1, onValueChange, className = '' }: SliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onValueChange) {
      onValueChange([parseFloat(e.target.value)])
    }
  }

  const percentage = ((value[0] || 0) / max) * 100

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value[0] || 0}
        onChange={handleChange}
        className="w-full h-2 appearance-none bg-gray-700 rounded-full cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:bg-cyan-400
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:bg-cyan-400
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:cursor-pointer
          [&::-moz-range-thumb]:border-0"
        style={{
          background: `linear-gradient(to right, #00d4aa ${percentage}%, #374151 ${percentage}%)`
        }}
      />
    </div>
  )
}
