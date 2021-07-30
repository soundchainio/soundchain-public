import classNames from 'classnames';

export type ButtonVariant = 'default' | 'outlined';

export interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
}

const commonClasses = 'inline-block px-4 py-3 text-center';

export const buttonClassesByVariant: Record<ButtonVariant, string> = {
  default: `${commonClasses} bg-black text-white`,
  outlined: `${commonClasses} border-2 text-black`,
};

export default function Button({ className, variant = 'default', ...rest }: ButtonProps) {
  return <button className={classNames(className, buttonClassesByVariant[variant])} {...rest} />;
}
