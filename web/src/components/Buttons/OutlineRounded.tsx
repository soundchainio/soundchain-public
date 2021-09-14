import classNames from 'classnames';
import { ButtonProps, commonClasses } from 'components/Button';

export const OutlineRoundedButton = ({
  className,
  type = 'button',
  icon: Icon,
  children,
  borderColor,
  textColor,
  ...rest
}: ButtonProps) => {
  return (
    <div className={classNames('p-0.5 rounded-full h-full', borderColor)}>
      <button
        className={classNames(commonClasses, 'p-2 text-white text-xs uppercase rounded-full bg-gray-10', className)}
        type={type}
        {...rest}
      >
        {Icon && <Icon className="mr-1 h-5 w-5" />}
        <span className={classNames(textColor, 'capitalize')}>{children}</span>
      </button>
    </div>
  );
};
