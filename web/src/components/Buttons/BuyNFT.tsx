import { ButtonProps } from 'components/Button';

export const BuyNFTButton = ({
                               className,
                               type = 'button',
                               children,
                               disabled,
                               loading,
                               ...rest
                             }: ButtonProps) => {

  return (
    <div className={className}>
      <button
        disabled={disabled}
        className={`m:px-4 p-2 font-bold text-white text-xs bg-opacity-60 bg-green-900 border-green-600 border-2 px-6 w-full ${
          disabled && 'cursor-not-allowed'
        }`}
        type={type}
        {...rest}
      >
        {loading ? (
          <div className='flex justify-center items-center px-6'>
            <div className='animate-spin rounded-full h-5 w-5 border-t-2 border-white'></div>
          </div>
        ) : (
          <span>{children}</span>
        )}
      </button>
    </div>
  );
};
