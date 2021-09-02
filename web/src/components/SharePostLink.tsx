import { Close } from 'icons/Close';
import { Copy } from 'icons/Copy';
import { Locker } from 'icons/Locker';
import React, { useState } from 'react';

interface SharePostLinkProps {
  link: string;
  postId: string;
  opened: boolean;
  setOpened: (val: boolean) => void;
}

const baseClasses = 'flex absolute duration-500 ease-in-out bg-gray-25 transform-gpu transform w-full right-0';
export const SharePostLink = ({ link, postId, opened, setOpened }: SharePostLinkProps) => {
  const [copyText, setCopyText] = useState('Copy');
  const handleClose = () => {
    setOpened(false);
    setCopyText('Copy');
  };

  const handleCopy = () => {
    const input = document.getElementById(`post-link-input${postId}`) as HTMLInputElement;
    input.focus();
    input.select();
    document.execCommand('copy');
    setCopyText('Copied!');
  };

  return (
    <div className={`${baseClasses} ${opened ? 'translate-x-4/4' : 'translate-x-full'}`}>
      <div className="flex items-center w-full relative">
        <Locker className="h-3 w-3 absolute left-7" />
        <input
          className="w-full pl-8 py-1 ml-4 mr-4 text-sm text-gray-80 bg-gray-10 rounded-xl focus:border-transparent border-transparent focus:outline-none no-background-selection"
          id={`post-link-input${postId}`}
          value={link}
        />
        <button onClick={handleCopy} className="text-white font-bold flex items-center pr-4 pl-4 w-40">
          <Copy className="mr-1 h-4 w-4" /> {copyText}
        </button>
        <button onClick={handleClose} className="w-20 pr-4 pl-4">
          <Close className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
