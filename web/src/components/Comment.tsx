import { useCommentQuery } from 'lib/graphql';
import { Avatar } from './Avatar';
import { Timestamp } from './Timestamp';

interface CommentProps {
  commentId: string;
}

export const Comment = ({ commentId }: CommentProps) => {
  const { data, loading, error } = useCommentQuery({ variables: { id: commentId } });
  const comment = data?.comment;

  if (!comment) return <div>Loading</div>;

  return (
    <div className="flex flex-row space-x-3">
      <Avatar className="mt-4" />
      <div className="flex-1 py-4 px-4 bg-gray-20 rounded-xl">
        <div className="flex justify-between items-center mb-1">
          <div className="text-white font-semibold">{comment.profile.displayName}</div>
          <Timestamp datetime={comment.createdAt} />
        </div>
        <p className="text-white font-thin tracking-wide text-sm">{comment.body}</p>
      </div>
    </div>
  );
};
