import { RefreshIcon } from '@heroicons/react/solid';
import { PostComponentFieldsFragment } from 'lib/graphql';
import React from 'react';
import { Avatar } from './Avatar';
import { Timestamp } from './Timestamp';

interface RepostPreviewProps {
  post: PostComponentFieldsFragment;
}

export const RepostPreview = ({ post }: RepostPreviewProps) => {
  return (
    <div className=" bg-gray-20">
      <div className="flex items-center font-bold bg-gray-20 text-gray-400 text-sm mx-4">
        <RefreshIcon className="h-4 w-4 mr-1" /> Repost
      </div>
      <div className="p-4 break-words bg-gray-30 rounded-lg mx-4 mb-2">
        <div className="flex items-center">
          <Avatar src={post.profile.profilePicture} />
          <a className="ml-4 text-lg font-bold text-gray-100">{post.profile.displayName}</a>
          <Timestamp datetime={post.createdAt} className="flex-1 text-right text-gray-60" />
        </div>
        <div className="mt-4 text-gray-100 break-words">{post.body}</div>
        {post.mediaLink && (
          <iframe frameBorder="0" className="mt-4 w-full bg-gray-20" allowFullScreen src={post.mediaLink} />
        )}
      </div>
    </div>
  );
};
