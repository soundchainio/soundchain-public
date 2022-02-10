import { NotAvailableMessage } from 'components/NotAvailableMessage';
import { useModalDispatch } from 'contexts/providers/modal';
import { useMe } from 'hooks/useMe';
import { Ellipsis } from 'icons/Ellipsis';
import { Role, useCommentQuery } from 'lib/graphql';
import NextLink from 'next/link';
import { AuthorActionsType } from 'types/AuthorActionsType';
import { Avatar } from './Avatar';
import { CommentSkeleton } from './CommentSkeleton';
import { DisplayName } from './DisplayName';
import { Timestamp } from './Timestamp';

interface CommentProps {
  commentId: string;
}

export const Comment = ({ commentId }: CommentProps) => {
  const { data } = useCommentQuery({ variables: { id: commentId } });
  const me = useMe();
  const { dispatchShowAuthorActionsModal } = useModalDispatch();
  const comment = data?.comment;
  const isAuthor = comment?.profile.id == me?.profile.id;
  const canEdit = isAuthor || me?.roles?.includes(Role.Admin) || me?.roles?.includes(Role.TeamMember);

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
      <div className="flex-1 py-4 px-4 bg-gray-20 rounded-xl min-w-0">
        <div className="flex items-center min-w-0">
          <div className="flex-1 flex flex-col min-w-0">
            <NextLink href={`/profiles/${comment.profile.userHandle}`}>
              <DisplayName
                name={comment.profile.displayName}
                verified={comment.profile.verified}
                teamMember={comment.profile.teamMember}
              />
            </NextLink>
            <Timestamp className="flex-1" datetime={comment.createdAt} />
          </div>
          <div className="w-9">
            {canEdit && <Ellipsis className="pr-2 pl-2 w-full h-3 cursor-pointer" onClick={onEllipsisClick} />}
          </div>
        </div>
        <pre className="text-white font-thin tracking-wide text-sm whitespace-pre-wrap mt-1 break-words">
          {comment.body}
        </pre>
      </div>
    </div>
  );
};
