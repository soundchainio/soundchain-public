import classNames from 'classnames';
import { ButtonProps } from 'components/Button';

export const BuyNFTButton = ({ className, type = 'button', children, ...rest }: ButtonProps) => {
  return (
    <div className={classNames(className)}>
      <button
        className="m:px-4 p-2 font-medium text-white text-xs bg-opacity-60 bg-black bg-green-900 border-green-600 border-2 px-6"
        type={type}
        {...rest}
      >
        <span>{children}</span>
      </button>
    </div>
  );
};
