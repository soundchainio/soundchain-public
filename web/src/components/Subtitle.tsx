import classNames from 'classnames';

interface SubtitleProps extends React.ComponentPropsWithoutRef<'h4'> {
  children: string;
}

const baseClasses = 'text-base md:text-lg font-medium text-white truncate';

export const Subtitle = ({ className, children }: SubtitleProps) => (
  <h4 className={classNames(className, baseClasses)}>{children}</h4>
);
