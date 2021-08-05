import React from 'react';

interface PostLikeOptionsProps {
  setLikeOptionsOpened: (val: boolean) => void;
  likeOptionsOpened: boolean;
}

const baseClasses = 'list-none flex absolute duration-300 ease-in-out bg-gray-25 transform-gpu transform w-3/4 right-0';

export const PostLikeOptions = ({ setLikeOptionsOpened, likeOptionsOpened }: PostLikeOptionsProps) => {
  const likeOptions = ['❤️', '🤘', '😃', '😢', '😎'];

  const ListOptions = likeOptions.map(option => {
    return (
      <li key={option} className="flex-1 text-center cursor-pointer" onClick={() => setLikeOptionsOpened(false)}>
        {option}
      </li>
    );
  });

  return (
    <ul className={`${baseClasses} ${likeOptionsOpened ? 'translate-x-4/4' : 'translate-x-full'}`}>{ListOptions}</ul>
  );
};
