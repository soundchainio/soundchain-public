import { GetServerSidePropsContext, PreviewData } from "next";
import { ParsedUrlQuery } from 'querystring'
import { Playlist, Profile, Track } from "lib/graphql";
import { ApolloQueryResult } from "@apollo/client";
import { PaginateResult } from "pages/playlists/[playlistId]";

export interface GetPlaylistDataParams {
    context: GetServerSidePropsContext<ParsedUrlQuery, PreviewData>
    playlistId: string
}

export type GetPlaylistDataReturn = ApolloQueryResult<{playlist: Playlist}>

export interface GetPlaylistTracksDataParams {
    context: GetServerSidePropsContext<ParsedUrlQuery, PreviewData>
    trackEditionIds?: string[]
}

export type GetPlaylistTracksDataReturn = ApolloQueryResult<{tracks: PaginateResult<Track>}>

export interface getProfileDataParams {
    context: GetServerSidePropsContext<ParsedUrlQuery, PreviewData>
    profileId: string
}

export type getProfileDataReturn = ApolloQueryResult<{profile: Profile}>