import { IconComponent } from 'icons/types/IconComponent'
import React, { forwardRef } from 'react'
import { ApproveButton } from './ApproveButton'
import { BuyNFTButton } from './BuyNFT'
import { CancelButton } from './CancelButton'
import { ClearButton } from './Clear'
import { EditListingButton } from './EditListing'
import { GreenGradient } from './GreenGradient'
import { ListNFTButton } from './ListNFT'
import { OrangeButton } from './Orange'
import { OutlineButton } from './Outline'
import { OutlineRoundedButton } from './OutlineRounded'
import { RainbowButton } from './RainbowButton'
import { RainbowRounded } from './RainbowRounded'
import { RainbowXSButton } from './RainbowXS'
import { ApproveAllowanceButton } from './ApproveAllowanceButton'

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
  | 'cancel'
  | 'approve-allowance'

export interface ButtonProps extends React.ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant
  href?: string
  buttonClassName?: string
  icon?: IconComponent | null
  loading?: boolean
  bgColor?: string
  borderColor?: string
  textColor?: string
  outlined?: boolean
}

export const commonClasses = 'flex items-center justify-center w-full h-full font-bold'

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
  'approve-allowance': ApproveAllowanceButton,
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ variant = "rainbow", ...props }, ref) => {
  const Component = buttonByVariant[variant] || RainbowButton
  return <Component {...props} ref={ref} />
})

Button.displayName = "Button"
