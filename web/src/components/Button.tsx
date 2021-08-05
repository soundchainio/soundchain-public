import classNames from 'classnames';

export type ButtonVariant = 'rainbow';

export interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  icon?: (props: React.ComponentProps<'svg'>) => JSX.Element;
}

const commonClasses = 'flex items-center justify-center sm:px-4 py-3 uppercase font-extrabold';

export const buttonByVariant: Record<ButtonVariant, (props: ButtonProps) => JSX.Element> = {
  rainbow: RainbowButton,
};

export default function Button({ variant = 'rainbow', ...props }: ButtonProps) {
  return buttonByVariant[variant](props);
}

function RainbowButton({ className, type = 'button', icon: Icon, children, ...rest }: ButtonProps) {
  return (
    <div className={classNames(className, 'p-0.5 bg-rainbow-gradient')}>
      <button className={`${commonClasses} text-white bg-opacity-60 bg-black w-full h-full`} type={type} {...rest}>
        {Icon && <Icon className="hidden sm:block mr-1 h-5 w-5" />}
        <span>{children}</span>
      </button>
    </div>
  );
}
