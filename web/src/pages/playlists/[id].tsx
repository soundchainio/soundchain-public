import { GetServerSideProps } from "next/types"
import tw from "tailwind-styled-components"
import { Playlist, PlaylistDocument } from "../../lib/graphql"
import { cacheFor, createApolloClient } from "../../lib/apollo"

export const getServerSideProps: GetServerSideProps = async context => {
  const playlistId = context.params?.id

  if (!playlistId) return { notFound: true }

  const apolloClient = createApolloClient(context)

  const { data } = await apolloClient.query({
    query: PlaylistDocument,
    variables: { id: playlistId },
    context,
  })

  return cacheFor(PlaylistPage, { playlist: data.playlist }, context, apolloClient)
}

export interface PlaylistPageProps {
  playlist: Playlist
}

export default function PlaylistPage({playlist}: PlaylistPageProps) {

  console.log(playlist)
  return (
    <Container data-testid="playlist-container">
      <h1 className="tet-white">hi</h1>
    </Container>
  )
}

const Container = tw.div``