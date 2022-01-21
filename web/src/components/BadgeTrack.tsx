import classNames from 'classnames';

interface BadgeProps extends React.ComponentPropsWithoutRef<'span'> {
  label: string;
  auction: boolean;
}

export const BadgeTrack = ({ label, className, auction, ...rest }: BadgeProps) => (
  <span
    className={classNames(
      className,
      'inline-flex items-center p-[4px] pt-[5px] rounded-full font-black', //padding top is 1 pixel bigger for optical alignment
      auction ? 'bg-light-blue-gradient' : 'bg-light-green-gradient',
    )}
    style={{ fontSize: '8px' }}
    {...rest}
  >
    {label}
  </span>
);
