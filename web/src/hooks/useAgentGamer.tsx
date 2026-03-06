/**
 * Agent GAMER — On-the-Spot Code-Generating Game Builder
 * Users describe a game, GAMER builds it in real-time. Play instantly.
 * Powered by OGUN.
 *
 * ZERO BOOLEANS — all state uses typed string enums.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// ─── Enums ───────────────────────────────────────────────────────────

export const GAMER_MODE = {
  BUILDING: 'BUILDING',
  COMPILING: 'COMPILING',
  TESTING: 'TESTING',
  PUBLISHING: 'PUBLISHING',
  IDLE: 'IDLE',
} as const
export type GamerMode = typeof GAMER_MODE[keyof typeof GAMER_MODE]

export const GAME_ENGINE = {
  CANVAS_2D: 'CANVAS_2D',
  WEBGL: 'WEBGL',
  DOM: 'DOM',
  PIXEL: 'PIXEL',
  TEXT: 'TEXT',
} as const
export type GameEngine = typeof GAME_ENGINE[keyof typeof GAME_ENGINE]

export const GAME_GENRE = {
  PLATFORMER: 'PLATFORMER',
  PUZZLE: 'PUZZLE',
  ARCADE: 'ARCADE',
  RPG: 'RPG',
  SHOOTER: 'SHOOTER',
  RHYTHM: 'RHYTHM',
  CARD: 'CARD',
  TRIVIA: 'TRIVIA',
  RACING: 'RACING',
  SANDBOX: 'SANDBOX',
} as const
export type GameGenre = typeof GAME_GENRE[keyof typeof GAME_GENRE]

export const BUILD_STATUS = {
  DRAFT: 'DRAFT',
  GENERATING: 'GENERATING',
  READY: 'READY',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
} as const
export type BuildStatus = typeof BUILD_STATUS[keyof typeof BUILD_STATUS]

// ─── Types ───────────────────────────────────────────────────────────

export interface GameProject {
  id: string
  name: string
  genre: GameGenre
  engine: GameEngine
  description: string
  code: string
  status: BuildStatus
  ogunCost: number
  plays: number
  createdAt: number
}

interface AgentGamerContextValue {
  mode: GamerMode
  setMode: (mode: GamerMode) => void
  activeGame: GameProject | null
  setActiveGame: (game: GameProject | null) => void
  createGame: (name: string, genre: GameGenre, engine: GameEngine, description: string) => string
  games: GameProject[]
  gameCount: number
}

// ─── Context ─────────────────────────────────────────────────────────

const AgentGamerContext = createContext<AgentGamerContextValue>({
  mode: GAMER_MODE.IDLE,
  setMode: () => {},
  activeGame: null,
  setActiveGame: () => {},
  createGame: () => '',
  games: [],
  gameCount: 0,
})

export const useAgentGamer = () => useContext(AgentGamerContext)

// ─── Provider ────────────────────────────────────────────────────────

export function AgentGamerProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<GamerMode>(GAMER_MODE.IDLE)
  const [activeGame, setActiveGame] = useState<GameProject | null>(null)
  const [games, setGames] = useState<GameProject[]>([])

  const createGame = useCallback(
    (name: string, genre: GameGenre, engine: GameEngine, description: string): string => {
      const id = 'gm_' + Math.random().toString(36).slice(2, 10)
      const game: GameProject = {
        id,
        name,
        genre,
        engine,
        description,
        code: '',
        status: BUILD_STATUS.DRAFT,
        ogunCost: 0,
        plays: 0,
        createdAt: Date.now(),
      }
      setGames((prev) => [...prev, game])
      setActiveGame(game)
      setMode(GAMER_MODE.BUILDING)
      return id
    },
    []
  )

  return (
    <AgentGamerContext.Provider
      value={{ mode, setMode, activeGame, setActiveGame, createGame, games, gameCount: games.length }}
    >
      {children}
    </AgentGamerContext.Provider>
  )
}
