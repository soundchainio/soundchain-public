import classNames from 'classnames';
import { ButtonProps, commonClasses } from 'components/Button';

export const RainbowButton = ({ className, type = 'button', icon: Icon, children, ...rest }: ButtonProps) => {
  return (
    <div className={classNames(className, 'p-0.5 bg-rainbow-gradient')}>
      <button
        className={`${commonClasses} sm:px-4 py-3 font-extrabold text-white bg-opacity-60 bg-black`}
        type={type}
        {...rest}
      >
        {Icon && <Icon className="mr-1 h-5 w-5" />}
        <span>{children}</span>
      </button>
    </div>
  );
};
