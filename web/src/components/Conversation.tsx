import { useConversationQuery } from 'lib/graphql';
import { CommentSkeleton } from './CommentSkeleton';
import { Message } from './Message';

interface ConversationProps {
  profileId: string;
}

export const Conversation = ({ profileId }: ConversationProps) => {
  const { data } = useConversationQuery({ variables: { profileId } });
  const conversation = data?.conversation.nodes;

  if (!conversation) return <CommentSkeleton />;

  return (
    <div className="flex flex-col m-4 space-y-4">
      <h3 className="font-thin text-white">Messages</h3>
      {data?.conversation.nodes.map(({ id }) => (
        <Message key={id} messageId={id} />
      ))}
    </div>
  );
};
