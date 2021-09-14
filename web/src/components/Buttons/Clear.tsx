import classNames from 'classnames';
import { ButtonProps, commonClasses } from 'components/Button';

export const ClearButton = ({ className, type = 'button', icon: Icon, children, ...rest }: ButtonProps) => {
  return (
    <div className={classNames(className, 'p-0.5')}>
      <button className={`${commonClasses}  py-2 text-white text-xs uppercase font-semibold`} type={type} {...rest}>
        {Icon && <Icon className="mr-1 h-5 w-5" />}
        <span className="capitalize">{children}</span>
      </button>
    </div>
  );
};
