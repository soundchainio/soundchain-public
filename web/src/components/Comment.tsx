import { useCommentQuery } from 'lib/graphql';

interface CommentProps {
  commentId: string;
}

export const Comment = ({ commentId }: CommentProps) => {
  const { data, loading, error } = useCommentQuery({ variables: { id: commentId } });
  console.log(commentId);
  return <div className="flex flex-col">{data && data.comment.body}</div>;
};
