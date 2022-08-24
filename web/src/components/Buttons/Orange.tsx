import classNames from 'classnames';
import { ButtonProps, commonClasses } from 'components/Button';

export const OrangeButton = ({
                               className,
                               type = 'button',
                               icon: Icon,
                               children,
                               loading,
                               ...rest
                             }: ButtonProps) => {
  return (
    <div className={classNames(className, 'p-0.5 bg-yellow-600 border-yellow-600')}>
      <button
        className={`${commonClasses} sm:px-4 py-3 font-extrabold text-white uppercase bg-opacity-75 bg-black
          ${rest.disabled ? 'cursor-not-allowed' : ''
        }`}
        type={type}
        {...rest}
      >
        {Icon && <Icon className='mr-1 h-5 w-5' />}
        {loading ? (
          <div className=" flex justify-center items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
          </div>
        ) : (
          <span>{children}</span>
        )}
      </button>
    </div>
  );
};
