import { usePostQuery } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import { Avatar } from './Avatar';
import { PostActions } from './PostActions';
import { PostStats } from './PostStats';
import { Timestamp } from './Timestamp';

interface PostProps {
  postId: string;
}

const generateRandomNumber = () => {
  return Math.round(Math.random() * 100);
};

export const Post = ({ postId }: PostProps) => {
  const { loading, error, data } = usePostQuery({ variables: { id: postId }, fetchPolicy: 'cache-first' });
  const post = data?.post;

  return (
    <>
      {post && (
        <div>
          <NextLink href={`/posts/${post.id}`}>
            <div className="p-4 bg-gray-20">
              <div className="flex items-center">
                <Avatar />
                <p className="ml-4 text-lg font-bold text-gray-100">{post.profile.displayName}</p>
                <Timestamp datetime={post.createdAt} className="flex-1 text-right" />
              </div>
              <div className="mt-4 text-gray-100">{post.body}</div>
              <PostStats
                likes={generateRandomNumber()}
                comments={generateRandomNumber()}
                reposts={generateRandomNumber()}
              />
            </div>
          </NextLink>
          <PostActions />
        </div>
      )}
    </>
  );
};
