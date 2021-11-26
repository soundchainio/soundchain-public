import classNames from 'classnames';
import { ButtonProps } from 'components/Button';

export const ApproveButton = ({ className, type = 'button', children, loading, ...rest }: ButtonProps) => {
  return (
    <div className={classNames(className, 'bg-green-gradient border-green-27 border-2')}>
      <button
        className="sm:px-4 p-2 font-bold text-white text-xs bg-opacity-75 bg-black  px-6 w-full"
        type={type}
        {...rest}
      >
        {loading ? (
          <div className="flex justify-center items-center px-6">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
          </div>
        ) : (
          <span className="uppercase">{children}</span>
        )}
      </button>
    </div>
  );
};
