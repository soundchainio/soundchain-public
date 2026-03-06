import { IconProps } from 'icons/types/IconProps'

export const PurpleGreenGradient = ({ id }: IconProps) => {
  return (
    <defs>
      <linearGradient
        id={`${id}purple-green-gradient`}
        x1="10.35"
        x2="9.964"
        y1="9.936"
        y2="5.032"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#3FDD8A"></stop>
        <stop offset="1" stopColor="#A252FE"></stop>
      </linearGradient>
    </defs>
  )
}
