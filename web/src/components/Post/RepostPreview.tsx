import { useState } from 'react'
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
  const [mediaLoaded, setMediaLoaded] = useState(false)

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
              const mediaType = IdentifySource(post.mediaLink).type
              const mediaUrl = post.mediaLink.replace(/^http:/, 'https:')

              // Platform-specific embed heights
              const embedHeight = mediaType === MediaProvider.BANDCAMP ? '470px' :
                                 mediaType === MediaProvider.SPOTIFY ? '352px' :
                                 mediaType === MediaProvider.SOUNDCLOUD ? '166px' : '315px'

              // Use ReactPlayer for YouTube/Vimeo with thumbnail support
              if (hasLazyLoadWithThumbnailSupport(post.mediaLink)) {
                return (
                  <div className="relative w-full aspect-video mt-4 rounded-lg overflow-hidden">
                    <ReactPlayer
                      width="100%"
                      height="100%"
                      url={post.mediaLink}
                      playsinline
                      controls
                      light={true}
                      pip
                      config={{
                        youtube: { playerVars: { modestbranding: 1, rel: 0, playsinline: 1 } },
                        vimeo: { playerOptions: { responsive: true, playsinline: true } },
                      }}
                    />
                  </div>
                )
              }

              // Use iframe for audio platforms (Spotify, SoundCloud, Bandcamp)
              return (
                <div className="relative w-full mt-4 rounded-lg overflow-hidden" style={{ minHeight: embedHeight }}>
                  {!mediaLoaded && (
                    <div className="absolute inset-0 bg-neutral-800 animate-pulse flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <iframe
                    className={`w-full transition-opacity duration-300 ${mediaLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ height: embedHeight, border: 'none' }}
                    src={mediaUrl}
                    title="Media embed"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    onLoad={() => setMediaLoaded(true)}
                  />
                </div>
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
