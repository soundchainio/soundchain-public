import { ButtonProps } from 'components/Button';

export const EditListingButton = ({ className, type = 'button', children, loading, ...rest }: ButtonProps) => {
  return (
    <div className={className}>
      <button
        className="md:px-4 p-2 font-bold text-white text-xs bg-opacity-60 bg-yellow-gradient border-yellow-300 border-2 w-full"
        type={type}
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
