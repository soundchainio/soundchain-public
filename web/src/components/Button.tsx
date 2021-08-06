import { OutlineButton } from './Buttons/Outline';
import { RainbowButton } from './Buttons/Raibow';
import { RainbowRounded } from './Buttons/RaibowRounded';
import { RainbowXSButton } from './Buttons/RaibowXS';

export type ButtonVariant = 'rainbow' | 'outline' | 'raibow-xs' | 'raibow-rounded';

export interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  icon?: (props: React.ComponentProps<'svg'>) => JSX.Element;
}

export const commonClasses = 'flex items-center justify-center uppercase w-full h-full';

export const buttonByVariant: Record<ButtonVariant, (props: ButtonProps) => JSX.Element> = {
  rainbow: RainbowButton,
  outline: OutlineButton,
  'raibow-rounded': RainbowRounded,
  'raibow-xs': RainbowXSButton,
};

export const Button = ({ variant = 'rainbow', ...props }: ButtonProps) => {
  return buttonByVariant[variant](props);
};
