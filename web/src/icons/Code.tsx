export const Code = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg width={14} height={14} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M4.5 4L1 7l3.5 3M9.5 4L13 7l-3.5 3M8 2L6 12"
        stroke="#fff"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
