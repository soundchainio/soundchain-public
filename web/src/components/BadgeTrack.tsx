interface BadgeProps extends React.ComponentPropsWithoutRef<'span'> {
  label: string;
}

export const BadgeTrack = ({ label, ...rest }: BadgeProps) => (
  <span className="buy-now-gradient text-[8px]" {...rest}>
    {label}
  </span>
);
