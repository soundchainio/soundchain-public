import classNames from 'classnames';
import { ReactNode } from 'react';

interface LabelProps extends React.ComponentPropsWithoutRef<'label'> {
  htmlFor?: string;
  children: ReactNode;
  small?: boolean;
}

const baseClasses = 'font-medium text-gray-80';

export const Label = ({ className, children, small, ...props }: LabelProps) => (
  <label className={classNames(baseClasses, className, small ? 'text-xs' : 'text-sm')} htmlFor={props.htmlFor}>
    {children}
  </label>
);
