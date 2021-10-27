import { Button } from 'components/Button';
import { NoResultFound } from 'components/NoResultFound';
import { ProfileListItem } from 'components/ProfileListItem';
import { Subtitle } from 'components/Subtitle';
import { Song, TrackListItem } from 'components/TrackListItem';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { useExploreQuery } from 'lib/graphql';
import React from 'react';
import { ExploreTab } from 'types/ExploreTabType';

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
    <div>
      <div className="flex items-center w-full p-4">
        <div className="flex flex-1 items-center text-white font-bold">
          <Subtitle className="font-bold"> Users </Subtitle>
          <span className="ml-2">({data?.explore.totalProfiles})</span>
        </div>
        <Button className="text-gray-300" onClick={() => setSelectedTab(ExploreTab.USERS)} variant="clear">
          VIEW ALL
        </Button>
      </div>
      {data && data?.explore.totalProfiles > 0 ? profiles?.map(profile => (
        <div key={profile.id} className="text-white">
          <ProfileListItem profileId={profile.id} />
        </div>
      )) : <NoResultFound type="Users" />}
      <div className="flex items-center w-full p-4">
        <div className="flex flex-1 items-center text-white font-bold">
          <Subtitle className="font-bold"> Tracks  </Subtitle>
          <span className="ml-2">({data?.explore.totalTracks})</span>
        </div>
        <Button className="text-gray-300" onClick={() => setSelectedTab(ExploreTab.TRACKS)} variant="clear">
          VIEW ALL
        </Button>
      </div>
      {data && data.explore.totalTracks > 0 ? tracks?.map((track, index) => (
        <div key={track.id} className="text-white">
          <TrackListItem trackId={track.id} index={index + 1} handleOnPlayClicked={song => handleOnPlayClicked(song, index)} />
        </div>
      )) : <NoResultFound type="Tracks" />}
    </div>
  );
};
