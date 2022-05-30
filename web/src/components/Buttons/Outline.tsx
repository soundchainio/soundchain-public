import classNames from 'classnames';
import { ButtonVariantProps, commonClasses } from 'components/Button';

export const OutlineButton = ({
                                className,
                                type = 'button',
                                Component,
                                icon: Icon,
                                children,
                                borderColor,
                                bgColor,
                                ...rest
                              }: ButtonVariantProps) => {
  return (
    <div className={classNames(className, 'p-0.5', borderColor)}>
      <Component
        className={classNames(
          commonClasses,

          'text-white text-xs h-full bg-opacity-75 font-semibold',
          bgColor ? bgColor : 'bg-gray-10',
        )}
        type={type}
        {...rest}
      >
        {Icon && <Icon className='mr-1 h-5 w-5' />}
        <span>{children}</span>
      </Component>
    </div>
  );
};
