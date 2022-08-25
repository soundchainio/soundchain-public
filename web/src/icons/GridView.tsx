import { SVGGradient } from './gradients'
import { IconProps } from './types/IconProps'

export const GridView = ({ color, ...props }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="3"
        fill={color ? `url(#${color}-gradient)` : '#505050'}
        stroke={color ? `url(#paint0_linear_5122_16533)` : '#505050'}
        strokeWidth="2"
      />
      {color && (
        <>
          <rect x="7" y="7" width="4" height="4" rx="1" fill="white" />
          <rect x="13" y="7" width="4" height="4" rx="1" fill="white" />
          <rect x="7" y="13" width="4" height="4" rx="1" fill="white" />
          <rect x="13" y="13" width="4" height="4" rx="1" fill="white" />
        </>
      )}
      {!color && (
        <>
          <rect x="7" y="7" width="4" height="4" rx="1" fill="gray" />
          <rect x="13" y="7" width="4" height="4" rx="1" fill="gray" />
          <rect x="7" y="13" width="4" height="4" rx="1" fill="gray" />
          <rect x="13" y="13" width="4" height="4" rx="1" fill="gray" />
        </>
      )}

      {color && <SVGGradient color={color} />}
    </svg>
  )
}
