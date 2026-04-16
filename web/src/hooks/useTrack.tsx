import { TrackQuery, useTrackLazyQuery } from 'lib/graphql-hooks'
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
  
  // Favorite — Vercel direct (Phase 6d)
  const toggleFavorite = useCallback(async ({ variables }: { variables: { trackId: string } }) => {
    const r = await fetch('/api/tracks/favorite', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId: variables.trackId }),
    })
    return r.ok ? r.json() : null
  }, [])

  const [trackQuery, { data: trackData }] = useTrackLazyQuery()

  const setFavoriteTrack = useCallback(async (state: boolean) => {
    if (!me) return router.push('/login')
    if (!trackData) return

    setIsFavoriteTrack(state)
    await toggleFavorite({ variables: { trackId: trackData.track.id } })

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
