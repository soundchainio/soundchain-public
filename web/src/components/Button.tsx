import { IconComponent } from 'icons/types/IconComponent';
import { forwardRef } from 'react';
import { BuyNFTButton } from './Buttons/BuyNFT';
import { ClearButton } from './Buttons/Clear';
import { EditListingButton } from './Buttons/EditListing';
import { GreenGradient } from './Buttons/GreenGradient';
import { ListNFTButton } from './Buttons/ListNFT';
import { OrangeButton } from './Buttons/Orange';
import { OutlineButton } from './Buttons/Outline';
import { OutlineRoundedButton } from './Buttons/OutlineRounded';
import { RainbowButton } from './Buttons/Rainbow';
import { RainbowRounded } from './Buttons/RainbowRounded';
import { RainbowXSButton } from './Buttons/RainbowXS';
import { ApproveButton } from './Buttons/ApproveButton';
import { CancelButton } from './Buttons/CancelButton';

export type ButtonVariant =
  | 'rainbow'
  | 'outline'
  | 'rainbow-xs'
  | 'rainbow-rounded'
  | 'green-yellow-gradient'
  | 'clear'
  | 'list-nft'
  | 'buy-nft'
  | 'outline-rounded'
  | 'orange'
  | 'edit-listing'
  | 'approve'
  | 'cancel';

export interface ButtonProps extends React.ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  icon?: IconComponent;
  loading?: boolean;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
}

export const commonClasses = 'flex items-center justify-center w-full h-full font-bold';

export const buttonByVariant: Record<ButtonVariant, (props: ButtonProps) => JSX.Element> = {
  rainbow: RainbowButton,
  outline: OutlineButton,
  'rainbow-rounded': RainbowRounded,
  'rainbow-xs': RainbowXSButton,
  'green-yellow-gradient': GreenGradient,
  clear: ClearButton,
  'outline-rounded': OutlineRoundedButton,
  'list-nft': ListNFTButton,
  'buy-nft': BuyNFTButton,
  orange: OrangeButton,
  'edit-listing': EditListingButton,
  approve: ApproveButton,
  cancel: CancelButton, 
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ variant = 'rainbow', ...props }, ref) => {
  return buttonByVariant[variant]({ ...props, ref });
});

Button.displayName = 'Button';
