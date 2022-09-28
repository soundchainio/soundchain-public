import classNames from 'classnames'
import { ButtonProps } from 'components/Buttons/Button'

const deleteClasses =
  'sm:px-4 py-3 font-bold bg-red-700 bg-opacity-50 border-2 border-red-400 w-full flex items-center justify-center uppercase'

export const Delete = ({ className, type = 'button', children, ...rest }: ButtonProps) => {
  return (
    <button className={classNames(deleteClasses, className)} type={type} {...rest}>
      <span>{children}</span>
    </button>
  )
}
