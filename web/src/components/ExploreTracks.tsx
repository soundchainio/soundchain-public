import { Song, TrackListItem } from 'components/TrackListItem';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { PageInput, useExploreTracksQuery } from 'lib/graphql';
import React from 'react';
import { InfiniteLoader } from './InfiniteLoader';
import { NoResultFound } from './NoResultFound';
import { TrackListItemSkeleton } from './TrackListItemSkeleton';

interface ExplorePageProps {
  searchTerm?: string;
}

const pageSize = 15;

export const ExploreTracks = ({ searchTerm }: ExplorePageProps) => {
  const firstPage: PageInput = { first: pageSize };
  const { data, loading, fetchMore } = useExploreTracksQuery({
    variables: { search: searchTerm, page: firstPage },
    fetchPolicy: 'network-only',
  });
  const { playlistState } = useAudioPlayerContext();

  const handleOnPlayClicked = (song: Song, index: number) => {
    if (tracks) {
      const list = tracks.map(
        track =>
          ({
            trackId: track.id,
            src: track.playbackUrl,
            art: track.artworkUrl,
            title: track.title,
            artist: track.artist,
          } as Song),
      );
      playlistState(list, index);
    }
  };

  if (loading) {
    return (
      <>
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
      </>
    );
  }

  if (!data) {
    return <NoResultFound type="tracks" />;
  }

  const { nodes: tracks, pageInfo } = data?.exploreTracks;

  const loadNext = () => {
    fetchMore({
      variables: {
        search: searchTerm,
        page: {
          first: pageSize,
          after: pageInfo.endCursor,
          inclusive: false,
        },
      },
    });
  };

  return (
    <div className="bg-gray-10">
      {tracks.length > 0 ? (
        tracks?.map((track, index) => (
          <div key={track.id} className="text-white">
            <TrackListItem
              song={{
                trackId: track.id,
                src: track.playbackUrl,
                art: track.artworkUrl,
                title: track.title,
                artist: track.artist,
                playbackCount: track.playbackCountFormatted,
                isFavorite: track.isFavorite,
              }}
              index={index + 1}
              handleOnPlayClicked={song => handleOnPlayClicked(song, index)}
            />
          </div>
        ))
      ) : (
        <NoResultFound type="Tracks" />
      )}
      {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadNext} loadingMessage="Loading Tracks" />}
    </div>
  );
};
