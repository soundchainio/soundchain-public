import { GetServerSideProps } from "next/types"
import tw from "tailwind-styled-components"
import { PageInfo, Playlist, PlaylistDocument, PlaylistTrack, Track, TracksDocument } from "../../lib/graphql"
import { cacheFor, createApolloClient } from "../../lib/apollo"
import { ApolloQueryResult } from "@apollo/client"

interface PlaylistTracks<T> {
  tracks: T
}
export interface PaginateResult<T> {
  pageInfo: PageInfo;
  nodes: T[];
}

export interface Play<T> {
  playlist: T;
}

export interface Tracks<T> {
  tracks: T;
}

export const getServerSideProps: GetServerSideProps = async context => {
  const playlistId = context.params?.id

  if (!playlistId) return { notFound: true }

  const apolloClient = createApolloClient(context)

  const playlist: ApolloQueryResult<Play<Tracks<PaginateResult<PlaylistTrack>>>> = await apolloClient.query({
    query: PlaylistDocument,
    variables: { id: playlistId },
    context,
  })

  const ids = playlist.data.playlist.tracks.nodes.map(track => track.trackEditionId)

  const playlistTracks: ApolloQueryResult<PlaylistTracks<PaginateResult<Track>>> = await apolloClient.query({
    query: TracksDocument,
    variables: { filter: { trackEditionIds: ids }  },
    context,
  })

  return cacheFor(PlaylistPage, { playlist, playlistTracks }, context, apolloClient)
}
export interface PlaylistPageProps {
  playlist: ApolloQueryResult<Play<Tracks<PaginateResult<PlaylistTrack>>>>
  playlistTracks: ApolloQueryResult<PlaylistTracks<PaginateResult<Track>>>
}

export default function PlaylistPage({ playlist, playlistTracks }: PlaylistPageProps) {
  return (
    <Container data-testid="playlist-container">
      <h1 className="tet-white">hi</h1>
    </Container>
  )
}

const Container = tw.div``