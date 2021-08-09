import classNames from 'classnames';
import { ButtonProps, commonClasses } from 'components/Button';

export const RainbowRounded = ({ className, type = 'button', icon: Icon, children, ...rest }: ButtonProps) => {
  return (
    <div className={classNames(className, 'p-0.5 bg-rainbow-gradient rounded-3xl')}>
      <button
        className={`${commonClasses} sm:px-4 py-1 font-bold text-white bg-opacity-60 bg-black rounded-3xl`}
        type={type}
        {...rest}
      >
        {Icon && <Icon className="mr-1 h-5 w-5" />}
        <span className="capitalize">{children}</span>
      </button>
    </div>
  );
};
