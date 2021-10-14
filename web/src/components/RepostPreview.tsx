import { RefreshIcon } from '@heroicons/react/solid';
import { usePostQuery } from 'lib/graphql';
import React from 'react';
import { AudioPlayer } from './AudioPlayer';
import { Avatar } from './Avatar';
import { RepostPreviewSkeleton } from './RepostPreviewSkeleton';
import { Timestamp } from './Timestamp';

interface RepostPreviewProps {
  postId: string;
}

export const RepostPreview = ({ postId }: RepostPreviewProps) => {
  const { data } = usePostQuery({ variables: { id: postId } });
  const post = data?.post;

  if (!post) return <RepostPreviewSkeleton />;

  return (
    <div className=" bg-gray-20 my-4">
      <div className="flex items-center font-bold bg-gray-20 text-gray-400 text-sm">
        <RefreshIcon className="h-4 w-4 mr-1" /> Repost
      </div>
      <div className="p-4 break-words bg-gray-30 rounded-lg mb-2">
        <div className="flex items-center">
          <Avatar profile={post.profile} />
          <a className="ml-4 text-lg font-bold text-gray-100">{post.profile.displayName}</a>
          <Timestamp datetime={post.createdAt} className="flex-1 text-right text-gray-60" />
        </div>
        <pre className="mt-4 text-gray-100 break-words whitespace-pre-wrap">{post.body}</pre>
        {post.mediaLink && (
          <iframe frameBorder="0" className="mt-4 w-full bg-gray-20" allowFullScreen src={post.mediaLink} />
        )}
        {post.track && (
          <AudioPlayer
            trackId={post.track.id}
            src={post.track.playbackUrl}
            title={post.track.title}
            artist={post.track.artist}
          />
        )}
      </div>
    </div>
  );
};
