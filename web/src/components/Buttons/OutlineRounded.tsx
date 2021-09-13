import classNames from 'classnames';
import { ButtonProps, commonClasses } from 'components/Button';

export const OutlineRoundedButton = ({
  className,
  type = 'button',
  icon: Icon,
  children,
  borderColor,
  textColor,
  bgColor,
  ...rest
}: ButtonProps) => {
  return (
    <div className={classNames('p-0.5 rounded-full h-full', borderColor)}>
      <button
        className={classNames(
          commonClasses,
          'p-2 text-white text-xs rounded-full',
          className,
          bgColor ? bgColor : 'bg-gray-10',
        )}
        type={type}
        {...rest}
      >
        {Icon && (
          <div className="flex h-5 w-5 px-1 items-center content-center">
            <Icon />
          </div>
        )}
        <span className={classNames(textColor, 'capitalize pr-1 font-semibold')}>{children}</span>
      </button>
    </div>
  );
};
