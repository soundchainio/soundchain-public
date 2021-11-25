import classNames from 'classnames';

interface BadgeProps extends React.ComponentPropsWithoutRef<'span'> {
  label: string;
  auction: boolean;
}

export const BadgeTrack = ({ label, className, auction, ...rest }: BadgeProps) => (
  <span
    className={classNames(
      className,
      'inline-flex items-center px-1 py-1 rounded-full font-black',
      auction ? 'bg-blue-300' : 'bg-green-300',
    )}
    style={{ fontSize: '8px' }}
    {...rest}
  >
    {label}
  </span>
);
