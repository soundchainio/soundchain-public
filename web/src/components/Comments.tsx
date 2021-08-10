import { useCommentsQuery } from 'lib/graphql';
import { Comment } from './Comment';

interface CommentsProps {
  postId: string;
}

export const Comments = ({ postId }: CommentsProps) => {
  const { data, loading, error } = useCommentsQuery({ variables: { postId } });

  return (
    <div className="flex flex-col m-6 space-y-6">
      <h3 className="font-thin text-white">Comments</h3>
      {data?.comments.map(({ id }) => (
        <Comment key={id} commentId={id} />
      ))}
    </div>
  );
};
