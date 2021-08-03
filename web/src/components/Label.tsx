import classNames from 'classnames';

interface LabelProps extends React.ComponentPropsWithoutRef<'h2'> {
  children: string;
}

const baseClasses = 'text-sm md:text-base font-medium text-gray-600';

export const Label = ({ className, children }: LabelProps) => (
  <h2 className={classNames(className, baseClasses)}>{children}</h2>
);
