import { usePostQuery } from 'lib/graphql';
import NextLink from 'next/link';
import React, { useEffect, useState } from 'react';
import { getNormalizedLink, hasLink } from '../utils/NormalizeEmbedLinks';
import { Avatar } from './Avatar';
import { Label } from './Label';
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
  const { data } = usePostQuery({ variables: { id: postId } });
  const post = data?.post;
  const [postLink, setPostLink] = useState('');

  useEffect(() => {
    if (!post) return;

    const extractEmbedLink = async () => {
      const link = await getNormalizedLink(post?.body);
      setPostLink(link || '');
    };

    if (post.body.length && hasLink(post.body)) {
      extractEmbedLink();
    } else {
      setPostLink('');
    }
  }, [post]);

  if (!post) return <Label>Loading</Label>;

  return (
    <div>
      <NextLink href={`/posts/${post.id}`}>
        <div className="p-4 bg-gray-20 break-words">
          <div className="flex items-center">
            <Avatar src={post.profile.profilePicture} />
            <NextLink href={`/profiles/${post.profile.id}`}>
              <a className="ml-4 text-lg font-bold text-gray-100">{post.profile.displayName}</a>
            </NextLink>
            <Timestamp datetime={post.createdAt} className="flex-1 text-right" />
          </div>
          <div className="mt-4 text-gray-100 break-words">{post.body}</div>
          {postLink && <iframe frameBorder="0" className="mt-4 w-full bg-gray-20" allowFullScreen src={postLink} />}
          <PostStats likes={generateRandomNumber()} comments={post.commentCount} reposts={generateRandomNumber()} />
        </div>
      </NextLink>
      <PostActions postId={postId} />
    </div>
  );
};
