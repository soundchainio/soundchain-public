import { TrackQuery, useToggleFavoriteMutation, useTrackLazyQuery } from 'lib/graphql'
import { useRouter } from 'next/router'
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { errorHandler } from 'utils/errorHandler'
import { useMe } from './useMe'

interface TrackContextData {
  isFavoriteTrack: boolean | null
  isFetchingTrack: boolean
  setFavoriteTrack: (isFavorite: boolean) => void
  track?: TrackQuery['track']
  toggleFavorite: any
}

const TrackContext = createContext<TrackContextData>({} as TrackContextData)

interface TrackProviderProps {
  children: ReactNode
}

export function TrackProvider({ children }: TrackProviderProps) {
  const [isFavoriteTrack, setIsFavoriteTrack] = useState<boolean | null>(null)
  const [isFetchingTrack, setIsFetchingTrack] = useState(false)

  const router = useRouter()
  const me = useMe()
  
  const [toggleFavorite] = useToggleFavoriteMutation()
  
  const [trackQuery, { data: trackData }] = useTrackLazyQuery()

  const setFavoriteTrack = useCallback(async (state: boolean) => {
    if (!me) return router.push('/login')
    if (!trackData) return

    setIsFavoriteTrack(state)
    await toggleFavorite({ variables: { trackId: trackData.track.id }, refetchQueries: ['FavoriteTracks'] })

  }, [me, router, toggleFavorite, trackData])

  useEffect(() => {
    if (!trackData) return

    setIsFavoriteTrack(trackData.track.isFavorite)
  }, [trackData])

  useEffect(() => {
    if (!router.query.id) return;

    const fetchTrack = async () => {
      try {
          setIsFetchingTrack(true)
          await trackQuery({ 
          variables: {
              id: router.query.id as string,
          },
      })
      } catch (error) {
        errorHandler(error)
      } finally {
        setIsFetchingTrack(false)
      }
    }

    fetchTrack()

  }, [router.query.id, trackQuery])

  return (
    <TrackContext.Provider
      value={{
        isFavoriteTrack,
        setFavoriteTrack,
        isFetchingTrack,
        track: trackData?.track,
        toggleFavorite

      }}
    >
      {children}
    </TrackContext.Provider>
  )
}

export const useTrackContext = () => useContext(TrackContext)
