import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { Track, usePostQuery } from 'lib/graphql'
import { MediaProvider } from 'types/MediaProvider'
import { IdentifySource } from 'utils/NormalizeEmbedLinks'
import { Avatar } from '../Avatar'
import { DisplayName } from '../DisplayName'
import { MiniAudioPlayer } from '../MiniAudioPlayer'
import { NotAvailableMessage } from '../NotAvailableMessage'
import { RepostPreviewSkeleton } from '../RepostPreviewSkeleton'
import { Timestamp } from '../Timestamp'

interface RepostPreviewProps {
  postId: string
  handleOnPlayClicked?: (trackId: string) => void
}

export const RepostPreview = ({ postId, handleOnPlayClicked = () => null }: RepostPreviewProps) => {
  const { data } = usePostQuery({ variables: { id: postId } })
  const post = data?.post

  if (!post) return <RepostPreviewSkeleton />

  return (
    <div className=" my-4 bg-gray-20">
      <div className="flex items-center bg-gray-20 text-sm font-bold text-gray-400">
        <ArrowPathIcon className="mr-1 h-4 w-4" /> Repost
      </div>
      <div className="mb-2 break-words rounded-lg bg-gray-30 p-4">
        {post.deleted ? (
          <NotAvailableMessage type="post" />
        ) : (
          <>
            <div className="flex items-center">
              <Avatar className="mr-4" profile={post.profile} />
              <DisplayName
                name={post.profile.displayName}
                verified={post.profile.verified}
                teamMember={post.profile.teamMember}
                badges={post.profile.badges}
              />
              <Timestamp datetime={post.createdAt} className="flex-1 text-right text-gray-60" />
            </div>
            <pre className="mt-4 whitespace-pre-wrap break-words text-gray-100">{post.body}</pre>
            {post.mediaLink && (() => {
              const mediaSource = IdentifySource(post.mediaLink)
              const mediaType = mediaSource.type
              let enhancedUrl = post.mediaLink

              // Platform-specific enhancements
              if (mediaType === MediaProvider.YOUTUBE) {
                const url = new URL(enhancedUrl)
                url.searchParams.set('iv_load_policy', '3')
                url.searchParams.set('modestbranding', '1')
                url.searchParams.set('rel', '0')
                enhancedUrl = url.toString()

                return (
                  <iframe
                    frameBorder="0"
                    className="mt-4 w-full bg-gray-20 aspect-video"
                    allowFullScreen
                    src={enhancedUrl}
                    title="Media preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  />
                )
              }

              if (mediaType === MediaProvider.VIMEO) {
                const url = new URL(enhancedUrl)
                url.searchParams.set('autopause', '0')
                enhancedUrl = url.toString()

                return (
                  <iframe
                    frameBorder="0"
                    className="mt-4 w-full bg-gray-20 aspect-video"
                    allowFullScreen
                    src={enhancedUrl}
                    title="Media preview"
                    allow="autoplay; fullscreen; picture-in-picture"
                  />
                )
              }

              if (mediaType === MediaProvider.INSTAGRAM) {
                return (
                  <iframe
                    frameBorder="0"
                    className="mt-4 w-full bg-gray-20 h-[80vh] max-h-[700px] md:h-[700px]"
                    allowFullScreen
                    scrolling="no"
                    src={enhancedUrl}
                    title="Media preview"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  />
                )
              }

              if (mediaType === MediaProvider.TIKTOK) {
                return (
                  <iframe
                    frameBorder="0"
                    className="mt-4 w-full bg-gray-20 h-[80vh] max-h-[650px] md:h-[650px]"
                    allowFullScreen
                    scrolling="no"
                    src={enhancedUrl}
                    title="Media preview"
                    allow="autoplay; encrypted-media; accelerometer; gyroscope"
                  />
                )
              }

              if (mediaType === MediaProvider.X) {
                return (
                  <iframe
                    frameBorder="0"
                    className="mt-4 w-full bg-gray-20 h-[70vh] max-h-[700px] md:h-[700px]"
                    allowFullScreen
                    scrolling="no"
                    src={enhancedUrl}
                    title="Media preview"
                  />
                )
              }

              if (mediaType === MediaProvider.BANDCAMP) {
                return (
                  <iframe
                    frameBorder="0"
                    className="mt-4 w-full bg-gray-20 h-[80vh] max-h-[700px] md:h-[600px]"
                    allowFullScreen
                    seamless
                    src={enhancedUrl}
                    title="Media preview"
                  />
                )
              }

              if (mediaType === MediaProvider.TWITCH) {
                return (
                  <iframe
                    frameBorder="0"
                    className="mt-4 w-full bg-gray-20 aspect-video"
                    allowFullScreen
                    src={enhancedUrl}
                    title="Media preview"
                    allow="autoplay; fullscreen; picture-in-picture"
                  />
                )
              }

              if (mediaType === MediaProvider.DISCORD) {
                return (
                  <iframe
                    frameBorder="0"
                    className="mt-4 w-full bg-gray-20 h-[500px] md:h-[600px]"
                    src={enhancedUrl}
                    title="Media preview"
                    sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                  />
                )
              }

              // Default iframe for SoundCloud, Spotify, Custom HTML
              return (
                <iframe
                  frameBorder="0"
                  className="mt-4 w-full bg-gray-20 aspect-video"
                  allowFullScreen
                  src={enhancedUrl}
                  title="Media preview"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                />
              )
            })()}
            {post.track && !post.track.deleted && (
              <MiniAudioPlayer
                song={{
                  src: post.track.playbackUrl,
                  trackId: post.track.id,
                  art: post.track.artworkUrl,
                  title: post.track.title,
                  artist: post.track.artist,
                  isFavorite: post.track.isFavorite,
                  playbackCount: post.track.playbackCountFormatted,
                  favoriteCount: post.track.favoriteCount,
                  saleType: post.track.saleType,
                  price: post.track.price,
                }}
                handleOnPlayClicked={() => handleOnPlayClicked((post.track as Track).id)}
              />
            )}
            {post.track?.deleted && <NotAvailableMessage type="track" />}
          </>
        )}
      </div>
    </div>
  )
}
