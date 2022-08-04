import { ButtonVariantProps } from 'components/Button';
import { config } from 'config';

export const ListNFTButton = ({
                                className,
                                type = 'button',
                                children,
                                loading,
                                disabled,
                                ...rest
                              }: ButtonVariantProps) => {
  return (
    <div className={className}>
      <button
        className={`${
          config.mobileBreakpoint
        }:px-4 p-2 font-medium text-white text-xs bg-opacity-60 bg-blue-900 border-blue-600 border-2 px-6 w-full ${
          disabled ? 'cursor-not-allowed' : ''
        }`}
        type={type}
        disabled={disabled}
        {...rest}
      >
        {loading ? (
          <div className="flex justify-center items-center px-6">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
          </div>
        ) : (
          <span>{children}</span>
        )}
      </button>
    </div>
  );
};
