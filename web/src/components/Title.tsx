import classNames from 'classnames';

interface TitleProps extends React.ComponentPropsWithoutRef<'h2'> {
  children: string;
}

const baseClasses = 'text-2xl md:text-xl font-black text-white truncate';

export const Title = ({ className, children }: TitleProps) => (
  <h2 className={classNames(className, baseClasses)}>{children}</h2>
);
