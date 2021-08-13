import classNames from 'classnames';
import { formatDistance } from 'date-fns';

interface TimestampProps extends React.ComponentPropsWithoutRef<'span'> {
  datetime: string;
}

export const Timestamp = ({ datetime, className }: TimestampProps) => {
  return (
    <span className={classNames('text-gray-40 text-base', className)}>
      {formatDistance(new Date(datetime), new Date())}
    </span>
  );
};
