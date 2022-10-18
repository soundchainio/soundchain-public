interface BadgeProps extends React.ComponentPropsWithoutRef<'span'> {
  label: string
}

export const BadgeTrack = ({ label }: BadgeProps) => (
  <span className="buy-now-gradient text-[8px] font-black sm:text-sm">{label}</span>
)
