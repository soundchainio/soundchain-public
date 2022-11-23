import { ApolloQueryResult } from "@apollo/client";
import { PaginateResult } from "pages/playlists/[playlistId]";
import { Playlist, Profile, Track } from "../../../../lib/graphql";

export const mockPlaylist = {
  data: {
    playlist: {
      id: "any_id",
      title: "any_title",
      description: "any_description",
      artworkUrl: "any_artwork_url",
      profileId: "any_profileId",
      createdAt: "any_date",
      deleted: false,
      favoriteCount: 0,
      followCount: 0,
      isFavorite: false,
      isFollowed: false,
      tracks: {
          nodes: [
            {
              id: 'any_track_id',
              src: 'any_track_src',
              art: 'any_track_art',
              title: 'any_track_title',
              artist: 'any_track_artist',
              isFavorite: false,
            }
          ]

      }
    }
  },
} as unknown as ApolloQueryResult<{playlist: Playlist}>

export const mockPlaylistTracks = {
  data: {
    tracks: {
      nodes: [
        {
          id: 'any_track_id',
          src: 'any_track_src',
          art: 'any_track_art',
          title: 'any_track_title',
          artist: 'any_track_artist',
          isFavorite: false,
        }
      ]
    }
  },
} as unknown as ApolloQueryResult<{tracks: PaginateResult<Track>}>

export const mockProfile = {
  data: {
    profile: {
      id: "any_id",
      displayName: "any_displayName",
      profilePicture: "any_profilePicture",
      coverPicture: "any_coverPicture",
      socialMedias: "any_socialMedias",
      favoriteGenres: "any_favoriteGenres",
      musicianTypes: "any_musicianTypes",
      bio: "any_bio",
      followerCount: "any_followerCount",
      followingCount: "any_followingCount",
      unreadNotificationCount: "any_unreadNotificationCount",
      unreadMessageCount: "any_unreadMessageCount",
      verified: "any_verified",
      magicWalletAddress: "any_magicWalletAddress",
      badges: "any_badges",
      createdAt: "any_createdAt",
      updatedAt: "any_updatedAt",
      userHandle: "any_userHandle",
      teamMember: "any_teamMember",
      isFollowed: "any_isFollowed",
      isSubscriber: "any_isSubscriber",
    }
  }
} as unknown as ApolloQueryResult<{profile: Profile}>