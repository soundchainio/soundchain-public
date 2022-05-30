import classNames from 'classnames';
import { ButtonVariantProps, commonClasses } from 'components/Button';

export const ClearButton = ({ className, type = 'button', icon: Icon, children, ...rest }: ButtonVariantProps) => {
  return (
    <div className={classNames(className, 'p-0.5')}>
      <button className={`${commonClasses}  py-2 text-xs uppercase font-semibold`} type={type} {...rest}>
        <span className='capitalize'>{children}</span>
        {Icon && <Icon className='mr-1 h-5 w-5' />}
      </button>
    </div>
  );
};
