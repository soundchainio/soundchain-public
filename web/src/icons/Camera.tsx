export const Camera = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx={20} cy={20} r={20} fill="url(#prefix__paint0_linear)" />
      <path d="M22.5 20.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" fill="#000" />
      <path
        d="M14 16a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2h-1.172a2 2 0 01-1.414-.586l-.828-.828A2 2 0 0021.172 14h-2.344a2 2 0 00-1.414.586l-.828.828a2 2 0 01-1.414.586H14zm.5 2a.5.5 0 110-1 .5.5 0 010 1zm9 2.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z"
        fill="#000"
      />
      <defs>
        <linearGradient id="prefix__paint0_linear" x1={20} y1={0} x2={20} y2={40} gradientUnits="userSpaceOnUse">
          <stop stopColor="#84FF82" />
          <stop offset={1} stopColor="#4870FF" />
        </linearGradient>
      </defs>
    </svg>
  )
}
