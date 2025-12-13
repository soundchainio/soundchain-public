import { BottomSheet } from 'components/BottomSheet'
import { Comments } from 'components/Comment/Comments'
import { InboxButton } from 'components/common/Buttons/InboxButton'
import { NewCommentForm } from 'components/NewCommentForm'
import { NotAvailableMessage } from 'components/NotAvailableMessage'
import { Post } from 'components/Post/Post'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { cacheFor, createApolloClient } from 'lib/apollo'
import { PostDocument, PostQuery, usePostQuery } from 'lib/graphql'
import { GetServerSideProps } from 'next'
import { ParsedUrlQuery } from 'querystring'
import { useEffect, useMemo } from 'react'

export interface PostPageProps {
  post: PostQuery['post']
}

interface PostPageParams extends ParsedUrlQuery {
  id: string
}

export const getServerSideProps: GetServerSideProps<PostPageProps, PostPageParams> = async context => {
  const postId = context.params?.id

  if (!postId) {
    return { notFound: true }
  }

  const apolloClient = createApolloClient(context)

  const { error, data } = await apolloClient.query({
    query: PostDocument,
    variables: { id: postId },
    context,
  })

  if (error) {
    return { notFound: true }
  }

  return cacheFor(PostPage, { post: data.post }, context, apolloClient)
}

export default function PostPage({ post }: PostPageProps) {
  const { data: repostData } = usePostQuery({ variables: { id: post.repostId || '' }, skip: !post.repostId })
  const { setTopNavBarProps } = useLayoutContext()
  const { playlistState } = useAudioPlayerContext()
  const me = useMe()

  const deleted = post.deleted

  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      rightButton: me ? <InboxButton showAlertItem={false} /> : undefined,
    }),
    [me],
  )

  const repost = repostData?.post
  const track = post.track || repost?.track

  const title = track ? `${track.title} - song by ${track.artist} | SoundChain` : `${post.profile?.displayName || 'Post'} | SoundChain`
  const description = track
    ? `${!post.body ? '' : `${post.body} - `}Listen to ${track.title} on SoundChain. ${track.artist}. ${
        track.album || 'Song'
      }. ${!track.releaseYear ? '' : `${track.releaseYear}.`}`
    : post.body || `Check out this post by ${post.profile?.displayName || 'a user'} on SoundChain`

  // Get best image for sharing - track artwork, YouTube thumbnail, or profile picture
  const getShareImage = () => {
    if (track?.artworkUrl) return track.artworkUrl
    // Extract YouTube thumbnail if it's a YouTube embed
    if (post.mediaLink) {
      const youtubeMatch = post.mediaLink.match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/)
      if (youtubeMatch && youtubeMatch[1]) {
        return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`
      }
    }
    // Fallback to profile picture
    return post.profile?.profilePicture || null
  }
  const shareImage = getShareImage()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps, topNavBarProps])

  const handleOnPlayClicked = () => {
    if (track) {
      playlistState(
        [
          {
            src: track.playbackUrl,
            trackId: track.id,
            art: track.artworkUrl,
            title: track.title,
            artist: track.artist,
            isFavorite: track.isFavorite,
          },
        ] as Song[],
        0,
      )
    }
  }

  return (
    <>
      <SEO title={title} canonicalUrl={`/posts/${post.id}/`} description={description} image={shareImage} />
      {deleted ? (
        <NotAvailableMessage type="post" />
      ) : (
        <div>
          <Post post={post} handleOnPlayClicked={handleOnPlayClicked} />
          <div className="pb-12">
            <Comments postId={post.id} />
          </div>
          <BottomSheet>
            <NewCommentForm postId={post.id} />
          </BottomSheet>
        </div>
      )}
    </>
  )
}
