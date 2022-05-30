import classNames from 'classnames';
import { ButtonVariantProps, commonClasses } from 'components/Button';

export const RainbowXSButton = ({
                                  className,
                                  type = 'button',
                                  icon: Icon,
                                  children,
                                  loading,
                                  Component,
                                  ...rest
                                }: ButtonVariantProps) => {
  return (
    <div className={classNames(className, 'p-0.5 bg-rainbow-gradient h-8', rest.disabled ? 'cursor-not-allowed' : '')}>
      <Component
        className={`${commonClasses} sm:px-4 p-2 font-medium text-white text-xs bg-opacity-60 bg-black ${
          rest.disabled ? 'cursor-not-allowed' : ''
        }`}
        type={type}
        {...rest}
      >
        {Icon && <Icon className='mr-1 h-4 w-4' />}
        {loading ? (
          <div className=' flex justify-center items-center'>
            <div className='animate-spin rounded-full h-5 w-5 border-t-2 border-white'></div>
          </div>
        ) : (
          <span>{children}</span>
        )}
      </Component>
    </div>
  );
};
