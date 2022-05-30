import classNames from 'classnames';
import { ButtonVariantProps, commonClasses } from 'components/Button';
import React from 'react';

export const RainbowButton = ({
                                className,
                                Component,
                                type = 'button',
                                icon: Icon,
                                children,
                                loading,
                                ...rest
                              }: ButtonVariantProps) => {
  return (
    <div className={classNames(className, 'p-0.5 bg-rainbow-gradient hover:bg-rainbow-gradient-dark')}>
      <Component
        className={`${commonClasses} ${className} sm:px-4 py-3 font-extrabold text-white uppercase bg-opacity-60 bg-black ${
          rest.disabled ? 'cursor-not-allowed' : ''
        }`}
        type={type}
        {...rest}
      >
        {Icon && <Icon className='mr-1 h-5 w-5' />}
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
