import { IconProps } from 'icons/types/IconProps'

interface WalletButtonProps {
  caption: string
  icon: (props: IconProps) => JSX.Element
  handleOnClick: () => void
}

export const WalletButton = ({ caption, icon: Icon, handleOnClick }: WalletButtonProps) => {
  return (
    <button
      className="flex h-16 w-full items-center justify-center gap-2 rounded-lg border-2 border-gray-50 bg-gray-30 p-3 px-4 text-xs font-black uppercase text-white"
      onClick={handleOnClick}
    >
      <Icon height="30" width="30" />
      {caption}
    </button>
  )
}
