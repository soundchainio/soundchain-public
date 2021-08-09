import classNames from 'classnames';
import { ReactNode } from 'react';

interface LabelProps extends React.ComponentPropsWithoutRef<'label'> {
  htmlFor?: string;
  children: ReactNode;
}

const baseClasses = 'text-sm md:text-base font-medium text-gray-80';

export const Label = ({ className, children, ...props }: LabelProps) => (
  <label className={classNames(baseClasses, className)} htmlFor={props.htmlFor}>
    {children}
  </label>
);
