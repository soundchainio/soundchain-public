import { useState } from 'react';
import Picker from '@emoji-mart/react';
import { useChangeReactionMutation, useReactToPostMutation, useRetractReactionMutation } from 'lib/graphql';

interface ReactionSelectorProps {
  postId: string;
  myReaction: string | null;
  opened: boolean;
  setOpened: (val: boolean) => void;
}

export const ReactionSelector = ({ postId, myReaction, opened, setOpened }: ReactionSelectorProps) => {
  const [reactToPost] = useReactToPostMutation();
  const [changeReaction] = useChangeReactionMutation();
  const [retractReaction] = useRetractReactionMutation();
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(myReaction);

  const handleSelect = async (emoji: any) => {
    const emojiId = emoji.native; // Get the selected emoji

    if (emojiId === myReaction) {
      await retractReaction({ variables: { input: { postId } } });
      setSelectedEmoji(null);
    } else if (myReaction) {
      await changeReaction({
        variables: { input: { postId, type: emojiId } },
        refetchQueries: ['Post'],
      });
      setSelectedEmoji(emojiId);
    } else {
      await reactToPost({
        variables: { input: { postId, type: emojiId } },
        refetchQueries: ['Post'],
      });
      setSelectedEmoji(emojiId);
    }

    setOpened(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span onClick={() => setOpened(!opened)} style={{ cursor: 'pointer', fontSize: '1.5rem' }}>
        {selectedEmoji || '😊'}
      </span>

      {opened && (
        <div style={{ position: 'absolute', zIndex: 1000 }}>
          <Picker onEmojiSelect={handleSelect} />
        </div>
      )}
    </div>
  );
};
