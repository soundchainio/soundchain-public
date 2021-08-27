import classNames from 'classnames';
import { ButtonProps, commonClasses } from 'components/Button';
import { TrashCan } from 'icons/TrashCan';

const deleteClasses = 'sm:px-4 py-3 font-bold bg-red-700 bg-opacity-50 border-2 border-red-400';

export const Delete = ({ className, type = 'button', icon: Icon, children, ...rest }: ButtonProps) => {
  return (
    <div>
      <button className={classNames(commonClasses, deleteClasses, className)} type={type} {...rest}>
        <TrashCan className="mr-1 h-4 w-4" />
        <span>{children}</span>
      </button>
    </div>
  );
};
