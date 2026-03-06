/**
 * Agent VIDEO — Clip Editing, Thumbnails, Reels
 * In-browser video production. Cut clips, generate thumbnails, create reels from posts.
 * Powered by OGUN.
 *
 * ZERO BOOLEANS — all state uses typed string enums.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// ─── Enums ───────────────────────────────────────────────────────────

export const VIDEO_MODE = {
  RECORDING: 'RECORDING',
  EDITING: 'EDITING',
  RENDERING: 'RENDERING',
  IDLE: 'IDLE',
} as const
export type VideoMode = typeof VIDEO_MODE[keyof typeof VIDEO_MODE]

export const CLIP_STATUS = {
  RAW: 'RAW',
  TRIMMED: 'TRIMMED',
  RENDERED: 'RENDERED',
  EXPORTED: 'EXPORTED',
} as const
export type ClipStatus = typeof CLIP_STATUS[keyof typeof CLIP_STATUS]

export const EXPORT_FORMAT = {
  MP4: 'MP4',
  WEBM: 'WEBM',
  GIF: 'GIF',
  THUMBNAIL_JPG: 'THUMBNAIL_JPG',
} as const
export type ExportFormat = typeof EXPORT_FORMAT[keyof typeof EXPORT_FORMAT]

export const REEL_STYLE = {
  STORY: 'STORY',
  CINEMATIC: 'CINEMATIC',
  QUICK_CUT: 'QUICK_CUT',
  SLIDESHOW: 'SLIDESHOW',
  LOOP: 'LOOP',
} as const
export type ReelStyle = typeof REEL_STYLE[keyof typeof REEL_STYLE]

// ─── Types ───────────────────────────────────────────────────────────

export interface VideoClip {
  id: string
  sourceUrl: string
  startMs: number
  endMs: number
  status: ClipStatus
  thumbnailUrl?: string
}

export interface VideoProject {
  id: string
  name: string
  clips: VideoClip[]
  style: ReelStyle
  audioTrackId?: string
  createdAt: number
}

interface AgentVideoContextValue {
  mode: VideoMode
  setMode: (mode: VideoMode) => void
  activeProject: VideoProject | null
  setActiveProject: (project: VideoProject | null) => void
  addClip: (sourceUrl: string, startMs: number, endMs: number) => void
  removeClip: (id: string) => void
  clipCount: number
}

// ─── Context ─────────────────────────────────────────────────────────

const AgentVideoContext = createContext<AgentVideoContextValue>({
  mode: VIDEO_MODE.IDLE,
  setMode: () => {},
  activeProject: null,
  setActiveProject: () => {},
  addClip: () => {},
  removeClip: () => {},
  clipCount: 0,
})

export const useAgentVideo = () => useContext(AgentVideoContext)

// ─── Provider ────────────────────────────────────────────────────────

export function AgentVideoProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<VideoMode>(VIDEO_MODE.IDLE)
  const [activeProject, setActiveProject] = useState<VideoProject | null>(null)

  const addClip = useCallback((sourceUrl: string, startMs: number, endMs: number) => {
    setActiveProject((prev) => {
      if (!prev) return prev
      const clip: VideoClip = {
        id: 'vc_' + Math.random().toString(36).slice(2, 10),
        sourceUrl,
        startMs,
        endMs,
        status: CLIP_STATUS.RAW,
      }
      return { ...prev, clips: [...prev.clips, clip] }
    })
  }, [])

  const removeClip = useCallback((id: string) => {
    setActiveProject((prev) => {
      if (!prev) return prev
      return { ...prev, clips: prev.clips.filter((c) => c.id !== id) }
    })
  }, [])

  return (
    <AgentVideoContext.Provider
      value={{
        mode, setMode, activeProject, setActiveProject,
        addClip, removeClip,
        clipCount: activeProject?.clips.length || 0,
      }}
    >
      {children}
    </AgentVideoContext.Provider>
  )
}
