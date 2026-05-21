/**
 * Arena CharacterDesigner — minimal stub.
 *
 * The full music-platform CharacterDesigner (web/src/components/CharacterDesigner.tsx,
 * 3645 lines) depends on the entire lib/nodeverse/* tree (avatars, wearables,
 * face morphs, AI portrait generation via SDXL, TripoSR mesh pipeline). That
 * pipeline is moving to lucy.soundchain.io in a separate ship.
 *
 * Arena's Gym only needs:
 *   - A CharacterConfig type compatible with GalleryRoom3D's buildAvatar/buildCapsule
 *   - getStoredCharacter() that returns a default character from localStorage
 *   - A hidden CharacterDesigner component (no-op modal)
 *
 * V2 of arena/gym will either pull the full CharacterDesigner once it lands on
 * lucy.soundchain.io (via cross-app deep link), or reimplement a slimmer
 * basketball-character variant inline.
 */

// Re-exported types for downstream consumers. Keep minimal.
export type FaceConfig = Record<string, unknown>
export type Outfit = Record<string, unknown>
export type OutfitColors = Record<string, string>

export interface AiFaceSpec {
  [k: string]: number | undefined
}

export interface AiBuildSpec {
  [k: string]: unknown
}

export interface CharacterConfig {
  type: 'agent' | 'opensource' | 'ai'
  bodyColor: string
  headShape: 'capsule' | 'sphere' | 'cube' | 'cone'
  height: number
  glowIntensity: number
  glowColor: string
  name: string
  accessory: 'none' | 'crown' | 'halo' | 'antenna' | 'visor'
  humanGlbUrl?: string
  humanAvatarPng?: string
  humanScale?: number
  humanYOffset?: number
  openSourceId?: string
  outfit?: Outfit
  outfitColors?: OutfitColors
  face?: FaceConfig
  aiPortraitDataUrl?: string
  aiPortraitPrompt?: string
  aiPortraitSeed?: number
  aiBuildSpec?: AiBuildSpec
  aiGlbUrl?: string
  aiFaceSpec?: AiFaceSpec
  chassisType?: string
  chassisFinish?: string
  faction?: string
  modules?: string[]
  animProfile?: string
  hudGlow?: string
  // Phase 16.x extensions for XBot rendering
  hairColor?: string
  hairColorHex?: string
  accentColor?: string
  skinColor?: string
}

export const DEFAULT_CHARACTER: CharacterConfig = {
  type: 'agent',
  bodyColor: '#dc2626',
  headShape: 'capsule',
  height: 1.0,
  glowIntensity: 0.4,
  glowColor: '#fbbf24',
  name: '',
  accessory: 'none',
}

const STORAGE_KEY = 'soundchain_character'

export function getStoredCharacter(): CharacterConfig {
  if (typeof window === 'undefined') return DEFAULT_CHARACTER
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CHARACTER
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_CHARACTER, ...parsed }
  } catch {
    return DEFAULT_CHARACTER
  }
}

export function saveCharacter(config: CharacterConfig) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    window.dispatchEvent(new CustomEvent('soundchain:character-saved', { detail: config }))
  } catch {}
}

interface CharacterDesignerProps {
  open: boolean
  onClose: () => void
  initialName?: string
}

export function CharacterDesigner({ open, onClose }: CharacterDesignerProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-mono text-white">Character Designer</h2>
        <p className="text-sm text-gray-400 font-mono">
          Full character customization is coming to <a href="https://lucy.soundchain.io" className="text-arena-red underline">lucy.soundchain.io</a>.
          For now, every player on the court uses the default red agent.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2 bg-arena-red text-white rounded font-mono text-sm hover:opacity-90 transition"
        >
          OK
        </button>
      </div>
    </div>
  )
}
