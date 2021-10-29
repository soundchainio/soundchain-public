import { ChainLink } from 'icons/ChainLink';
import { Copy } from 'icons/Copy';
import { useState } from 'react';

interface CopyLinkProps {
  link: string;
}

export const CopyLink = ({ link }: CopyLinkProps) => {
  const [copyText, setCopyText] = useState('Copy');

  const handleCopy = () => {
    const input = document.getElementById(link) as HTMLInputElement;
    input.focus();
    input.select();
    document.execCommand('copy');
    setCopyText('Copied!');
    setTimeout(() => {
      setCopyText('Copy');
    }, 3000);
  };

  return (
    <div className="flex flex-row space-x-2 px-4 items-center cursor-pointer py-2 bg-gray-20">
      <ChainLink className="scale-150" />
      <input
        className="w-full py-1 ml-4 mr-4 text-xs text-gray-80 bg-gray-20 focus:border-transparent border-transparent focus:outline-none no-bg-selection"
        id={link}
        value={link}
        readOnly
      />
      <button className="text-gray-80 font-bold flex items-center justify-center pr-4 pl-4 w-30" onClick={handleCopy}>
        <Copy className="mr-1 h-3 w-3" /> {copyText}
      </button>
    </div>
  );
};
