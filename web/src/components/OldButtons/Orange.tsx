import classNames from 'classnames'
import { ButtonProps, commonClasses } from 'components/OldButtons/Button'

export const OrangeButton = ({ className, type = 'button', icon: Icon, children, loading, ...rest }: ButtonProps) => {
  return (
    <div className={classNames(className, 'border-yellow-600 bg-yellow-600 p-0.5')}>
      <button
        className={`${commonClasses} bg-black bg-opacity-75 py-3 font-extrabold uppercase text-white sm:px-4
          ${rest.disabled ? 'cursor-not-allowed' : ''}`}
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
