import { usePlaylistContext } from 'hooks/usePlaylistContext'
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai'

export const FavoritePlaylistButton = () => {
  const { isFavoritePlaylist, setFavoritePlaylist, setLikeCount } = usePlaylistContext()

  return (
    <>
      {isFavoritePlaylist ? (
        <AiFillHeart
          size={25}
          color="white"
          className="hover:cursor-pointer"
          onClick={() => {
            setFavoritePlaylist(false)
            setLikeCount(likeCount => likeCount - 1)
          }}
        />
      ) : (
        <AiOutlineHeart
          size={25}
          color="white"
          className="hover:cursor-pointer"
          onClick={() => {
            setFavoritePlaylist(true)
            setLikeCount(likeCount => likeCount + 1)
          }}
        />
      )}
    </>
  )
}
