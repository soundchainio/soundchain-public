import { useReactToPostMutation } from 'lib/graphql';
import React from 'react';

interface ReactionSelectorProps {
  postId: string;
  opened: boolean;
  setOpened: (val: boolean) => void;
}

const baseClasses = 'list-none flex absolute duration-500 ease-in-out bg-gray-25 transform-gpu transform w-3/4 right-0';
const emojiOptions = ['❤️', '🤘', '😃', '😢', '😎'];

export const ReactionSelector = ({ postId, opened, setOpened }: ReactionSelectorProps) => {
  const [reactToPost] = useReactToPostMutation();

  const handleSelect = async (emoji: string) => {
    await reactToPost({ variables: { input: { postId, emoji } } });
    setOpened(false);
  };

  const ListOptions = emojiOptions.map(emoji => {
    return (
      <li key={emoji} className="flex-1 text-center cursor-pointer" onClick={() => handleSelect(emoji)}>
        {emoji}
      </li>
    );
  });

  return <ul className={`${baseClasses} ${opened ? 'translate-x-4/4' : 'translate-x-full'}`}>{ListOptions}</ul>;
};
