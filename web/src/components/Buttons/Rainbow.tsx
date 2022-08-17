import classNames from 'classnames';
import { ButtonProps, commonClasses } from 'components/Button';
import React from 'react';

export const RainbowButton = ({
  className,
  buttonClassName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  borderColor,
  type = 'button',
  icon: Icon,
  children,
  loading,
  ...rest
}: ButtonProps) => {
  return (
    <div className={classNames(className, 'bg-rainbow-gradient p-0.5 hover:bg-rainbow-gradient-dark')}>
      <button
        className={`${commonClasses} ${buttonClassName || ''} bg-black bg-opacity-60 py-3 font-extrabold uppercase text-white sm:px-4 ${
          rest.disabled ? 'cursor-not-allowed' : ''
        }`}
        type={type}
        {...rest}
      >
        {Icon && <Icon className="mr-1 h-5 w-5" />}
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white"></div>
          </div>
        ) : (
          <span>{children}</span>
        )}
      </button>
    </div>
  );
};
