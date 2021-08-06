import classNames from 'classnames';
import { ButtonProps, commonClasses } from 'components/Button';

export const OutlineButton = ({ className, type = 'button', icon: Icon, children, ...rest }: ButtonProps) => {
  return (
    <div className={classNames(className, 'p-0.5')}>
      <button
        className={`${commonClasses} sm:px-3 px-2 py-2 text-white text-xs bg-opacity-100 border-gray-40 border-2 border-solid`}
        type={type}
        {...rest}
      >
        {Icon && <Icon className="mr-1 h-5 w-5" />}
        <span>{children}</span>
      </button>
    </div>
  );
};
