import { memo } from 'react'
import { PostQuery, Track } from 'lib/graphql'
import Link from 'next/link'
import { Avatar } from '../Avatar'
import { Play, Heart, MessageCircle, Share2 } from 'lucide-react'

interface CompactPostProps {
  post: PostQuery['post']
  handleOnPlayClicked: (trackId: string) => void
}

const CompactPostComponent = ({ post, handleOnPlayClicked }: CompactPostProps) => {
  if (!post || post.deleted) return null

  const hasTrack = post.track && !post.track.deleted
  const hasMedia = post.mediaLink || hasTrack

  // Get the thumbnail image
  const thumbnailUrl = hasTrack
    ? post.track?.artworkUrl
    : post.mediaLink?.includes('youtube')
    ? `https://img.youtube.com/vi/${post.mediaLink.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\n?#]+)/)?.[1] || ''}/mqdefault.jpg`
    : null

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden h-full flex flex-col hover:border-neutral-700 transition-colors group">
      {/* Media/Thumbnail Section */}
      {hasMedia && (
        <div className="relative aspect-square bg-neutral-800 overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={hasTrack ? post.track?.title || 'Track' : 'Media'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-900/20 to-purple-900/20">
              <Play className="w-8 h-8 text-neutral-500" />
            </div>
          )}

          {/* Play overlay for tracks */}
          {hasTrack && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleOnPlayClicked((post.track as Track).id)
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center">
                <Play className="w-5 h-5 text-black ml-0.5" />
              </div>
            </button>
          )}

          {/* Track info overlay */}
          {hasTrack && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p className="text-white text-xs font-semibold truncate">{post.track?.title}</p>
              <p className="text-neutral-400 text-[10px] truncate">{post.track?.artist}</p>
            </div>
          )}
        </div>
      )}

      {/* Text-only posts get body preview */}
      {!hasMedia && post.body && (
        <div className="p-3 flex-1 bg-gradient-to-br from-cyan-900/10 to-purple-900/10">
          <p className="text-sm text-neutral-200 line-clamp-4">{post.body}</p>
        </div>
      )}

      {/* Footer */}
      <div className="p-2 border-t border-neutral-800 flex items-center justify-between">
        <Link href={`/profiles/${post.profile.userHandle}`} className="flex items-center gap-1.5 min-w-0">
          <Avatar profile={post.profile} pixels={20} />
          <span className="text-[10px] text-neutral-400 truncate">{post.profile.displayName}</span>
        </Link>
        <div className="flex items-center gap-2 text-neutral-500">
          {(post.totalReactions || 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px]">
              <Heart className="w-3 h-3" /> {post.totalReactions}
            </span>
          )}
          {(post.commentCount || 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px]">
              <MessageCircle className="w-3 h-3" /> {post.commentCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export const CompactPost = memo(CompactPostComponent, (prev, next) => {
  return prev.post?.id === next.post?.id &&
         prev.post?.totalReactions === next.post?.totalReactions
})
