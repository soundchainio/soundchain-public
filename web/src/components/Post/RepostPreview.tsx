import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { Track, usePostQuery } from 'lib/graphql'
import { MediaProvider } from 'types/MediaProvider'
import { hasLazyLoadWithThumbnailSupport, IdentifySource } from 'utils/NormalizeEmbedLinks'
import { Avatar } from '../Avatar'
import { DisplayName } from '../DisplayName'
import { EmoteRenderer } from '../EmoteRenderer'
import { MiniAudioPlayer } from '../MiniAudioPlayer'
import { NotAvailableMessage } from '../NotAvailableMessage'
import { RepostPreviewSkeleton } from '../RepostPreviewSkeleton'
import { Timestamp } from '../Timestamp'
import ReactPlayer from 'react-player'

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
              <Avatar className="mr-4" profile={post.profile || undefined} />
              <DisplayName
                name={post.profile?.displayName || 'Unknown'}
                verified={post.profile?.verified || false}
                teamMember={post.profile?.teamMember || false}
                badges={post.profile?.badges || null}
              />
              <Timestamp datetime={post.createdAt} className="flex-1 text-right text-gray-60" />
            </div>
            <pre className="mt-4 whitespace-pre-wrap break-words text-gray-100">
              <EmoteRenderer text={post.body || ''} />
            </pre>
            {/* Embedded media - Airtight responsive */}
            {post.mediaLink && (
              hasLazyLoadWithThumbnailSupport(post.mediaLink) ? (
                // YouTube, Vimeo, Facebook - responsive 16:9
                <div className="relative w-full mt-3" style={{ paddingTop: '56.25%' }}>
                  <ReactPlayer
                    width="100%"
                    height="100%"
                    style={{ position: 'absolute', top: 0, left: 0 }}
                    url={post.mediaLink}
                    playsinline
                    controls
                    light={true}
                    pip
                    config={{
                      youtube: { playerVars: { modestbranding: 1, rel: 0, playsinline: 1 } },
                      vimeo: { playerOptions: { responsive: true, playsinline: true } },
                      facebook: { appId: '' },
                    }}
                  />
                </div>
              ) : (
                // All other platforms - iframe embed (airtight)
                (() => {
                  const mediaType = IdentifySource(post.mediaLink).type
                  const mediaUrl = post.mediaLink.replace(/^http:/, 'https:')

                  // Platform-specific heights
                  const getEmbedHeight = () => {
                    switch (mediaType) {
                      // Audio platforms
                      case MediaProvider.BANDCAMP: return '470px'
                      case MediaProvider.SPOTIFY: return '352px'
                      case MediaProvider.SOUNDCLOUD: return '166px'
                      // Social platforms
                      case MediaProvider.INSTAGRAM: return '540px'
                      case MediaProvider.TIKTOK: return '600px'
                      case MediaProvider.X: return '350px'
                      case MediaProvider.TWITCH: return '300px'
                      case MediaProvider.DISCORD: return '350px'
                      case MediaProvider.CUSTOM_HTML: return '350px'
                      default: return '250px'
                    }
                  }
                  const embedHeight = getEmbedHeight()

                  return (
                    <iframe
                      frameBorder="0"
                      className="mt-3 w-full bg-black rounded-lg"
                      style={{ minHeight: embedHeight }}
                      src={mediaUrl}
                      title="Media"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  )
                })()
              )
            )}
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
