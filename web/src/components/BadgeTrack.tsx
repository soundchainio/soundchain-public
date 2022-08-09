interface BadgeProps extends React.ComponentPropsWithoutRef<'span'> {
  auction: boolean;
  label: string;
}

export const BadgeTrack = ({ label, ...rest }: BadgeProps) => (
  <span className="buy-now-gradient text-[8px] sm:text-sm font-black" {...rest}>
    {label}
  </span>
);
