import { usePostQuery } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';

interface PreviewPostNotificationProps {
  postId: string;
}

export const PreviewPostNotification = ({ postId }: PreviewPostNotificationProps) => {
  const { data } = usePostQuery({ variables: { id: postId } });
  const post = data?.post;

  if (!post) {
    return null;
  }

  return (
    <div className="w-full p-4 bg-gray-30 rounded-xl">
      <NextLink href={`/posts/${post.id}`}>
        <div>
          <pre className="text-gray-100 text-sm whitespace-pre-wrap">{post.body}</pre>
        </div>
      </NextLink>
      {post.mediaLink && (
        <iframe
          frameBorder="0"
          className="mt-4 w-full bg-gray-20"
          allowFullScreen
          src={post.mediaLink}
          title="Media preview"
        />
      )}
    </div>
  );
};
