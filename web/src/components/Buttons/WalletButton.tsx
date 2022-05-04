
import { IconProps } from 'icons/types/IconProps';

interface WalletButtonProps {
  caption: string;
  icon: (props: IconProps) => JSX.Element;
  handleOnClick: () => void;
}

export const WalletButton = ({ caption, icon: Icon, handleOnClick }: WalletButtonProps) => {
  return (
    <button
      className="flex items-center w-full p-3 gap-2 justify-center border-2 rounded-lg border-gray-50 bg-gray-30 text-white font-black text-xs uppercase px-4 h-16"
      onClick={handleOnClick}
    >
      <Icon height="30" width="30" />
      {caption}
    </button>
  );
};