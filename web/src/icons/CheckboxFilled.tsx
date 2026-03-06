import React from 'react'
import { SVGGradient } from './gradients'
import { IconProps } from './types/IconProps'

export const CheckboxFilled = ({ color, id = '', ...props }: IconProps) => {
  return (
    <svg width={20} height={20} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect
        x={1}
        y={1}
        width={18}
        height={18}
        rx={3}
        fill={color ? `url(#${id}${color}-gradient)` : 'transparent'}
        stroke="#0EDA65"
        strokeWidth={2}
      />
      <path
        d="m8.398 13.305-3.261-3.242A.476.476 0 0 1 5 9.71c0-.143.046-.26.137-.352l.722-.703a.425.425 0 0 1 .332-.156c.144 0 .267.052.372.156l2.187 2.188 4.688-4.688A.486.486 0 0 1 13.788 6c.143 0 .26.052.352.156l.722.703a.476.476 0 0 1 .137.352c0 .143-.046.26-.137.351l-5.761 5.743a.446.446 0 0 1-.352.156.446.446 0 0 1-.352-.156Z"
        fill={color ? `url(#${id}${color}-gradient)` : '#0EDA65'}
      />

      {color && <SVGGradient id={id} color={color} />}
    </svg>
  )
}
