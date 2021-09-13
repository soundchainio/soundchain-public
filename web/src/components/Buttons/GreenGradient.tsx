import classNames from 'classnames';
import { ButtonProps, commonClasses } from 'components/Button';

export const GreenGradient = ({ className, type = 'button', icon: Icon, children, ...rest }: ButtonProps) => {
  return (
    <div>
      <button
        className={classNames(commonClasses, 'sm:px-4 py-1 font-bold uppercase', className)}
        type={type}
        {...rest}
      >
        {Icon && <Icon className="mr-1 h-5 w-5" />}
        <span className="green-gradient-text">{children}</span>
      </button>
    </div>
  );
};
