import classNames from 'classnames';
import { ButtonProps, commonClasses } from 'components/Button';

export const OutlineButton = ({
  className,
  type = 'button',
  icon: Icon,
  children,
  borderColor,
  bgColor,
  ...rest
}: ButtonProps) => {
  return (
    <div className={classNames(className, 'p-0.5', borderColor)}>
      <button
        className={classNames(
          commonClasses,
          'text-white text-xs h-full bg-opacity-75 font-semibold',
          bgColor ? bgColor : 'bg-gray-10',
        )}
        type={type}
        {...rest}
      >
        {Icon && <Icon className="mr-1 h-5 w-5" />}
        <span>{children}</span>
      </button>
    </div>
  );
};
