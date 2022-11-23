import { apolloClient } from "lib/apollo";
import { PlaylistDocument, ProfileDocument, TracksDocument } from "lib/graphql";
import { GetPlaylistDataParams, GetPlaylistDataReturn, GetPlaylistTracksDataParams, GetPlaylistTracksDataReturn, getProfileDataParams, getProfileDataReturn } from "./playlist.types";

export const getPlaylistData = async (params: GetPlaylistDataParams)  => {
    const { playlistId, context } = params

    const playlistData: GetPlaylistDataReturn = await apolloClient.query({
        query: PlaylistDocument,
        variables: { id: playlistId },
        context,
    })

    return playlistData
}

export const getPlaylistTracksData = async (params: GetPlaylistTracksDataParams)  => {
    const { trackEditionIds, context } = params

    if (!trackEditionIds || trackEditionIds.length === 0) return null

    const playlistTracksData: GetPlaylistTracksDataReturn = await apolloClient.query({
        query: TracksDocument,
        variables: { filter: { trackEditionIds }  },
        context,
    })

    return playlistTracksData
}

export const getProfileData = async (params: getProfileDataParams)  => {
    const { profileId, context } = params

    if (!profileId) return
    
    const profileData: getProfileDataReturn = await apolloClient.query({
        query: ProfileDocument,
        variables: { id: profileId},
        context,
      })

    return profileData
}