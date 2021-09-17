import classNames from 'classnames';
import { ButtonProps } from 'components/Button';
import { Pencil } from 'icons/Pencil';

const editClasses =
  'sm:px-4 py-3 font-bold bg-blue-700 bg-opacity-50 border-2 border-blue-400 w-full flex items-center justify-center uppercase';

export const Edit = ({ className, type = 'button', children, ...rest }: ButtonProps) => {
  return (
    <button className={classNames(editClasses, className)} type={type} {...rest}>
      <Pencil className="mr-2 h-4 w-4" />
      <span>{children}</span>
    </button>
  );
};
