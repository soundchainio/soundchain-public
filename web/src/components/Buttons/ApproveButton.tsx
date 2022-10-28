import classNames from 'classnames'
import { ButtonProps } from 'components/Buttons/Button'

export const ApproveButton = ({ className, type = 'button', children, loading, ...rest }: ButtonProps) => {
  return (
    <div className={classNames(className, 'bg-green-gradient border-2 border-green-27')}>
      <button
        className="w-full bg-black bg-opacity-75 p-2 px-6 text-xs font-bold  text-white sm:px-4"
        type={type}
        {...rest}
      >
        {loading ? (
          <div className="flex items-center justify-center px-6">
            <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white"></div>
          </div>
        ) : (
          <span className="uppercase">{children}</span>
        )}
      </button>
    </div>
  )
}
