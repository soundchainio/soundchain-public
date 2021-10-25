import { IconComponent } from 'icons/types/IconComponent';
import { BuyNFTButton } from './Buttons/BuyNFT';
import { ClearButton } from './Buttons/Clear';
import { GreenGradient } from './Buttons/GreenGradient';
import { OutlineButton } from './Buttons/Outline';
import { OutlineRoundedButton } from './Buttons/OutlineRounded';
import { RainbowButton } from './Buttons/Rainbow';
import { RainbowRounded } from './Buttons/RainbowRounded';
import { RainbowXSButton } from './Buttons/RainbowXS';
import { SellNFTButton } from './Buttons/SellNFT';
import { OrangeButton } from './Buttons/Orange';

export type ButtonVariant =
  | 'rainbow'
  | 'outline'
  | 'rainbow-xs'
  | 'rainbow-rounded'
  | 'green-yellow-gradient'
  | 'clear'
  | 'sell-nft'
  | 'buy-nft'
  | 'outline-rounded'
  | 'orange';

export interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  icon?: IconComponent;
  loading?: boolean;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
}

export const commonClasses = 'flex items-center justify-center w-full h-full';

export const buttonByVariant: Record<ButtonVariant, (props: ButtonProps) => JSX.Element> = {
  'rainbow': RainbowButton,
  'outline': OutlineButton,
  'rainbow-rounded': RainbowRounded,
  'rainbow-xs': RainbowXSButton,
  'green-yellow-gradient': GreenGradient,
  'clear': ClearButton,
  'outline-rounded': OutlineRoundedButton,
  'sell-nft': SellNFTButton,
  'buy-nft': BuyNFTButton,
  'orange': OrangeButton,
};

export const Button = ({ variant = 'rainbow', ...props }: ButtonProps) => {
  return buttonByVariant[variant](props);
};
