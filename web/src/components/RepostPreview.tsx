import { RefreshIcon } from '@heroicons/react/solid';
import { usePostQuery } from 'lib/graphql';
import React from 'react';
import { Avatar } from './Avatar';
import { DisplayName } from './DisplayName';
import { MiniAudioPlayer } from './MiniAudioPlayer';
import { NotAvailableMessage } from './NotAvailableMessage';
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
        {post.deleted ? (
          <NotAvailableMessage type="post" />
        ) : (
          <>
            <div className="flex items-center">
              <Avatar className="mr-4" profile={post.profile} />
              <DisplayName name={post.profile.displayName} verified={post.profile.verified} />
              <Timestamp datetime={post.createdAt} className="flex-1 text-right text-gray-60" />
            </div>
            <pre className="mt-4 text-gray-100 break-words whitespace-pre-wrap">{post.body}</pre>
            {post.mediaLink && (
              <iframe frameBorder="0" className="mt-4 w-full bg-gray-20" allowFullScreen src={post.mediaLink} />
            )}
            {post.track && !post.track.deleted && (
              <MiniAudioPlayer
                song={{
                  src: post.track.playbackUrl,
                  trackId: post.track.id,
                  art: post.track.artworkUrl,
                  title: post.track.title,
                  artist: post.track.artist,
                  isFavorite: post.track.isFavorite,
                }}
              />
            )}
            {post.track?.deleted && <NotAvailableMessage type="track" />}
          </>
        )}
      </div>
    </div>
  );
};
