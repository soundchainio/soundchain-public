import { useCommentsQuery } from 'lib/graphql';
import { Comment } from './Comment';
import { CommentSkeleton } from './CommentSkeleton';

interface CommentsProps {
  postId: string;
}

export const Comments = ({ postId }: CommentsProps) => {
  const { data } = useCommentsQuery({ variables: { postId } });
  const comments = data?.comments;

  if (!comments) return <CommentSkeleton />;

  return (
    <div className="flex flex-col m-6 space-y-6">
      <h3 className="font-thin text-white">Comments</h3>
      {data?.comments.map(({ id }) => (
        <Comment key={id} commentId={id} />
      ))}
    </div>
  );
};
