import { SVGGradient } from './gradients'
import { IconProps } from './types/IconProps'

export const Menu = ({ color }: IconProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
      <path
        fill={color ? `url(#${color}-gradient)` : 'gray'}
        fillRule="evenodd"
        d="M1.6.8a1.6 1.6 0 000 3.2H8A1.6 1.6 0 008 .8H1.6zM0 8a1.6 1.6 0 011.6-1.6h12.8a1.6 1.6 0 110 3.2H1.6A1.6 1.6 0 010 8zm0 5.6A1.6 1.6 0 011.6 12H12a1.6 1.6 0 110 3.2H1.6A1.6 1.6 0 010 13.6z"
        clipRule="evenodd"
      ></path>
      {color && <SVGGradient color={color} />}
    </svg>
  )
}
