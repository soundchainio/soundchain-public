import { ButtonVariantProps } from 'components/Button';

export const CancelButton = ({ className, type = 'button', children, loading, ...rest }: ButtonVariantProps) => {
  return (
    <div className={className}>
      <button
        className='m:px-4 p-2 font-bold text-white text-xs bg-opacity-25 bg-gray-60 border-transparent border-opacity-60 border-2 px-6 w-full'
        type={type}
        {...rest}
      >
        {loading ? (
          <div className='flex justify-center items-center px-6'>
            <div className='animate-spin rounded-full h-5 w-5 border-t-2 border-white'></div>
          </div>
        ) : (
          <span className="uppercase">{children}</span>
        )}
      </button>
    </div>
  );
};
