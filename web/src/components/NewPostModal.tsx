import React from 'react';

interface NewPostModalProps {
  setShowNewPost: (val: boolean) => void;
  showNewPost: boolean;
}

const baseClasses =
  'absolute w-screen h-0 fixed bottom-0 duration-300 bg-opacity-50 ease-in-out bg-gray-25 transform-gpu transform';

export const NewPostModal = ({ setShowNewPost, showNewPost }: NewPostModalProps) => {
  return (
    <div
      className={`${baseClasses} ${showNewPost ? 'translate-y-0 h-screen' : 'translate-y-full'}`}
      onClick={() => setShowNewPost(false)}
    ></div>
  );
};
