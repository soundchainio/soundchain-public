import React from 'react';

interface PostLikeOptionsProps {
  setShowLikeOptions: (val: boolean) => void;
  showLikeOptions: boolean;
}

const baseClasses = 'list-none flex absolute duration-500 ease-in-out bg-gray-25 transform-gpu transform w-3/4 right-0';
const likeOptions = ['❤️', '🤘', '😃', '😢', '😎'];

export const PostLikeOptions = ({ setShowLikeOptions, showLikeOptions }: PostLikeOptionsProps) => {
  const ListOptions = likeOptions.map(option => {
    return (
      <li key={option} className="flex-1 text-center cursor-pointer" onClick={() => setShowLikeOptions(false)}>
        {option}
      </li>
    );
  });

  return (
    <ul className={`${baseClasses} ${showLikeOptions ? 'translate-x-4/4' : 'translate-x-full'}`}>{ListOptions}</ul>
  );
};
