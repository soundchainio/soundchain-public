import classNames from 'classnames';

interface BadgeProps extends React.ComponentPropsWithoutRef<'span'> {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export const Badge = ({ label, selected, onClick, className, ...rest }: BadgeProps) => (
  <span
    className={classNames(
      className,
      'inline-flex items-center px-4 py-1 rounded-full text-xs font-medium cursor-pointer',
      selected ? 'bg-white text-gray-light font-black' : 'bg-gray-30 text-white',
    )}
    onClick={onClick}
    {...rest}
  >
    {label}
  </span>
);
