import { Post } from 'components/Post';
import { usePostsQuery } from 'lib/graphql';
import React from 'react';
import { PostSkeleton } from './PostSkeleton';

interface FeedProps extends React.ComponentPropsWithoutRef<'div'> {
  profileId: string;
}

export const Feed = ({ profileId }: FeedProps) => {
  const { data } = usePostsQuery({ variables: { filter: profileId ? { profileId } : undefined } });

  if (!data) {
    return <PostSkeleton />;
  }

  return (
    <div className="space-y-3">
      {data.posts.nodes.map(({ id }) => (
        <Post key={id} postId={id} />
      ))}
    </div>
  );
};
