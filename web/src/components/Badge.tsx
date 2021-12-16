import classNames from 'classnames';
import { Close } from 'icons/Close';

interface BadgeProps extends React.ComponentPropsWithoutRef<'span'> {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

export const Badge = ({ label, selected, onClick, className, onDelete, ...rest }: BadgeProps) => (
  <span
    className={classNames(
      className,
      'inline-flex items-center px-4 py-1 rounded-full text-xs',
      onClick ? 'cursor-pointer' : 'font-black',
      selected ? 'bg-white text-gray-light font-black' : 'bg-gray-30 text-white',
    )}
    onClick={onClick}
    {...rest}
  >
    {label}
    {onDelete && <Close className="ml-2 cursor-pointer" onClick={onDelete} />}
  </span>
);
