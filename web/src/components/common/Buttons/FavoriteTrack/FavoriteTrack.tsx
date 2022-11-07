import { SpinAnimation } from 'components/common/SpinAnimation'
import { useTrackContext } from 'hooks/useTrack'
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai'

export const FavoriteTrack = () => {
  const { isFavoriteTrack, setFavoriteTrack, isFetchingTrack } = useTrackContext()

  if (isFetchingTrack) return <SpinAnimation />

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
