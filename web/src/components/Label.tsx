import classNames from 'classnames';
import { ReactNode } from 'react';

interface LabelProps extends React.ComponentPropsWithoutRef<'label'> {
  htmlFor?: string;
  children: ReactNode;
  textSize?: 'xxs' | 'xs' | 'sm' | 'base';
  grayScale?: '60' | '80';
}

export const Label = ({ className, children, textSize = 'sm', grayScale = '60', ...props }: LabelProps) => (
  <label className={classNames(className, `text-gray-${grayScale}`, `text-${textSize}`)} htmlFor={props.htmlFor}>
    {children}
  </label>
);
