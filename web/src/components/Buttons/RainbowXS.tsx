import classNames from 'classnames';
import { ButtonProps, commonClasses } from 'components/Button';

export const RainbowXSButton = ({ className, type = 'button', icon: Icon, children, ...rest }: ButtonProps) => {
  return (
    <div className={classNames(className, 'p-0.5 bg-rainbow-gradient h-8')}>
      <button
        className={`${commonClasses} sm:px-4 p-2 font-medium text-white text-xs bg-opacity-60 bg-black`}
        type={type}
        {...rest}
      >
        {Icon && <Icon className="mr-1 h-4 w-4" />}
        <span>{children}</span>
      </button>
    </div>
  );
};
