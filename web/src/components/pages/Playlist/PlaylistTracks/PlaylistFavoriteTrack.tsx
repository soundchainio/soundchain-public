import { useMe } from 'hooks/useMe'
import { Track, useToggleFavoriteMutation } from 'lib/graphql'
import { useRouter } from 'next/router'
import { useState } from 'react'

import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai'
import { errorHandler } from 'utils/errorHandler'

interface PlaylistFavoriteTrackProps {
  track: Track
}
export const PlaylistFavoriteTrack = (props: PlaylistFavoriteTrackProps) => {
  const { track } = props

  const [toggleFavorite] = useToggleFavoriteMutation()
  const router = useRouter()
  const me = useMe()

  const [isFavoriteTrack, setIsFavoriteTrack] = useState<boolean>(track.isFavorite)

  const setFavoriteTrack = async (state: boolean) => {
    if (!me) return router.push('/login')

    setIsFavoriteTrack(state)
    try {
      await toggleFavorite({ variables: { trackId: track.id } })
    } catch (error) {
      errorHandler(error)
    }
  }

  return (
    <>
      {isFavoriteTrack ? (
        <AiFillHeart size={25} color="white" className="hover:cursor-pointer" onClick={() => setFavoriteTrack(false)} />
      ) : (
        <AiOutlineHeart
          size={25}
          color="white"
          className="hover:cursor-pointer"
          onClick={() => setFavoriteTrack(true)}
        />
      )}
    </>
  )
}
