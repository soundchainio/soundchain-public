import { apolloClient, createApolloClient } from 'lib/apollo'
import {
  CreatePlaylistDocument,
  CreatePlaylistTracksDocument,
  DeletePlaylistTracksDocument,
  GetPlaylistTracksDocument,
  GetUserPlaylistsDocument,
  PlaylistDocument,
  PlaylistTrack,
  ProfileDocument,
  TracksDocument,
} from 'lib/graphql'
import { GetServerSidePropsContext, PreviewData } from 'next'
import { ParsedUrlQuery } from 'querystring'
import { Playlist, Profile, Track } from 'lib/graphql'
import { ApolloQueryResult } from '@apollo/client'
import { PaginateResult } from 'pages/playlists/[playlistId]'
import { errorHandler } from 'utils/errorHandler'

export interface GetPlaylistDataParams {
  context: GetServerSidePropsContext<ParsedUrlQuery, PreviewData>
  playlistId: string
}

export type GetPlaylistDataReturn = ApolloQueryResult<{ playlist: Playlist }>

export const getPlaylistData = async (params: GetPlaylistDataParams) => {
  try {
    const { playlistId, context } = params

    const apolloClient = createApolloClient(context)

    const playlistData: GetPlaylistDataReturn = await apolloClient.query({
      query: PlaylistDocument,
      variables: { id: playlistId },
      context,
    })

    return playlistData
  } catch (error) {
    errorHandler(error)
  }
}

export interface GetPlaylistTracksDataParams {
  context: GetServerSidePropsContext<ParsedUrlQuery, PreviewData>
  trackEditionIds?: string[]
}

export type GetPlaylistTracksDataReturn = ApolloQueryResult<{ tracks: PaginateResult<Track> }>

export const getPlaylistTracksData = async (params: GetPlaylistTracksDataParams) => {
  try {
    const { trackEditionIds, context } = params

    if (!trackEditionIds || trackEditionIds.length === 0) return null

    const apolloClient = createApolloClient(context)

    const playlistTracksData: GetPlaylistTracksDataReturn = await apolloClient.query({
      query: TracksDocument,
      variables: {
        filter: { trackEditionIds },
      },
      context,
      fetchPolicy: 'no-cache',
    })

    return playlistTracksData
  } catch (error) {
    errorHandler(error)
  }
}

export interface getProfileDataParams {
  context: GetServerSidePropsContext<ParsedUrlQuery, PreviewData>
  profileId: string
}

export type getProfileDataReturn = ApolloQueryResult<{ profile: Profile }>

export const getProfileData = async (params: getProfileDataParams) => {
  try {
    const { profileId, context } = params

    if (!profileId) return

    const apolloClient = createApolloClient(context)
    const profileData: getProfileDataReturn = await apolloClient.query({
      query: ProfileDocument,
      variables: { id: profileId },
      context,
    })

    return profileData
  } catch (error) {
    errorHandler(error)
  }
}

export type getUserPlaylistsReturn = ApolloQueryResult<{
  getUserPlaylists: PaginateResult<Playlist>
}>

export const getUserPlaylists = async () => {
  try {
    const userPlaylists: getUserPlaylistsReturn = await apolloClient.query({
      query: GetUserPlaylistsDocument,
      variables: {
        page: {
          first: 10,
        },
        sort: {
          field: 'CREATED_AT',
          order: 'DESC',
        },
      },
    })

    return userPlaylists
  } catch (error) {
    errorHandler(error)
  }
}

export interface GetPlaylistTracksParams {
  playlistId: string
  trackEditionId: string
}

export type GetPlaylistTracksReturn = ApolloQueryResult<{ getPlaylistTracks: PlaylistTrack[] }>

export const getPlaylistTracks = async (params: GetPlaylistTracksParams) => {
  try {
    const { playlistId, trackEditionId } = params

    const playlistTracks: GetPlaylistTracksReturn = await apolloClient.query({
      query: GetPlaylistTracksDocument,
      variables: { input: { playlistId, trackEditionId } },
    })

    return playlistTracks.data.getPlaylistTracks
  } catch (error) {
    errorHandler(error)
  }
}

export interface RemoveTrackFromPlaylistParams {
  playlistId: string
  trackEditionIds: string[]
}

export const removeTrackFromPlaylist = async (params: RemoveTrackFromPlaylistParams) => {
  try {
    const { playlistId, trackEditionIds } = params

    const removedTrack = await apolloClient.mutate({
      mutation: DeletePlaylistTracksDocument,
      variables: { input: { playlistId, trackEditionIds: trackEditionIds } },
    })

    return removedTrack.data
  } catch (error) {
    errorHandler(error)
  }
}

export interface CreatePlaylistTracksParams {
  playlistId: string
  trackEditionIds: string[]
}

export const createPlaylistTracks = async (params: CreatePlaylistTracksParams) => {
  try {
    const { playlistId, trackEditionIds } = params

    const playlistTracks = await apolloClient.mutate({
      mutation: CreatePlaylistTracksDocument,
      variables: { input: { playlistId, trackEditionIds: trackEditionIds } },
    })

    return playlistTracks.data.createPlaylistTracks.playlist
  } catch (error) {
    errorHandler(error)
  }
}

export interface CreatePlaylistParams {
  title: string
  description: string
  artworkUrl: string
  trackEditionIds?: string[]
}

export const createPlaylist = async (params: CreatePlaylistParams) => {
  try {
    const { title, description, trackEditionIds, artworkUrl } = params

    const playlistData = await apolloClient.mutate({
      mutation: CreatePlaylistDocument,
      variables: { input: { title, description, artworkUrl, trackEditionIds } },
    })

    return playlistData.data.createPlaylist.playlist
  } catch (error) {
    errorHandler(error)
  }
}
