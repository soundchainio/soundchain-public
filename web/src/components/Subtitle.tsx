import classNames from 'classnames'

interface SubtitleProps extends React.ComponentPropsWithoutRef<'h4'> {
  children: JSX.Element | string
  size?: 'base' | 'lg' | 'sm' | 'xs'
}

const baseClasses = 'font-medium text-white'

export const Subtitle = ({ className, children, size = 'base' }: SubtitleProps) => (
  <h4 className={classNames(className, baseClasses, `text-${size}`)}>{children}</h4>
)
