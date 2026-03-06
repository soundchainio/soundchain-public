interface Props extends React.SVGProps<SVGSVGElement> {
  fillColor?: string
}

export const Posts = ({ fillColor = '#505050', ...props }: Props) => {
  return (
    <svg width={13} height={14} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.111 1.556H2.333a.778.778 0 00-.777.777v9.334a.778.778 0 00.777.777h7.778a.778.778 0 00.778-.777V2.333a.778.778 0 00-.778-.777zM2.333 0A2.333 2.333 0 000 2.333v9.334A2.333 2.333 0 002.333 14h7.778a2.333 2.333 0 002.333-2.333V2.333A2.333 2.333 0 0010.111 0H2.333z"
        fill={fillColor}
      />
      <path
        d="M3.111 3.111h6.223v1.556H3.11V3.11zM3.111 6.222h6.223v1.556H3.11V6.222zM3.111 9.333h3.89v1.556H3.11V9.333z"
        fill={fillColor}
      />
    </svg>
  )
}
