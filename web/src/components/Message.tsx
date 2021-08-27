import { useMessageQuery } from 'lib/graphql';
import NextLink from 'next/link';
import { Avatar } from './Avatar';
import { CommentSkeleton } from './CommentSkeleton';
import { Timestamp } from './Timestamp';

interface CommentProps {
  messageId: string;
}

export const Message = ({ messageId }: CommentProps) => {
  const { data } = useMessageQuery({ variables: { id: messageId } });
  const message = data?.message;

  if (!message) return <CommentSkeleton />;

  return (
    <div className="flex flex-row space-x-3">
      <Avatar src={message.profile.profilePicture} className="mt-4" />
      <div className="flex-1 py-4 px-4 bg-gray-20 rounded-xl">
        <div className="flex justify-between items-center mb-1">
          <NextLink href={`/profiles/${message.profile.id}`}>
            <a className="text-white font-semibold">{message.profile.displayName}</a>
          </NextLink>
          <Timestamp datetime={message.createdAt} />
        </div>
        <pre className="text-white font-thin tracking-wide text-sm whitespace-pre-wrap">{message.message}</pre>
      </div>
    </div>
  );
};
