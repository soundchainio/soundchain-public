import { IconComponent } from 'icons/types/IconComponent';
import { GreenGradient } from './Buttons/GreenGradient';
import { OutlineButton } from './Buttons/Outline';
import { RainbowButton } from './Buttons/Rainbow';
import { RainbowRounded } from './Buttons/RainbowRounded';
import { RainbowXSButton } from './Buttons/RainbowXS';

export type ButtonVariant = 'rainbow' | 'outline' | 'rainbow-xs' | 'rainbow-rounded' | 'green-gradient';

export interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  icon?: IconComponent;
  loading?: boolean;
  bgColor?: string;
}

export const commonClasses = 'flex items-center justify-center uppercase w-full h-full';

export const buttonByVariant: Record<ButtonVariant, (props: ButtonProps) => JSX.Element> = {
  rainbow: RainbowButton,
  outline: OutlineButton,
  'rainbow-rounded': RainbowRounded,
  'rainbow-xs': RainbowXSButton,
  'green-gradient': GreenGradient,
};

export const Button = ({ variant = 'rainbow', ...props }: ButtonProps) => {
  return buttonByVariant[variant](props);
};
