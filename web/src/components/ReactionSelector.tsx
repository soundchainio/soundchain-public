import classNames from 'classnames';
import { ReactionEmoji } from 'icons/ReactionEmoji';
import {
  ReactionType,
  useChangeReactionMutation,
  useReactToPostMutation,
  useRetractReactionMutation,
} from 'lib/graphql';
import React from 'react';

interface ReactionSelectorProps {
  postId: string;
  myReaction: ReactionType | null;
  opened: boolean;
  setOpened: (val: boolean) => void;
}

const reactionTypes = [
  ReactionType.Heart,
  ReactionType.Horns,
  ReactionType.Happy,
  ReactionType.Sad,
  ReactionType.Sunglasses,
];

const baseListClasses =
  'list-none flex absolute right-0 duration-500 ease-in-out bg-gray-25 transform-gpu transform w-3/4';

export const ReactionSelector = ({ postId, myReaction, opened, setOpened }: ReactionSelectorProps) => {
  const [reactToPost] = useReactToPostMutation();
  const [changeReaction] = useChangeReactionMutation();
  const [retractReaction] = useRetractReactionMutation();

  const handleSelect = async (type: ReactionType) => {
    if (type === myReaction) {
      await retractReaction({ variables: { input: { postId } } });
    } else if (myReaction) {
      await changeReaction({
        variables: { input: { postId, type } },
        refetchQueries: ['Post'],
      });
    } else {
      await reactToPost({
        variables: { input: { postId, type } },
        refetchQueries: ['Post'],
      });
    }

    setOpened(false);
  };

  const ListOptions = reactionTypes.map(reaction => {
    return (
      <li key={reaction} className="flex-1 flex justify-center cursor-pointer" onClick={() => handleSelect(reaction)}>
        <div
          className={classNames('rounded-lg px-3 py-2', {
            'bg-gray-40': myReaction === reaction,
            'opacity-50': myReaction && myReaction !== reaction,
          })}
        >
          <ReactionEmoji name={reaction} className="w-5 h-5" />
        </div>
      </li>
    );
  });

  return <ul className={`${baseListClasses} ${opened ? 'translate-x-4/4' : 'translate-x-full'}`}>{ListOptions}</ul>;
};
