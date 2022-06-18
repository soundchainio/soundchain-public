import { IconComponent } from 'icons/types/IconComponent';
import React, { forwardRef } from 'react';
import { ApproveButton } from './Buttons/ApproveButton';
import { BuyNFTButton } from './Buttons/BuyNFT';
import { CancelButton } from './Buttons/CancelButton';
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
import { getButtonComponent } from './Buttons/utils';

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
  as?: string | React.FC;
  variant?: ButtonVariant;
  buttonClassName?: string
  icon?: IconComponent | null;
  loading?: boolean;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
}

export type DynamicComponentProps = Record<string, unknown>;

export interface ButtonVariantProps extends Omit<ButtonProps, 'as'> {
  Component: React.FC<DynamicComponentProps>;
}

export const commonClasses = 'flex items-center justify-center w-full h-full font-bold';

export const buttonByVariant: Record<ButtonVariant, (props: ButtonVariantProps) => JSX.Element> = {
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


export const Button = forwardRef<HTMLButtonElement, ButtonProps & DynamicComponentProps>(({
                                                                                            variant = 'rainbow',
                                                                                            as = 'button',
                                                                                            borderColor,
                                                                                            bgColor,
                                                                                            ...props
                                                                                          }, ref) => {
  const Component = getButtonComponent(as, variant, props);

  return buttonByVariant[variant]({
    ...props,
    borderColor,
    bgColor,
    Component,
    ref,
  });
});

Button.displayName = 'Button';
