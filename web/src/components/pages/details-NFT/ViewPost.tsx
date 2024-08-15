import { useEffect, useState } from 'react'

import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { useMe } from 'hooks/useMe'
import { HeartBorder } from 'icons/HeartBorder'
import { HeartFull } from 'icons/HeartFull'
import { ReactionEmoji } from 'icons/ReactionEmoji'
import { useGetOriginalPostFromTrackQuery, useToggleFavoriteMutation } from 'lib/graphql'
import NextLink from 'next/link'
import { useRouter } from 'next/router'

interface ViewPostProps {
  trackId: string
  isFavorited: boolean
}

export const ViewPost = ({ trackId, isFavorited }: ViewPostProps) => {
  const me = useMe()
  const { currentSong, isFavorite: isSongOnPlayerFavorite, setPlayerFavorite } = useAudioPlayerContext()
  const router = useRouter()
  const [toggleFavorite] = useToggleFavoriteMutation()
  const [isFavorite, setIsFavorite] = useState(isFavorited)

  const { data: originalPostData } = useGetOriginalPostFromTrackQuery({
    variables: {
      trackId: trackId,
    },
    skip: !trackId,
  })
  const post = originalPostData?.getOriginalPostFromTrack

  const handleFavorite = async () => {
    if (me?.profile.id) {
      await toggleFavorite({ variables: { trackId }, refetchQueries: ['FavoriteTracks'] })
      setIsFavorite(!isFavorite)
      if (currentSong?.trackId) setPlayerFavorite(!isFavorite)
    } else {
      router.push('/login')
    }
  }

  useEffect(() => {
    if (currentSong?.trackId && isSongOnPlayerFavorite !== isFavorite) {
      setIsFavorite(isSongOnPlayerFavorite as boolean)
    }
  }, [currentSong, isSongOnPlayerFavorite, isFavorite])

  return (
    <div className="flex justify-between gap-2">
      {post && !post.deleted ? (
        <NextLink href={`/posts/${post.id}`} className="flex items-center gap-3">
          <div className="rounded border-2 border-blue-400 bg-blue-700 bg-opacity-50 px-4 py-1 text-sm font-bold text-white">
            View Post
          </div>
          <p className="flex items-center gap-1 text-sm text-gray-400">
            <span className="flex items-center gap-1 font-bold text-white">
              {post.topReactions.map(name => (
                <ReactionEmoji key={name} name={name} className="h-4 w-4" />
              ))}
              {post.totalReactions}
            </span>{' '}
            reactions
          </p>
          <p className="text-sm text-gray-400">
            <span className="font-bold text-white">{post.commentCount}</span> comments
          </p>
        </NextLink>
      ) : (
        <p className="text-gray-80">Original post does not exist.</p>
      )}
      <button aria-label="Favorite" className="flex items-center" onClick={handleFavorite}>
        {isFavorite && <HeartFull />}
        {!isFavorite && <HeartBorder />}
      </button>
    </div>
  )
}
