/**
 * Agent ART — Generative Covers, NFT Visuals, Profile Art
 * In-browser creative engine. Canvas-based generative art + AI visuals.
 * Powered by OGUN.
 *
 * ZERO BOOLEANS — all state uses typed string enums.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// ─── Enums ───────────────────────────────────────────────────────────

export const ART_MODE = {
  CREATING: 'CREATING',
  GENERATING: 'GENERATING',
  PREVIEWING: 'PREVIEWING',
  IDLE: 'IDLE',
} as const
export type ArtMode = typeof ART_MODE[keyof typeof ART_MODE]

export const ART_STYLE = {
  GENERATIVE: 'GENERATIVE',
  GLITCH: 'GLITCH',
  ABSTRACT: 'ABSTRACT',
  PIXEL: 'PIXEL',
  WAVEFORM: 'WAVEFORM',
  HOLOGRAPHIC: 'HOLOGRAPHIC',
  VINYL: 'VINYL',
  CYBERPUNK: 'CYBERPUNK',
  MINIMAL: 'MINIMAL',
} as const
export type ArtStyle = typeof ART_STYLE[keyof typeof ART_STYLE]

export const CANVAS_SIZE = {
  COVER_ART: 'COVER_ART',
  PROFILE_BANNER: 'PROFILE_BANNER',
  STORY: 'STORY',
  NFT_SQUARE: 'NFT_SQUARE',
  THUMBNAIL: 'THUMBNAIL',
  CUSTOM: 'CUSTOM',
} as const
export type CanvasSize = typeof CANVAS_SIZE[keyof typeof CANVAS_SIZE]

export const GENERATION_STATUS = {
  IDLE: 'IDLE',
  RENDERING: 'RENDERING',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
} as const
export type GenerationStatus = typeof GENERATION_STATUS[keyof typeof GENERATION_STATUS]

// ─── Types ───────────────────────────────────────────────────────────

export interface ArtProject {
  id: string
  name: string
  style: ArtStyle
  canvasSize: CanvasSize
  width: number
  height: number
  layers: ArtLayer[]
  createdAt: number
}

export interface ArtLayer {
  id: string
  type: string
  data: Record<string, unknown>
  opacity: number
  order: number
}

interface AgentArtContextValue {
  mode: ArtMode
  setMode: (mode: ArtMode) => void
  generationStatus: GenerationStatus
  activeProject: ArtProject | null
  setActiveProject: (project: ArtProject | null) => void
  createProject: (name: string, style: ArtStyle, canvasSize: CanvasSize) => string
  projectCount: number
}

// ─── Context ─────────────────────────────────────────────────────────

const AgentArtContext = createContext<AgentArtContextValue>({
  mode: ART_MODE.IDLE,
  setMode: () => {},
  generationStatus: GENERATION_STATUS.IDLE,
  activeProject: null,
  setActiveProject: () => {},
  createProject: () => '',
  projectCount: 0,
})

export const useAgentArt = () => useContext(AgentArtContext)

// ─── Canvas Size Presets ─────────────────────────────────────────────

const SIZE_PRESETS: Record<CanvasSize, { w: number; h: number }> = {
  [CANVAS_SIZE.COVER_ART]: { w: 3000, h: 3000 },
  [CANVAS_SIZE.PROFILE_BANNER]: { w: 1500, h: 500 },
  [CANVAS_SIZE.STORY]: { w: 1080, h: 1920 },
  [CANVAS_SIZE.NFT_SQUARE]: { w: 2048, h: 2048 },
  [CANVAS_SIZE.THUMBNAIL]: { w: 1280, h: 720 },
  [CANVAS_SIZE.CUSTOM]: { w: 1024, h: 1024 },
}

// ─── Provider ────────────────────────────────────────────────────────

export function AgentArtProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ArtMode>(ART_MODE.IDLE)
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(GENERATION_STATUS.IDLE)
  const [activeProject, setActiveProject] = useState<ArtProject | null>(null)
  const [projects, setProjects] = useState<ArtProject[]>([])

  const createProject = useCallback((name: string, style: ArtStyle, canvasSize: CanvasSize): string => {
    const id = 'art_' + Math.random().toString(36).slice(2, 10)
    const preset = SIZE_PRESETS[canvasSize] || SIZE_PRESETS[CANVAS_SIZE.CUSTOM]
    const project: ArtProject = {
      id,
      name,
      style,
      canvasSize,
      width: preset.w,
      height: preset.h,
      layers: [],
      createdAt: Date.now(),
    }
    setProjects((prev) => [...prev, project])
    setActiveProject(project)
    setMode(ART_MODE.CREATING)
    return id
  }, [])

  return (
    <AgentArtContext.Provider
      value={{
        mode, setMode, generationStatus, activeProject, setActiveProject,
        createProject, projectCount: projects.length,
      }}
    >
      {children}
    </AgentArtContext.Provider>
  )
}
