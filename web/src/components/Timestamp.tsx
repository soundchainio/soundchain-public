import classNames from 'classnames';
import { formatDistance } from 'date-fns';

interface TimestampProps extends React.ComponentPropsWithoutRef<'span'> {
  datetime: string;
  small?: boolean;
}

export const Timestamp = ({ datetime, className, small }: TimestampProps) => {
  return (
    <span className={classNames('text-gray-40', className, small ? 'text-sm' : 'text-base')}>
      {formatDistance(new Date(datetime), new Date())}
    </span>
  );
};
