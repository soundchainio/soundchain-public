import { Locker as LockerIcon } from 'icons/Locker';
import { Copy } from 'icons/Copy';
import { toast } from 'react-toastify';

interface CopyTextProps {
  text: string;
}

export const CopyText = ({ text }: CopyTextProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast('Copied to clipboard');
  };

  return (
    <div className="flex flex-row bg-gray-1A w-full p-3 justify-between">
      <div className="flex items-center text-sm">
        <LockerIcon />
        <span className="text-gray-80 font-bold mx-1 w-full">{text}</span>
      </div>
      <button
        className="flex gap-1 items-center border-2 border-gray-30 border-opacity-75 rounded p-1 text-xxs"
        onClick={handleCopy}
        type="button"
      >
        <Copy />
        <span className="text-gray-80 uppercase leading-none">copy</span>
      </button>
    </div>
  );
};
