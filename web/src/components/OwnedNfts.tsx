import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { SortOrder, SortTrackField, useTracksQuery } from 'lib/graphql';
import React from 'react';
import { InfiniteLoader } from './InfiniteLoader';
import { Song, TrackListItem } from './TrackListItem';
import { TrackListItemSkeleton } from './TrackListItemSkeleton';

interface OwnedNftsProps {
  owner: string;
}

export const OwnedNfts = ({ owner }: OwnedNftsProps) => {
  console.log(owner);

  const { playlistState } = useAudioPlayerContext();

  const pageSize = 10;
  const { data, fetchMore } = useTracksQuery({
    variables: {
      filter: { nftData: { owner } },
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      page: { first: pageSize },
    },
  });

  if (!data) {
    return (
      <div className="space-y-2">
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
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
      node =>
        ({
          trackId: node.id,
          src: node.playbackUrl,
          art: node.artworkUrl,
          title: node.title,
          artist: node.artist,
          isFavorite: node.isFavorite,
        } as Song),
    );
    playlistState(list, index);
  };

  return (
    <ol className={'space-y-1'}>
      {nodes.map((song, index) => (
        <TrackListItem
          key={song.id}
          index={index + 1}
          song={{
            trackId: song.id,
            src: song.playbackUrl,
            art: song.artworkUrl,
            title: song.title,
            artist: song.artist,
            playbackCount: song.playbackCountFormatted,
          }}
          handleOnPlayClicked={song => handleOnPlayClicked(song, index)}
        />
      ))}
      {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Tracks" />}
    </ol>
  );
};
