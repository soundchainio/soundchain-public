import classNames from 'classnames'
import { ButtonProps, commonClasses } from 'components/Button'

export const GreenGradient = ({ className, type = 'button', icon: Icon, children, ...rest }: ButtonProps) => {
  return (
    <div>
      <button
        className={classNames(commonClasses, 'py-1 font-bold uppercase sm:px-4', className)}
        type={type}
        {...rest}
      >
        {Icon && <Icon className="mr-1 h-5 w-5" />}
        <span className="green-yellow-gradient-text">{children}</span>
      </button>
    </div>
  )
}
