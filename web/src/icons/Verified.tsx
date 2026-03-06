import { IconProps } from './types/IconProps'

export const Verified = ({ ...props }: IconProps) => {
  return (
    <svg width={14} height={14} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M7 0a7 7 0 100 14A7 7 0 007 0zM6 9.795l-2.5-2.5.795-.795L6 8.205 9.705 4.5l.798.793L6 9.795z"
        fill="#6FA1FF"
      />
      <defs>
        <linearGradient
          id="prefix__paint0_linear_3799:11679"
          x1={0.226}
          y1={8.986}
          x2={12.503}
          y2={6.016}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3B5BB1" />
          <stop offset={1} stopColor="#6FA1FF" />
        </linearGradient>
      </defs>
    </svg>
  )
}
