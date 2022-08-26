import classNames from 'classnames'
import { ButtonProps, commonClasses } from 'components/Button'

export const OutlineButton = ({
  className,
  type = 'button',
  icon: Icon,
  children,
  borderColor,
  bgColor,
  loading,
  ...rest
}: ButtonProps) => {
  return (
    <div className={classNames(className, 'p-0.5', borderColor)}>
      <button
        className={classNames(
          commonClasses,
          'h-full bg-opacity-75 text-xs font-semibold text-white',
          bgColor ? bgColor : 'bg-gray-10',
        )}
        type={type}
        {...rest}
      >
        {Icon && <Icon className="mr-1 h-5 w-5" />}
        {loading ? (
          <div className=" flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white"></div>
          </div>
        ) : (
          <span>{children}</span>
        )}
      </button>
    </div>
  )
}
