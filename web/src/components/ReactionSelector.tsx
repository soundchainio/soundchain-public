import { ReactionEmoji } from 'icons/ReactionEmoji';
import { ReactionType, useReactToPostMutation } from 'lib/graphql';
import React from 'react';

interface ReactionSelectorProps {
  postId: string;
  opened: boolean;
  setOpened: (val: boolean) => void;
}

const baseClasses = 'list-none flex absolute duration-500 ease-in-out bg-gray-25 transform-gpu transform w-3/4 right-0';
const reactionTypes = [
  ReactionType.Heart,
  ReactionType.Horns,
  ReactionType.Happy,
  ReactionType.Sad,
  ReactionType.Sunglasses,
];

export const ReactionSelector = ({ postId, opened, setOpened }: ReactionSelectorProps) => {
  const [reactToPost] = useReactToPostMutation();

  const handleSelect = async (type: ReactionType) => {
    await reactToPost({ variables: { input: { postId, type } } });
    setOpened(false);
  };

  const ListOptions = reactionTypes.map(reaction => {
    return (
      <li key={reaction} className="flex-1 text-center cursor-pointer" onClick={() => handleSelect(reaction)}>
        <ReactionEmoji name={reaction} className="w-5" />
      </li>
    );
  });

  return <ul className={`${baseClasses} ${opened ? 'translate-x-4/4' : 'translate-x-full'}`}>{ListOptions}</ul>;
};
