import { NoResultFound } from 'components/NoResultFound';
import { ProfileListItem } from 'components/ProfileListItem';
import { Subtitle } from 'components/Subtitle';
import { Song, TrackListItem } from 'components/TrackListItem';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { RightArrow } from 'icons/RightArrow';
import { useExploreQuery } from 'lib/graphql';
import React from 'react';
import { ExploreTab } from 'types/ExploreTabType';
import { ExploreTopTracksBanner } from './ExploreTopTracksBanner';

interface ExplorePageProps {
  searchTerm?: string;
  setSelectedTab: (tab: ExploreTab) => void;
}

export const ExploreAll = ({ searchTerm, setSelectedTab }: ExplorePageProps) => {
  const { data, loading } = useExploreQuery({ variables: { search: searchTerm } });
  const profiles = data?.explore.profiles;
  const tracks = data?.explore.tracks;
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

  if (loading) return <div> loading... </div>;

  return (
    <div className="bg-gray-10">
      <div className="px-4 py-6">
        <ExploreTopTracksBanner />
      </div>
      <div className="flex items-center w-full px-4">
        <div className="flex flex-1 items-center text-white font-bold text-sm">
          <Subtitle size="sm" className="font-bold">
            {`Users (${data?.explore.totalProfiles})`}
          </Subtitle>
        </div>
        <button
          className="text-gray-80 font-extrabold text-xs flex gap-2 items-center"
          onClick={() => setSelectedTab(ExploreTab.USERS)}
        >
          VIEW ALL
          <RightArrow width={6} height={10} />
        </button>
      </div>
      {data && data?.explore.totalProfiles > 0 ? (
        <div className="px-5 py-3 space-y-3">
          {profiles?.map(profile => (
            <div key={profile.id} className="text-white">
              <ProfileListItem profile={profile} />
            </div>
          ))}
        </div>
      ) : (
        <NoResultFound type="Users" />
      )}
      <div className="flex items-center w-full px-4 py-2">
        <div className="flex flex-1 items-center text-white font-bold">
          <Subtitle size="sm" className="font-bold">
            {`Tracks (${data?.explore.totalTracks})`}
          </Subtitle>
        </div>
        <button
          className="text-gray-80 font-extrabold text-xs flex gap-2 items-center"
          onClick={() => setSelectedTab(ExploreTab.TRACKS)}
        >
          VIEW ALL
          <RightArrow width={6} height={10} />
        </button>
      </div>
      {data && data.explore.totalTracks > 0 ? (
        <div className="py-3">
          {tracks?.map((track, index) => (
            <TrackListItem
              key={track.id}
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
          ))}
        </div>
      ) : (
        <NoResultFound type="Tracks" />
      )}
    </div>
  );
};
