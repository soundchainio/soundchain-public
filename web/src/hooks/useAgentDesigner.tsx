/**
 * Agent DESIGNER — Custom Pages, Layouts, Themes
 * Users build their own pages, profiles, storefronts — all in-browser.
 * Powered by OGUN.
 *
 * ZERO BOOLEANS — all state uses typed string enums.
 */

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'

// ─── Enums ───────────────────────────────────────────────────────────

export const DESIGNER_MODE = {
  EDITING: 'EDITING',
  PREVIEWING: 'PREVIEWING',
  IDLE: 'IDLE',
} as const
export type DesignerMode = typeof DESIGNER_MODE[keyof typeof DESIGNER_MODE]

export const COMPONENT_KIND = {
  HERO: 'HERO',
  GALLERY: 'GALLERY',
  PLAYER: 'PLAYER',
  BIO: 'BIO',
  LINKS: 'LINKS',
  FEED: 'FEED',
  MERCH: 'MERCH',
  CUSTOM_HTML: 'CUSTOM_HTML',
  NFT_SHOWCASE: 'NFT_SHOWCASE',
  VIDEO_REEL: 'VIDEO_REEL',
} as const
export type ComponentKind = typeof COMPONENT_KIND[keyof typeof COMPONENT_KIND]

export const THEME_PRESET = {
  CYBERPUNK: 'CYBERPUNK',
  MINIMAL: 'MINIMAL',
  NEON: 'NEON',
  VINYL: 'VINYL',
  HOLOGRAPHIC: 'HOLOGRAPHIC',
  CUSTOM: 'CUSTOM',
} as const
export type ThemePreset = typeof THEME_PRESET[keyof typeof THEME_PRESET]

// ─── Types ───────────────────────────────────────────────────────────

export interface DesignerComponent {
  id: string
  kind: ComponentKind
  order: number
  config: Record<string, unknown>
}

export interface PageLayout {
  id: string
  name: string
  theme: ThemePreset
  components: DesignerComponent[]
  customCSS?: string
  createdAt: number
  updatedAt: number
}

interface AgentDesignerContextValue {
  mode: DesignerMode
  setMode: (mode: DesignerMode) => void
  activeLayout: PageLayout | null
  setActiveLayout: (layout: PageLayout | null) => void
  addComponent: (kind: ComponentKind) => void
  removeComponent: (id: string) => void
  reorderComponent: (id: string, newOrder: number) => void
  componentCount: number
}

// ─── Context ─────────────────────────────────────────────────────────

const AgentDesignerContext = createContext<AgentDesignerContextValue>({
  mode: DESIGNER_MODE.IDLE,
  setMode: () => {},
  activeLayout: null,
  setActiveLayout: () => {},
  addComponent: () => {},
  removeComponent: () => {},
  reorderComponent: () => {},
  componentCount: 0,
})

export const useAgentDesigner = () => useContext(AgentDesignerContext)

// ─── ID Generator ────────────────────────────────────────────────────

function generateId(): string {
  return 'dc_' + Math.random().toString(36).slice(2, 10)
}

// ─── Provider ────────────────────────────────────────────────────────

export function AgentDesignerProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DesignerMode>(DESIGNER_MODE.IDLE)
  const [activeLayout, setActiveLayout] = useState<PageLayout | null>(null)

  const addComponent = useCallback((kind: ComponentKind) => {
    if (mode !== DESIGNER_MODE.EDITING) return
    setActiveLayout((prev) => {
      if (!prev) return prev
      const newComponent: DesignerComponent = {
        id: generateId(),
        kind,
        order: prev.components.length,
        config: {},
      }
      return { ...prev, components: [...prev.components, newComponent], updatedAt: Date.now() }
    })
  }, [mode])

  const removeComponent = useCallback((id: string) => {
    setActiveLayout((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        components: prev.components.filter((c) => c.id !== id),
        updatedAt: Date.now(),
      }
    })
  }, [])

  const reorderComponent = useCallback((id: string, newOrder: number) => {
    setActiveLayout((prev) => {
      if (!prev) return prev
      const components = prev.components.map((c) =>
        c.id === id ? { ...c, order: newOrder } : c
      )
      return { ...prev, components, updatedAt: Date.now() }
    })
  }, [])

  return (
    <AgentDesignerContext.Provider
      value={{
        mode,
        setMode,
        activeLayout,
        setActiveLayout,
        addComponent,
        removeComponent,
        reorderComponent,
        componentCount: activeLayout?.components.length || 0,
      }}
    >
      {children}
    </AgentDesignerContext.Provider>
  )
}
