/**
 * Agent ARCADE — Play Games, Leaderboards, Tournaments
 * The gaming layer. Play GAMER-built games, compete, earn OGUN.
 * Powered by OGUN.
 *
 * ZERO BOOLEANS — all state uses typed string enums.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// ─── Enums ───────────────────────────────────────────────────────────

export const ARCADE_MODE = {
  BROWSING: 'BROWSING',
  PLAYING: 'PLAYING',
  SPECTATING: 'SPECTATING',
  TOURNAMENT: 'TOURNAMENT',
  IDLE: 'IDLE',
} as const
export type ArcadeMode = typeof ARCADE_MODE[keyof typeof ARCADE_MODE]

export const GAME_SESSION_STATUS = {
  WAITING: 'WAITING',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
} as const
export type GameSessionStatus = typeof GAME_SESSION_STATUS[keyof typeof GAME_SESSION_STATUS]

export const LEADERBOARD_PERIOD = {
  ALL_TIME: 'ALL_TIME',
  MONTHLY: 'MONTHLY',
  WEEKLY: 'WEEKLY',
  DAILY: 'DAILY',
} as const
export type LeaderboardPeriod = typeof LEADERBOARD_PERIOD[keyof typeof LEADERBOARD_PERIOD]

export const REWARD_TYPE = {
  OGUN_PRIZE: 'OGUN_PRIZE',
  NFT_BADGE: 'NFT_BADGE',
  XP: 'XP',
  TITLE: 'TITLE',
} as const
export type RewardType = typeof REWARD_TYPE[keyof typeof REWARD_TYPE]

// ─── Types ───────────────────────────────────────────────────────────

export interface GameSession {
  id: string
  gameId: string
  playerId: string
  score: number
  status: GameSessionStatus
  startedAt: number
  endedAt?: number
  ogunEarned: number
}

export interface LeaderboardEntry {
  rank: number
  playerId: string
  playerName: string
  score: number
  gamesPlayed: number
  ogunEarned: number
}

export interface Tournament {
  id: string
  name: string
  gameId: string
  entryFeeOgun: number
  prizePoolOgun: number
  maxPlayers: number
  currentPlayers: number
  startAt: number
  endAt: number
}

interface AgentArcadeContextValue {
  mode: ArcadeMode
  setMode: (mode: ArcadeMode) => void
  activeSession: GameSession | null
  startSession: (gameId: string, playerId: string) => string
  endSession: (score: number) => void
  totalOgunEarned: number
  gamesPlayed: number
}

// ─── Context ─────────────────────────────────────────────────────────

const AgentArcadeContext = createContext<AgentArcadeContextValue>({
  mode: ARCADE_MODE.IDLE,
  setMode: () => {},
  activeSession: null,
  startSession: () => '',
  endSession: () => {},
  totalOgunEarned: 0,
  gamesPlayed: 0,
})

export const useAgentArcade = () => useContext(AgentArcadeContext)

// ─── Provider ────────────────────────────────────────────────────────

export function AgentArcadeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ArcadeMode>(ARCADE_MODE.IDLE)
  const [activeSession, setActiveSession] = useState<GameSession | null>(null)
  const [totalOgunEarned, setTotalOgunEarned] = useState(0)
  const [gamesPlayed, setGamesPlayed] = useState(0)

  const startSession = useCallback((gameId: string, playerId: string): string => {
    const id = 'gs_' + Math.random().toString(36).slice(2, 10)
    const session: GameSession = {
      id,
      gameId,
      playerId,
      score: 0,
      status: GAME_SESSION_STATUS.ACTIVE,
      startedAt: Date.now(),
      ogunEarned: 0,
    }
    setActiveSession(session)
    setMode(ARCADE_MODE.PLAYING)
    return id
  }, [])

  const endSession = useCallback((score: number) => {
    setActiveSession((prev) => {
      if (!prev) return prev
      const ogunEarned = Math.floor(score * 0.01) // 1 OGUN per 100 points
      setTotalOgunEarned((t) => t + ogunEarned)
      setGamesPlayed((g) => g + 1)
      return {
        ...prev,
        score,
        status: GAME_SESSION_STATUS.COMPLETED,
        endedAt: Date.now(),
        ogunEarned,
      }
    })
    setMode(ARCADE_MODE.BROWSING)
  }, [])

  return (
    <AgentArcadeContext.Provider
      value={{ mode, setMode, activeSession, startSession, endSession, totalOgunEarned, gamesPlayed }}
    >
      {children}
    </AgentArcadeContext.Provider>
  )
}
