import classNames from 'classnames';
import { formatDistance } from 'date-fns';
import { format as formatTimestamp } from 'date-fns';

interface TimestampProps extends React.ComponentPropsWithoutRef<'span'> {
  datetime: string;
  small?: boolean;
  format?: string;
}

export const Timestamp = ({ datetime, className, small, format }: TimestampProps) => {
  return (
    <span className={classNames('text-gray-40', className, small ? 'text-sm' : 'text-base')}>
      {format ? formatTimestamp(new Date(datetime), format) : formatDistance(new Date(datetime), new Date())}
    </span>
  );
};
