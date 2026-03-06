import { IconProps } from './types/IconProps'

interface RepeatProps extends IconProps {
  showOne?: boolean
}

export const Repeat = ({ showOne, ...props }: RepeatProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      {showOne && (
        <text
          x="12"
          y="14"
          fontSize="8"
          fontWeight="bold"
          fill="currentColor"
          stroke="none"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          1
        </text>
      )}
    </svg>
  )
}
