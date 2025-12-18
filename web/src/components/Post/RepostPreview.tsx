import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { Track, usePostQuery } from 'lib/graphql'
import { MediaProvider } from 'types/MediaProvider'
import { IdentifySource } from 'utils/NormalizeEmbedLinks'
import { Avatar } from '../Avatar'
import { DisplayName } from '../DisplayName'
import { EmoteRenderer } from '../EmoteRenderer'
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
            {post.mediaLink && (() => {
              const mediaSource = IdentifySource(post.mediaLink)
              const mediaType = mediaSource.type
              const mediaUrl = post.mediaLink.replace(/^http:/, 'https:')

              // Platform name and icon
              const platformName = mediaType === MediaProvider.BANDCAMP ? 'Bandcamp' :
                                  mediaType === MediaProvider.SPOTIFY ? 'Spotify' :
                                  mediaType === MediaProvider.SOUNDCLOUD ? 'SoundCloud' :
                                  mediaType === MediaProvider.YOUTUBE ? 'YouTube' :
                                  mediaType === MediaProvider.VIMEO ? 'Vimeo' :
                                  mediaType === MediaProvider.INSTAGRAM ? 'Instagram' :
                                  mediaType === MediaProvider.TIKTOK ? 'TikTok' :
                                  mediaType === MediaProvider.X ? 'X' :
                                  mediaType === MediaProvider.TWITCH ? 'Twitch' :
                                  mediaType === MediaProvider.DISCORD ? 'Discord' : 'Link'
              const platformIcon = mediaType === MediaProvider.BANDCAMP ? '💿' :
                                  mediaType === MediaProvider.SPOTIFY ? '🎵' :
                                  mediaType === MediaProvider.SOUNDCLOUD ? '☁️' :
                                  mediaType === MediaProvider.YOUTUBE ? '▶️' :
                                  mediaType === MediaProvider.VIMEO ? '🎬' :
                                  mediaType === MediaProvider.INSTAGRAM ? '📸' :
                                  mediaType === MediaProvider.TIKTOK ? '🎭' :
                                  mediaType === MediaProvider.X ? '𝕏' :
                                  mediaType === MediaProvider.TWITCH ? '🎮' :
                                  mediaType === MediaProvider.DISCORD ? '💬' : '🔗'

              // Show link card for all platforms
              return (
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 block p-4 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platformIcon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold">Open on {platformName}</p>
                      <p className="text-neutral-400 text-sm truncate">{mediaUrl}</p>
                    </div>
                    <span className="text-cyan-400">→</span>
                  </div>
                </a>
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
