import { apolloClient, createApolloClient } from 'lib/apollo'
import { GetUserPlaylistsDocument, PlaylistDocument, ProfileDocument, TracksDocument } from 'lib/graphql'
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
