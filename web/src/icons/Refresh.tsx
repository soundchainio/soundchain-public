import { SVGGradient } from './gradients'
import { IconProps } from './types/IconProps'

export const Refresh = ({ color }: IconProps) => {
  return (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20">
        <path
          fill={color ? `url(#${color}-gradient)` : 'gray'}
          d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8c2.2 0 4.24-.86 5.68-2.32l-1.44-1.44A5.998 5.998 0 017.98 14c-3.32 0-6-2.68-6-6s2.68-6 6-6c1.66 0 3.1.72 4.18 1.82L9.98 6h6V0L13.6 2.38C12.16.94 10.18 0 7.98 0H8z"
        ></path>
        {color && <SVGGradient color={color} />}
      </svg>
    </>
  )
}
