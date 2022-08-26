import { NoResultFound } from 'components/NoResultFound'
import { ProfileListItem } from 'components/ProfileListItem'
import { Subtitle } from 'components/Subtitle'
import { Song, TrackListItem } from 'components/TrackListItem'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { RightArrow } from 'icons/RightArrow'
import { useExploreQuery } from 'lib/graphql'
import React from 'react'
import { ExploreTab } from 'types/ExploreTabType'
import { ExploreTopTracksBanner } from './ExploreTopTracksBanner'
import { ProfileListItemSkeleton } from './ProfileListItemSkeleton'
import { TrackListItemSkeleton } from './TrackListItemSkeleton'

interface ExplorePageProps {
  searchTerm?: string
  setSelectedTab: (tab: ExploreTab) => void
}

export const ExploreAll = ({ searchTerm, setSelectedTab }: ExplorePageProps) => {
  const { data, loading } = useExploreQuery({ variables: { search: searchTerm }, fetchPolicy: 'network-only' })
  const profiles = data?.explore.profiles
  const tracks = data?.explore.tracks
  const { playlistState } = useAudioPlayerContext()

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
      )
      playlistState(list, index)
    }
  }

  return (
    <div className="h-[calc(100%-96px)] overflow-auto bg-gray-10">
      <div className="px-4 py-6">
        <ExploreTopTracksBanner />
      </div>
      <div className="flex w-full items-center px-4">
        <div className="flex flex-1 items-center text-sm font-bold text-white">
          <Subtitle size="sm" className="font-bold">
            {`Users (${data?.explore.totalProfiles || '0'})`}
          </Subtitle>
        </div>
        <button
          className="flex items-center gap-2 text-xs font-extrabold text-gray-80"
          onClick={() => setSelectedTab(ExploreTab.USERS)}
        >
          VIEW ALL
          <RightArrow width={6} height={10} />
        </button>
      </div>
      {loading && (
        <div className="m-4">
          <ProfileListItemSkeleton />
          <ProfileListItemSkeleton />
          <ProfileListItemSkeleton />
        </div>
      )}
      {data && !loading && data?.explore.totalProfiles > 0 ? (
        <div className="space-y-3 px-2 py-3 md:px-5">
          {profiles?.map(profile => (
            <div key={profile.id} className="text-white">
              <ProfileListItem profile={profile} />
            </div>
          ))}
        </div>
      ) : (
        <>{!loading && <NoResultFound type="Users" />}</>
      )}
      <div className="flex w-full items-center px-4 py-2">
        <div className="flex flex-1 items-center font-bold text-white">
          <Subtitle size="sm" className="font-bold">
            {`Tracks (${data?.explore.totalTracks || '0'})`}
          </Subtitle>
        </div>
        <button
          className="flex items-center gap-2 text-xs font-extrabold text-gray-80"
          onClick={() => setSelectedTab(ExploreTab.TRACKS)}
        >
          VIEW ALL
          <RightArrow width={6} height={10} />
        </button>
      </div>
      {loading && (
        <>
          <TrackListItemSkeleton />
          <TrackListItemSkeleton />
          <TrackListItemSkeleton />
        </>
      )}
      {data && !loading && data.explore.totalTracks > 0 ? (
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
                isFavorite: track.isFavorite,
              }}
              index={index + 1}
              handleOnPlayClicked={song => handleOnPlayClicked(song, index)}
            />
          ))}
        </div>
      ) : (
        <>{!loading && <NoResultFound type="Tracks" />} </>
      )}
    </div>
  )
}
