import { Song, TrackListItem } from 'components/TrackListItem';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { PageInput, useExploreTracksQuery } from 'lib/graphql';
import React from 'react';
import { InfiniteLoader } from './InfiniteLoader';
import { NoResultFound } from './NoResultFound';

interface ExplorePageProps {
  searchTerm?: string;
}

const pageSize = 15;

export const ExploreTracks = ({ searchTerm }: ExplorePageProps) => {
  const firstPage: PageInput = { first: pageSize };
  const { data, loading, fetchMore } = useExploreTracksQuery({
    variables: { search: searchTerm, page: firstPage },
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

  if (!data) return null;

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

  if (loading) return <div> loading... </div>;

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
