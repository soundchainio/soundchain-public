import classNames from 'classnames'
import { ButtonProps, commonClasses } from 'components/common/Buttons/Button'

export const ClearButton = ({ className, type = 'button', icon: Icon, children, ...rest }: ButtonProps) => {
  return (
    <div className={classNames(className, 'p-0.5')}>
      <button className={`${commonClasses}  py-2 text-xs font-semibold uppercase`} type={type} {...rest}>
        <span className="capitalize">{children}</span>
        {Icon && <Icon className="mr-1 h-5 w-5" />}
      </button>
    </div>
  )
}
