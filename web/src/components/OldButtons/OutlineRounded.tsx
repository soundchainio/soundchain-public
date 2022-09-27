import classNames from 'classnames'
import { ButtonProps, commonClasses } from 'components/OldButtons/Button'

export const OutlineRoundedButton = ({
  className,
  type = 'button',
  icon: Icon,
  children,
  borderColor,
  textColor,
  bgColor,
  ...rest
}: ButtonProps) => {
  return (
    <div className={classNames('flex h-auto rounded-full p-0.5', borderColor)}>
      <button
        className={classNames(
          commonClasses,
          'rounded-full text-xs uppercase text-white',
          className,
          bgColor ? bgColor : 'bg-gray-10',
        )}
        type={type}
        {...rest}
      >
        {Icon && (
          <div className="flex h-5 w-5 content-center items-center px-1">
            <Icon />
          </div>
        )}
        <span className={classNames(textColor, 'font-semibold capitalize')}>{children}</span>
      </button>
    </div>
  )
}
