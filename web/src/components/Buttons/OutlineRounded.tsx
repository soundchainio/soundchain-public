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
    <div className={classNames('flex p-0.5 rounded-full h-auto', borderColor)}>
      <button
        className={classNames(
          commonClasses,
          'text-white text-xs uppercase rounded-full',
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
        <span className={classNames(textColor, 'capitalize font-semibold')}>{children}</span>
      </button>
    </div>
  );
};
