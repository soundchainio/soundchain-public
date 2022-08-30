export const ThumbsUpNotification = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx={10} cy={10} r={10} fill="#75ACFF" />
      <path
        d="M6 10.25a.75.75 0 011.5 0v3a.75.75 0 11-1.5 0v-3zM8 10.166v2.716a1 1 0 00.553.895l.025.012a2 2 0 00.894.211h2.708a1 1 0 00.98-.804l.6-3A1 1 0 0012.78 9H11V7a1 1 0 00-1-1 .5.5 0 00-.5.5v.333a2 2 0 01-.4 1.2l-.7.934a2 2 0 00-.4 1.2z"
        fill="#202020"
      />
    </svg>
  )
}
