import classNames from 'classnames';

interface LabelProps extends React.ComponentPropsWithoutRef<'span'> {
  children: string;
}

const baseClasses = 'text-sm md:text-base font-medium text-gray-600';

export const Label = ({ className, children }: LabelProps) => (
  <label className={classNames(className, baseClasses)}>{children}</label>
);
