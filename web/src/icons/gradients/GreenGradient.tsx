import { IconProps } from 'icons/types/IconProps'

export const GreenGradient = ({ id }: IconProps) => {
  return (
    <defs>
      <linearGradient
        id={`${id}green-gradient`}
        x1="0.226"
        x2="12.503"
        y1="8.986"
        y2="6.016"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#278E31"></stop>
        <stop offset="1" stopColor="#52B33B"></stop>
      </linearGradient>
    </defs>
  )
}
