import classNames from 'classnames';

interface LabelProps extends React.ComponentPropsWithoutRef<'label'> {
  htmlFor?: string;
  children: string;
}

const baseClasses = 'text-sm md:text-base font-medium text-gray-400';

export const Label = ({ className, children, ...props }: LabelProps) => (
  <label className={classNames(className, baseClasses)} htmlFor={props.htmlFor}>
    {children}
  </label>
);
