import { useMe } from 'hooks/useMe';
import { HeartBorder } from 'icons/HeartBorder';
import { HeartFull } from 'icons/HeartFull';
import { ReactionEmoji } from 'icons/ReactionEmoji';
import { useGetOriginalPostFromTrackQuery, useToggleFavoriteMutation } from 'lib/graphql';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

interface ViewPostProps {
  trackId: string;
  isFavorited: boolean;
}

export const ViewPost = ({ trackId, isFavorited }: ViewPostProps) => {
  const me = useMe();
  const router = useRouter();
  const [toggleFavorite] = useToggleFavoriteMutation();
  const [isFavorite, setIsFavorite] = useState(isFavorited);

  const { data: originalPostData } = useGetOriginalPostFromTrackQuery({
    variables: {
      trackId: trackId,
    },
    skip: !trackId,
  });
  const post = originalPostData?.getOriginalPostFromTrack;

  const handleFavorite = async () => {
    if (me?.profile.id) {
      await toggleFavorite({ variables: { trackId }, refetchQueries: ['FavoriteTracks'] });
      setIsFavorite(!isFavorite);
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="flex justify-between gap-2">
      {post && !post.deleted ? (
        <NextLink href={`/posts/${post.id}`}>
          <a className="flex items-center gap-3">
            <div className="rounded border-2 border-blue-400 bg-blue-700 bg-opacity-50 px-4 py-1 text-sm font-bold text-white">
              View Post
            </div>
            <p className="flex items-center gap-1 text-sm text-gray-400">
              <span className="flex items-center gap-1 font-bold text-white">
                {post.topReactions.map(name => (
                  <ReactionEmoji key={name} name={name} className="h-4 w-4" />
                ))}
                {post.totalReactions}
              </span>{' '}
              reactions
            </p>
            <p className="text-sm text-gray-400">
              <span className="font-bold text-white">{post.commentCount}</span> comments
            </p>
          </a>
        </NextLink>
      ) : (
        <p className="text-gray-80">Original post does not exist.</p>
      )}
      <button aria-label="Favorite" className="flex items-center" onClick={handleFavorite}>
        {isFavorite && <HeartFull />}
        {!isFavorite && <HeartBorder />}
      </button>
    </div>
  );
};
