import classNames from 'classnames';
import { InfiniteLoader } from 'components/InfiniteLoader';
import { Track2 } from 'components/Track2';
import { TrackSkeleton } from 'components/TrackSkeleton';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { SortOrder, SortTrackField, useTracksQuery } from 'lib/graphql';
import React from 'react';

type Song = {
  src: string;
  title?: string | null;
  trackId: string;
  artist?: string | null;
  art?: string | null;
};

interface TracksProps extends React.ComponentPropsWithoutRef<'div'> {
  profileId?: string;
  pageSize?: number;
}

export const Tracks = ({ className, profileId, pageSize = 10 }: TracksProps) => {
  const { playlistState } = useAudioPlayerContext();

  const { data, fetchMore } = useTracksQuery({
    variables: {
      filter: { profileId: profileId as string },
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      page: { first: pageSize },
    },
  });

  if (!data) {
    return (
      <div className="space-y-3">
        <TrackSkeleton />
        <TrackSkeleton />
        <TrackSkeleton />
      </div>
    );
  }

  const { nodes, pageInfo } = data.tracks;

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: pageInfo.endCursor,
        },
      },
    });
  };

  const handleOnPlayClicked = (song: Song, index: number) => {
    const list = nodes.map(
      node => ({ trackId: node.id, src: node.playbackUrl, art: node.artworkUrl, title: node.title } as Song),
    );
    playlistState(list, index);
  };

  return (
    <ol className={classNames('space-y-5', className)}>
      {nodes.map(({ id }, index) => (
        // <div key={id} className="p-4 bg-gray-20 break-words">
        //   <Track key={id} trackId={id} />
        // </div>
        <Track2
          key={id}
          index={index + 1}
          trackId={id}
          handleOnPlayClicked={song => handleOnPlayClicked(song, index)}
        />
      ))}
      {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Tracks" />}
    </ol>
  );
};
