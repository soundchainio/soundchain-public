import classNames from 'classnames'
import { ButtonProps, commonClasses } from 'components/OldButtons/Button'

export const RainbowXSButton = ({
  className,
  type = 'button',
  icon: Icon,
  children,
  loading,
  ...rest
}: ButtonProps) => {
  return (
    <div className={classNames(className, 'h-8 bg-rainbow-gradient p-0.5', rest.disabled ? 'cursor-not-allowed' : '')}>
      <button
        className={`${commonClasses} bg-black bg-opacity-60 p-2 text-xs font-medium text-white sm:px-4 ${
          rest.disabled ? 'cursor-not-allowed' : ''
        }`}
        type={type}
        {...rest}
      >
        {Icon && <Icon className="mr-1 h-4 w-4" />}
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
