import { useCommentQuery } from 'lib/graphql';
import NextLink from 'next/link';
import { Avatar } from './Avatar';
import { CommentSkeleton } from './CommentSkeleton';
import { Timestamp } from './Timestamp';

interface CommentProps {
  commentId: string;
}

export const Comment = ({ commentId }: CommentProps) => {
  const { data } = useCommentQuery({ variables: { id: commentId } });
  const comment = data?.comment;

  if (!comment) return <CommentSkeleton />;

  return (
    <div className="flex flex-row space-x-3">
      <Avatar pic={comment.profile.profilePicture} className="mt-4" />
      <div className="flex-1 py-4 px-4 bg-gray-20 rounded-xl">
        <div className="flex justify-between items-center mb-1">
          <NextLink href={`/profiles/${comment.profile.id}`}>
            <a className="text-white font-semibold">{comment.profile.displayName}</a>
          </NextLink>
          <Timestamp datetime={comment.createdAt} />
        </div>
        <p className="text-white font-thin tracking-wide text-sm">{comment.body}</p>
      </div>
    </div>
  );
};
