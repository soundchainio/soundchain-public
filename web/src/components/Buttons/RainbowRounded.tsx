import classNames from 'classnames'
import { ButtonProps, commonClasses } from 'components/Buttons/Button'

export const RainbowRounded = ({ className, type = 'button', icon: Icon, children, ...rest }: ButtonProps) => {
  return (
    <div className={'rounded-3xl bg-rainbow-gradient p-0.5'}>
      <button
        className={classNames(commonClasses, 'rounded-3xl py-1 font-bold uppercase sm:px-4', className)}
        type={type}
        {...rest}
      >
        {Icon && <Icon className="mr-1 h-5 w-5" />}
        <span className="rainbox-text capitalize">{children}</span>
      </button>
    </div>
  )
}
