import classNames from 'classnames';
import { ReactNode } from 'react';

interface LabelProps extends React.ComponentPropsWithoutRef<'label'> {
  htmlFor?: string;
  children: ReactNode;
  textSize?: 'xs' | 'sm' | 'base';
}

const baseClasses = 'text-gray-60';

export const Label = ({ className, children, textSize, ...props }: LabelProps) => (
  <label
    className={classNames(baseClasses, className, textSize ? `text-${textSize}` : 'text-sm')}
    htmlFor={props.htmlFor}
  >
    {children}
  </label>
);
