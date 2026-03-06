/**
 * Agent MUSIC — Beat Matching, Playlist Curation, Stem Splitting
 * In-browser music intelligence. Analyze, curate, compose.
 * Powered by OGUN.
 *
 * ZERO BOOLEANS — all state uses typed string enums.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// ─── Enums ───────────────────────────────────────────────────────────

export const MUSIC_MODE = {
  LISTENING: 'LISTENING',
  CURATING: 'CURATING',
  ANALYZING: 'ANALYZING',
  COMPOSING: 'COMPOSING',
  IDLE: 'IDLE',
} as const
export type MusicMode = typeof MUSIC_MODE[keyof typeof MUSIC_MODE]

export const CURATION_STYLE = {
  VIBE: 'VIBE',
  GENRE: 'GENRE',
  BPM: 'BPM',
  MOOD: 'MOOD',
  ARTIST: 'ARTIST',
  DISCOVERY: 'DISCOVERY',
} as const
export type CurationStyle = typeof CURATION_STYLE[keyof typeof CURATION_STYLE]

export const STEM_KIND = {
  VOCALS: 'VOCALS',
  DRUMS: 'DRUMS',
  BASS: 'BASS',
  MELODY: 'MELODY',
  OTHER: 'OTHER',
} as const
export type StemKind = typeof STEM_KIND[keyof typeof STEM_KIND]

export const ANALYSIS_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
} as const
export type AnalysisStatus = typeof ANALYSIS_STATUS[keyof typeof ANALYSIS_STATUS]

// ─── Types ───────────────────────────────────────────────────────────

export interface TrackAnalysis {
  trackId: string
  bpm: number
  key: string
  energy: number
  mood: string
  status: AnalysisStatus
}

export interface CuratedPlaylist {
  id: string
  name: string
  style: CurationStyle
  trackIds: string[]
  createdAt: number
}

interface AgentMusicContextValue {
  mode: MusicMode
  setMode: (mode: MusicMode) => void
  currentAnalysis: TrackAnalysis | null
  playlists: CuratedPlaylist[]
  createPlaylist: (name: string, style: CurationStyle) => string
  addToPlaylist: (playlistId: string, trackId: string) => void
  analyzeTrack: (trackId: string) => void
}

// ─── Context ─────────────────────────────────────────────────────────

const AgentMusicContext = createContext<AgentMusicContextValue>({
  mode: MUSIC_MODE.IDLE,
  setMode: () => {},
  currentAnalysis: null,
  playlists: [],
  createPlaylist: () => '',
  addToPlaylist: () => {},
  analyzeTrack: () => {},
})

export const useAgentMusic = () => useContext(AgentMusicContext)

// ─── Provider ────────────────────────────────────────────────────────

export function AgentMusicProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<MusicMode>(MUSIC_MODE.IDLE)
  const [currentAnalysis, setCurrentAnalysis] = useState<TrackAnalysis | null>(null)
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([])

  const createPlaylist = useCallback((name: string, style: CurationStyle): string => {
    const id = 'pl_' + Math.random().toString(36).slice(2, 10)
    const playlist: CuratedPlaylist = { id, name, style, trackIds: [], createdAt: Date.now() }
    setPlaylists((prev) => [...prev, playlist])
    return id
  }, [])

  const addToPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId ? { ...p, trackIds: [...p.trackIds, trackId] } : p
      )
    )
  }, [])

  const analyzeTrack = useCallback((trackId: string) => {
    setCurrentAnalysis({
      trackId,
      bpm: 0,
      key: '',
      energy: 0,
      mood: '',
      status: ANALYSIS_STATUS.PENDING,
    })
    setMode(MUSIC_MODE.ANALYZING)
  }, [])

  return (
    <AgentMusicContext.Provider
      value={{ mode, setMode, currentAnalysis, playlists, createPlaylist, addToPlaylist, analyzeTrack }}
    >
      {children}
    </AgentMusicContext.Provider>
  )
}
