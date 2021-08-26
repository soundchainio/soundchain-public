import classNames from 'classnames';

interface TitleProps extends React.ComponentPropsWithoutRef<'h2'> {
  children: string;
  navTitle?: boolean;
}

const baseClasses = 'font-bold text-white truncate';

export const Title = ({ className, children, navTitle }: TitleProps) => (
  <h2 className={classNames(className, baseClasses, navTitle ? 'text-sm' : 'text-2xl')}>{children}</h2>
);
