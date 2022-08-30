import classNames from 'classnames'
import { format as formatTimestamp, formatDistance } from 'date-fns'

interface TimestampProps extends React.ComponentPropsWithoutRef<'span'> {
  datetime: string
  small?: boolean
  edited?: boolean
  format?: string
}

export const Timestamp = ({ datetime, className, small, format, edited }: TimestampProps) => {
  return (
    <span className={classNames('text-gray-40', className, small ? 'text-xs' : 'text-base')}>
      {format ? formatTimestamp(new Date(datetime), format) : formatDistance(new Date(datetime), new Date())}{' '}
      {edited && '(edited)'}
    </span>
  )
}
