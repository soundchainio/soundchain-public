import { Message as MessageItem, useConversationQuery } from 'lib/graphql';
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
    <div className="flex flex-col m-3 space-y-4">
      {data?.conversation.nodes.map(({ id }, index) => (
        <Message key={id} messageId={id} nextMessage={data?.conversation.nodes[index + 1] as MessageItem} />
      ))}
    </div>
  );
};
