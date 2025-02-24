import { useState } from 'react';
import Picker from '@emoji-mart/react';
import { NotAvailableMessage } from 'components/NotAvailableMessage';
import { useModalDispatch } from 'contexts/providers/modal';
import { useMe } from 'hooks/useMe';
import { Ellipsis } from 'icons/Ellipsis';
import { Role, useCommentQuery } from 'lib/graphql';
import NextLink from 'next/link';
import { AuthorActionsType } from 'types/AuthorActionsType';
import { Avatar } from '../Avatar';
import { CommentSkeleton } from './CommentSkeleton';
import { DisplayName } from '../DisplayName';
import { Timestamp } from '../Timestamp';

interface CommentProps {
  commentId: string;
}

export const Comment = ({ commentId }: CommentProps) => {
  const { data } = useCommentQuery({ variables: { id: commentId } });
  const me = useMe();
  const { dispatchShowAuthorActionsModal } = useModalDispatch();
  const comment = data?.comment;
  const isAuthor = comment?.profile.id === me?.profile.id;
  const canEdit = isAuthor || me?.roles?.includes(Role.Admin) || me?.roles?.includes(Role.TeamMember);

  // 🔥 New Emoji Picker Logic
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const handleEmojiSelect = (emoji: any) => {
    setSelectedEmoji(emoji.native);
    setIsPickerOpen(false);
  };

  const onEllipsisClick = () => {
    dispatchShowAuthorActionsModal(true, AuthorActionsType.COMMENT, commentId, !isAuthor);
  };

  if (!comment) return <CommentSkeleton />;

  if (data?.comment.deleted) {
    return <NotAvailableMessage type="comment" />;
  }

  return (
    <div className="flex flex-row space-x-3">
      <Avatar profile={comment.profile} className="mt-4" />
      <div className="min-w-0 flex-1 rounded-xl bg-gray-20 py-4 px-4">
        <div className="flex min-w-0 items-center">
          <div className="flex min-w-0 flex-1 flex-col">
            <NextLink href={`/profiles/${comment.profile.userHandle}`}>
              <DisplayName
                name={comment.profile.displayName}
                verified={comment.profile.verified}
                teamMember={comment.profile.teamMember}
                badges={comment.profile.badges}
              />
            </NextLink>
            <Timestamp className="flex-1" datetime={comment.createdAt} />
          </div>
          <div className="w-9">
            {canEdit && <Ellipsis className="h-3 w-full cursor-pointer pr-2 pl-2" onClick={onEllipsisClick} />}
          </div>
        </div>
        <pre className="mt-1 whitespace-pre-wrap break-words text-sm font-thin tracking-wide text-white">
          {comment.body}
        </pre>

        {/* 🔥 Emoji Picker UI (Added Below the Comment) */}
        <div className="mt-2 flex space-x-2">
          <span
            style={{ cursor: 'pointer', fontSize: '1.5rem' }}
            onClick={() => setIsPickerOpen(!isPickerOpen)}
          >
            {selectedEmoji || '😊'}
          </span>
          {isPickerOpen && <Picker onEmojiSelect={handleEmojiSelect} />}
        </div>
      </div>
    </div>
  );
};
