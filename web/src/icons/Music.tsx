interface Props extends React.SVGProps<SVGSVGElement> {
  fillColor?: string
}

export const Music = ({ fillColor = '#505050', ...props }: Props) => {
  return (
    <svg width={11} height={14} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M10 4.085v5.058a2 2 0 101 1.732V.8A.8.8 0 009.93.047l-6.4 2.286a.8.8 0 00-.53.753v7.056a2 2 0 101 1.733V6.228l6-2.142v-.001z"
        fill={fillColor}
      />
    </svg>
  )
}
