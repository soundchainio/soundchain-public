import { useCommentsQuery } from 'lib/graphql';
import { Comment } from './Comment';
import { Subtitle } from './Subtitle';

interface CommentsProps {
  postId: string;
}

export const Comments = ({ postId }: CommentsProps) => {
  const { data, loading, error } = useCommentsQuery({ variables: { postId } });

  return (
    <div className="flex flex-col">
      <Subtitle>Comments</Subtitle>
      {data?.comments.map(({ id }) => (
        <Comment key={id} commentId={id} />
      ))}
    </div>
  );
};
