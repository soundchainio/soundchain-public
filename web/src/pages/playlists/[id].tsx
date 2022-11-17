import { GetServerSideProps } from "next/types"
import tw from "tailwind-styled-components"
import { PageInfo, Playlist, PlaylistDocument, Track, TracksDocument } from "../../lib/graphql"
import { cacheFor, createApolloClient } from "../../lib/apollo"
import { ApolloQueryResult } from "@apollo/client"

interface PlaylistTracks<T> {
  tracks: T
}
export interface PaginateResult<T> {
  pageInfo: PageInfo;
  nodes: T[];
}

export const getServerSideProps: GetServerSideProps = async context => {
  const playlistId = context.params?.id

  if (!playlistId) return { notFound: true }

  const apolloClient = createApolloClient(context)

  const playlist: ApolloQueryResult<Playlist> = await apolloClient.query({
    query: PlaylistDocument,
    variables: { id: playlistId },
    context,
  })

  const playlistTracks: ApolloQueryResult<PlaylistTracks<PaginateResult<Track>>> = await apolloClient.query({
    query: TracksDocument,
    variables: { filter: {trackEditionId: '636ed67843ead0084c1d22df'}  },
    context,
  })

  return cacheFor(PlaylistPage, { playlist, playlistTracks}, context, apolloClient)
}
export interface PlaylistPageProps {
  playlist: ApolloQueryResult<Playlist>
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