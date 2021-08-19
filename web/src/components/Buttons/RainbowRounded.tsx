import classNames from 'classnames';
import { ButtonProps, commonClasses } from 'components/Button';

export const RainbowRounded = ({ className, type = 'button', icon: Icon, children, ...rest }: ButtonProps) => {
  return (
    <div className={'p-0.5 rounded-3xl bg-rainbow-gradient'}>
      <button
        className={classNames(commonClasses, 'sm:px-4 py-1 font-bold rounded-3xl', className)}
        type={type}
        {...rest}
      >
        {Icon && <Icon className="mr-1 h-5 w-5" />}
        <span className="capitalize rainbox-text">{children}</span>
      </button>
    </div>
  );
};
