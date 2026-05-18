/**
 * Character Designer — NBA 2K-style avatar customization
 *
 * Live 3D preview powered by Three.js. Customize body color, head shape,
 * height, glow intensity, name. Saves to localStorage so your custom
 * avatar persists across sessions and follows you into Explore 3D.
 *
 * This is the foundation. Next iterations:
 * - Ready Player Me avatar import (full 3D human models)
 * - Outfit/accessory layering
 * - Animation library (idle, walk, dance, wave)
 * - On-chain badge as glowing aura around avatar
 */

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { X, Save, RefreshCw, Shuffle, User, Smile } from 'lucide-react'
import { OPEN_SOURCE_AVATARS, AVATAR_CATEGORIES, filterAvatarsByCategory, AvatarCategory } from 'lib/nodeverse/openSourceAvatars'
import { WEARABLE_SLOTS, wearablesForSlot, getWearable, type Outfit, type OutfitColors, type WearableSlot } from 'lib/nodeverse/wearables'
import {
  buildFaceGroup,
  buildOutfitGroup,
  buildHeadMaterial,
  computeAgentAnchors,
  DEFAULT_FACE,
  type FaceConfig,
} from 'lib/nodeverse/characterMesh'
export { DEFAULT_FACE } from 'lib/nodeverse/characterMesh'
export type { FaceConfig } from 'lib/nodeverse/characterMesh'

export interface CharacterConfig {
  type: 'agent' | 'opensource' | 'ai'  // pill / CC0 GLB / AI-generated portrait (Phase 16.23 removed 'human' — RPM dead)
  bodyColor: string         // hex (agent only)
  headShape: 'capsule' | 'sphere' | 'cube' | 'cone'
  height: number            // 0.6 - 1.4 multiplier
  glowIntensity: number     // 0 - 1
  glowColor: string         // hex
  name: string              // override @handle
  accessory: 'none' | 'crown' | 'halo' | 'antenna' | 'visor'
  humanGlbUrl?: string      // GLB URL (Ready Player Me OR open-source)
  humanAvatarPng?: string   // 2D preview thumbnail
  humanScale?: number       // model scale multiplier (open-source models vary wildly)
  humanYOffset?: number     // vertical alignment offset
  openSourceId?: string     // open-source avatar ID (if from OS library)
  outfit?: Outfit           // equipped wearables by slot: hat, sunglasses, hoodie, pants, shoes...
  outfitColors?: OutfitColors // per-slot color overrides
  face?: FaceConfig         // close-up face designer: skin tone, eyes, mouth, beard, paint
  aiPortraitDataUrl?: string // Phase 16.1 — AI BUILD tab: SDXL-generated portrait (data: URL)
  aiPortraitPrompt?: string // The prompt used to generate aiPortraitDataUrl (for regen)
  aiPortraitSeed?: number   // Deterministic seed (same seed + prompt → same portrait)
  aiBuildSpec?: AiBuildSpec // Phase 16.2 — NBA2K slider config that composed the prompt
  aiGlbUrl?: string         // Phase 16.3 — TripoSR-generated 3D mesh (data URL or anvil URL)
  aiFaceSpec?: AiFaceSpec   // Phase 16.6 — InZOI-style precision face morph weights (0-1)
  // Phase 16.20 — droid/agent customizer extensions
  chassisType?: 'capsule' | 'mech' | 'quadruped' | 'sphere' | 'cyber-monk' | 'anime-mech' | 'biomech' | 'holosphere' | 'wireframe' | 'decay-bot'
  chassisFinish?: 'chrome' | 'matte' | 'holographic' | 'translucent' | 'glowing' | 'decayed' | 'clean-industrial' | 'biomech-organic' | 'painted-tags' | 'rusted'
  faction?: 'neutral' | 'military' | 'luxury' | 'scavenger' | 'holy' | 'glitch' | 'synthwave' | 'voidwalker'
  modules?: Array<'visor' | 'antenna' | 'wings' | 'halo' | 'crown' | 'sensors' | 'aura' | 'runic-glyphs' | 'shoulder-mount' | 'back-pack' | 'tail-stinger'>
  animProfile?: 'idle' | 'dance' | 'glitch' | 'combat' | 'hover' | 'patrol' | 'meditate'
  hudGlow?: string  // hex tint for HUD overlay glow on chassis
}

// Phase 16.6 — face precision sliders. Maps 1:1 to ARkit-style face blendshapes
// on facecap.glb. Phase 16.19 — added eye/eyebrow/lip/face-shape pickers +
// makeup + freckles/dimples/moles + age + skin sheen.
export interface AiFaceSpec {
  // Precision sliders (morphTargetInfluences on facecap.glb)
  jawWidth: number       // -1 (narrow) .. 1 (wide)
  jawLength: number      // -1 (short) .. 1 (long)
  noseSize: number       // -1 (small) .. 1 (large)
  noseWidth: number      // -1 (narrow) .. 1 (wide)
  cheekbones: number     // -1 (flat) .. 1 (high+pronounced)
  brow: number           // -1 (low) .. 1 (high)
  browThickness: number  // -1 (thin) .. 1 (thick)
  eyeSize: number        // -1 (narrow) .. 1 (wide)
  lipThickness: number   // -1 (thin) .. 1 (full)
  chinTip: number        // -1 (receding) .. 1 (pronounced)
  symmetry: boolean      // mirror left/right edits — matches InZOI "Symmetry Mode"
  // Phase 16.19 — face structure presets
  faceShape: 'oval' | 'round' | 'square' | 'heart' | 'diamond' | 'oblong' | 'triangle'
  eyeShape: 'almond' | 'round' | 'hooded' | 'upturned' | 'downturned' | 'monolid' | 'wide-set' | 'close-set'
  eyeColor: 'brown' | 'blue' | 'green' | 'hazel' | 'grey' | 'amber' | 'violet' | 'heterochromia'
  eyeColorHex?: string  // optional precise eye color override
  eyebrowShape: 'arched' | 'straight' | 'rounded' | 'angled' | 'soft' | 'feathered' | 'thin-line' | 'bold'
  lipShape: 'full' | 'thin' | 'heart' | 'wide' | 'bow' | 'asymmetric' | 'pouty'
  lipColor: 'natural' | 'red' | 'dark' | 'glossy' | 'matte' | 'nude' | 'berry' | 'black'
  lipColorHex?: string  // optional precise lip color override
  // Skin details
  freckles: number  // 0 .. 1 — intensity slider
  dimples: 'none' | 'cheek' | 'chin' | 'both'
  moles: 'none' | 'single-cheek' | 'lip-corner' | 'scattered' | 'beauty-mark'
  makeup: 'none' | 'natural' | 'glam' | 'dramatic' | 'cyber' | 'festival' | 'gothic' | 'minimalist'
  // Phase 16.19 — accessories layered on face
  glasses: 'none' | 'reading' | 'sunglasses-aviator' | 'sunglasses-round' | 'cyber-visor' | 'monocle'
  earrings: 'none' | 'studs' | 'hoops' | 'dangling' | 'cuffs' | 'gauges'
}

// Phase 16.2 — NBA2K-style structured character config.
// Each field composes into a fragment of the SDXL prompt; the BuildSpec lets
// users tweak one trait (e.g. swap hair style) and regenerate with the same
// seed so the rest of the character stays largely consistent.
// Phase 16.19 — expanded with NBA2K-level depth: 20+ new fields covering
// granular body proportions, hair detail, layered outfit slots, accessories.
export interface AiBuildSpec {
  // Identity
  gender: 'masc' | 'fem' | 'androgynous'
  ageGroup: 'teen' | 'young' | 'adult' | 'mature' | 'elder'
  pose: 'standing' | 'lean' | 'rapper' | 'athletic' | 'royalty' | 'cyberpunk' | 'heroic' | 'walking' | 'dance'
  // Body proportions
  build: 'slim' | 'athletic' | 'muscular' | 'bulky'
  heightLabel: 'short' | 'average' | 'tall' | 'towering'  // 5'2" / 5'8" / 6'2" / 6'8"
  shoulders: 'narrow' | 'average' | 'broad'
  waist: 'slim' | 'average' | 'thick'
  // Skin
  skinTone: 'fair' | 'light' | 'medium' | 'tan' | 'brown' | 'dark'
  skinHex?: string  // optional override — any hex for full custom tone
  skinSheen: 'matte' | 'natural' | 'glossy' | 'metallic'
  tattoos: 'none' | 'minimal' | 'half-sleeve' | 'full-sleeve' | 'chest-piece' | 'full-body'
  scars: 'none' | 'subtle' | 'battle-worn'
  // Hair
  hairLength: 'bald' | 'buzz' | 'short' | 'medium' | 'long' | 'extra-long'
  hairStyle: 'natural' | 'wavy' | 'curly' | 'coily' | 'dreads' | 'braids' | 'cornrows' | 'mohawk' | 'fauxhawk' | 'pompadour' | 'undercut' | 'fade-design' | 'twists' | 'locs' | 'side-shave' | 'buzz-design'
  hairColor: 'black' | 'brown' | 'blonde' | 'red' | 'silver' | 'cyan' | 'pink' | 'purple' | 'rainbow' | 'platinum' | 'ginger' | 'two-tone'
  hairHighlights: 'none' | 'subtle' | 'ombre' | 'balayage' | 'dip-dye' | 'streaks'
  facialHair: 'clean' | 'stubble' | 'goatee' | 'beard' | 'mustache' | 'fu-manchu' | 'mutton-chops' | 'soul-patch' | 'full-bushy'
  // Vibe + outfit
  vibe: 'streetwear' | 'cyberpunk' | 'athletic' | 'formal' | 'casual' | 'artist' | 'royal' | 'tactical' | 'punk' | 'festival' | 'business' | 'goth' | 'gorpcore' | 'y2k' | 'western' | 'avant-garde'
  topPiece: 'hoodie' | 'tshirt' | 'jersey' | 'tank' | 'jacket' | 'buttonup' | 'sweater' | 'crop' | 'turtleneck' | 'bandana-shirt' | 'kimono' | 'corset' | 'mesh' | 'graphic-tee' | 'puffer' | 'denim-jacket'
  bottomPiece: 'jeans' | 'joggers' | 'shorts' | 'cargo' | 'dresspants' | 'skirt' | 'leggings' | 'tactical' | 'parachute' | 'wide-leg' | 'flare' | 'rip-stop' | 'cargo-shorts'
  shoes: 'sneakers' | 'boots' | 'dressshoes' | 'sandals' | 'cleats' | 'heels' | 'high-tops' | 'low-tops' | 'jordans' | 'vans' | 'doc-martens' | 'cowboy-boots' | 'platform' | 'tabi' | 'crocs'
  // Layered outerwear (Phase 16.19 — over the topPiece)
  jacket: 'none' | 'denim' | 'leather-biker' | 'bomber' | 'puffer' | 'trench' | 'duster' | 'varsity' | 'windbreaker' | 'fur' | 'kimono-coat' | 'cape' | 'cargo-vest' | 'fishing-vest'
  // Accessories
  headwear: 'none' | 'snapback' | 'fitted-cap' | 'beanie' | 'bucket-hat' | 'cowboy' | 'fedora' | 'headband' | 'durag' | 'visor' | 'wide-brim' | 'top-hat' | 'crown' | 'helmet' | 'turban' | 'hood'
  eyewear: 'none' | 'aviator' | 'wayfarer' | 'rectangle' | 'round' | 'cat-eye' | 'oversized' | 'sport' | 'cyber-visor' | 'monocle' | 'reading-glasses' | 'shield'
  jewelry: 'none' | 'gold-chain' | 'silver-chain' | 'cuban-link' | 'pearls' | 'grillz' | 'rings' | 'watch' | 'bracelet-stack' | 'choker' | 'pendant' | 'all-jewelry'
  piercings: 'none' | 'ear-single' | 'ear-multi' | 'nose-stud' | 'septum' | 'eyebrow' | 'lip' | 'industrial' | 'multi-facial'
  // Colors — every color-bearing field has both a named-preset enum (above)
  // AND an optional hex override (below). Hex wins when set; a "🎨 Custom"
  // button beside each preset row opens a color picker. Empty = use the
  // named preset's default color.
  topColor: string  // hex (required — top is the foundation)
  accentColor: string  // hex (required — accents on shoes/chains/etc)
  hairColorHex?: string  // override for hairColor enum
  jacketColor?: string  // hex override for jacket — defaults to topColor mix
  bottomColor?: string  // hex override for bottomPiece — defaults to neutral
  shoeColor?: string  // hex override for shoes — defaults to accentColor
  eyewearColor?: string  // hex tint override for eyewear lenses
  jewelryMetal?: 'gold' | 'silver' | 'rose-gold' | 'platinum' | 'iridium' | 'custom'
  jewelryColor?: string  // hex override when jewelryMetal === 'custom'
  // Misc
  extraDetails: string  // freeform additional prompt tuning
}

// FaceConfig + DEFAULT_FACE moved to lib/nodeverse/characterMesh.ts (shared
// between CharacterDesigner and Explore3DScene). Re-exported above for
// backward compat with any external imports.

export const DEFAULT_CHARACTER: CharacterConfig = {
  type: 'agent',
  bodyColor: '#22d3ee',
  headShape: 'sphere',
  height: 1.0,
  glowIntensity: 0.4,
  glowColor: '#22d3ee',
  name: '',
  accessory: 'none',
  outfit: {},
  outfitColors: {},
  face: { ...DEFAULT_FACE },
}

const STORAGE_KEY = 'soundchain_character'

export function getStoredCharacter(): CharacterConfig {
  if (typeof window === 'undefined') return DEFAULT_CHARACTER
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { ...DEFAULT_CHARACTER, ...JSON.parse(stored) }
  } catch {}
  return DEFAULT_CHARACTER
}

export function saveCharacter(config: CharacterConfig) {
  if (typeof window === 'undefined') return
  // localStorage gets the FULL config including AI-generated portrait/mesh
  // data URLs (which can be several MB each).
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    window.dispatchEvent(new CustomEvent('character-updated', { detail: config }))
  } catch {}
  // Server gets a SLIMMED config — data: URLs stripped out because the server
  // has a 20KB guardrail (a 3MB GLB blows it past 413). The slider/preset
  // values still sync cross-device; portrait + mesh stay localStorage-only
  // until we wire IPFS hosting for the assets (next ship).
  const serverConfig: any = { ...config }
  if (typeof serverConfig.aiPortraitDataUrl === 'string' && serverConfig.aiPortraitDataUrl.startsWith('data:')) {
    delete serverConfig.aiPortraitDataUrl
  }
  if (typeof serverConfig.aiGlbUrl === 'string' && serverConfig.aiGlbUrl.startsWith('data:')) {
    delete serverConfig.aiGlbUrl
  }
  if (typeof serverConfig.humanGlbUrl === 'string' && serverConfig.humanGlbUrl.startsWith('data:')) {
    delete serverConfig.humanGlbUrl
  }
  if (typeof serverConfig.humanAvatarPng === 'string' && serverConfig.humanAvatarPng.startsWith('data:')) {
    delete serverConfig.humanAvatarPng
  }
  // Fire-and-forget Mongo sync — if logged in, server stores it on profile so
  // other devices pick it up on next load. If 401 (guest), silently no-op.
  try {
    fetch('/api/profile/character', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character: serverConfig }),
    }).then(async (r) => {
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        console.warn('[saveCharacter] server reject:', r.status, data?.error)
      }
    }).catch(() => {})
  } catch {}
}

// Fetch the authoritative saved character from the server (logged-in users).
// Falls back to null for guests / 401. Callers should localStorage-cache it.
export async function loadRemoteCharacter(): Promise<CharacterConfig | null> {
  if (typeof window === 'undefined') return null
  try {
    const res = await fetch('/api/profile/character', { credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json()
    return (data?.character as CharacterConfig) || null
  } catch {
    return null
  }
}

// Preset color palette (one-tap themes)
const PRESET_COLORS = [
  '#22d3ee', // cyan
  '#a855f7', // purple
  '#ec4899', // pink
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#eab308', // yellow
  '#ffffff', // white
  '#6b7280', // gray
]

interface CharacterDesignerProps {
  open: boolean
  onClose: () => void
  initialName?: string
}

export function CharacterDesigner({ open, onClose, initialName }: CharacterDesignerProps) {
  const [config, setConfig] = useState<CharacterConfig>(() => {
    const stored = getStoredCharacter()
    return { ...stored, name: stored.name || initialName || '' }
  })
  const previewRef = useRef<HTMLDivElement>(null)
  const [saved, setSaved] = useState(false)
  const [activePanel, setActivePanel] = useState<'body' | 'face' | 'fit'>('body')
  const showFace = activePanel === 'face'
  const showFit = activePanel === 'fit'
  // On open, pull the authoritative character from Mongo (if logged in).
  // Merges into local state + localStorage so the designer opens with the
  // latest look, regardless of which device last saved. Phase 16.23: also
  // auto-migrates legacy type='human' configs to 'opensource' (or 'ai' if
  // they have aiGlbUrl) since HUMAN/RPM tab was removed.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    loadRemoteCharacter().then(remote => {
      if (cancelled || !remote) return
      const merged = { ...DEFAULT_CHARACTER, ...remote, name: remote.name || initialName || '' }
      // Auto-migrate: 'human' is no longer a valid type
      if ((merged as any).type === 'human') {
        merged.type = (merged as any).aiGlbUrl ? 'ai' : 'opensource'
      }
      setConfig(merged)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)) } catch {}
      window.dispatchEvent(new CustomEvent('character-updated', { detail: merged }))
    })
    return () => { cancelled = true }
  }, [open, initialName])

  // Lock body scroll while modal is open — prevents iOS Safari from
  // hijacking modal scroll gestures as background page scrolling.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    const prevTouchAction = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.touchAction = prevTouchAction
    }
  }, [open])

  // RPM message handler removed in Phase 16.23 (HUMAN tab gone).

  // ─── Live 3D Preview (agent pill only) ───────────────────
  useEffect(() => {
    if (!open || !previewRef.current || config.type !== 'agent') return
    const container = previewRef.current
    const w = container.clientWidth || 300
    const h = container.clientHeight || 300

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0f1f)

    const camera = new THREE.PerspectiveCamera(showFace ? 28 : 45, w / h, 0.1, 100)
    // Close-up face mode: camera tracks head height, tight zoom. Full body: wide view.
    const headCamY = 1.5 + (config.height - 1) * 1
    if (showFace) {
      camera.position.set(0, headCamY + 0.05, 1.4)
      camera.lookAt(0, headCamY, 0)
    } else {
      camera.position.set(0, 1.2, 4)
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)

    // Lighting (matches main scene)
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
    dirLight.position.set(5, 8, 5)
    dirLight.castShadow = true
    scene.add(dirLight)
    const fillLight = new THREE.PointLight(0x22d3ee, 1.5, 20)
    fillLight.position.set(-3, 3, 3)
    scene.add(fillLight)

    // Floor disc
    const floorGeo = new THREE.CircleGeometry(2.5, 32)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a2540, metalness: 0.7, roughness: 0.3 })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    // Glow ring under character
    const ringGeo = new THREE.RingGeometry(0.8, 1, 32)
    const ringMat = new THREE.MeshBasicMaterial({ color: config.glowColor, transparent: true, opacity: config.glowIntensity, side: THREE.DoubleSide })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.01
    scene.add(ring)

    // Character group
    const charGroup = new THREE.Group()
    const bodyColorObj = new THREE.Color(config.bodyColor)
    const glowColorObj = new THREE.Color(config.glowColor)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColorObj,
      emissive: glowColorObj,
      emissiveIntensity: config.glowIntensity,
      metalness: 0.5,
      roughness: 0.3,
    })

    // Body (capsule, scales with height)
    const bodyGeo = new THREE.CapsuleGeometry(0.4, 1 * config.height, 8, 16)
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 0.7 + (config.height - 1) * 0.5
    body.castShadow = true
    charGroup.add(body)

    // Head (varies by shape)
    let headGeo: THREE.BufferGeometry
    switch (config.headShape) {
      case 'sphere': headGeo = new THREE.SphereGeometry(0.3, 24, 24); break
      case 'cube': headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5); break
      case 'cone': headGeo = new THREE.ConeGeometry(0.3, 0.6, 24); break
      case 'capsule':
      default: headGeo = new THREE.CapsuleGeometry(0.25, 0.2, 8, 16); break
    }
    const head = new THREE.Mesh(headGeo, buildHeadMaterial(config.face?.skinTone, config.bodyColor, config.glowColor, config.glowIntensity))
    head.position.y = 1.5 + (config.height - 1) * 1
    head.castShadow = true
    charGroup.add(head)

    // Face features — shared builder so designer + world look identical
    charGroup.add(buildFaceGroup(config.face, head.position.y))

    // Outfit — shared builder, iterates all equipped slots
    charGroup.add(buildOutfitGroup(config.outfit, config.outfitColors, computeAgentAnchors(config.height)))

    // Accessory
    if (config.accessory !== 'none') {
      const accMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.1 })
      let accMesh: THREE.Mesh
      switch (config.accessory) {
        case 'crown':
          accMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.15, 8), accMat)
          accMesh.position.y = head.position.y + 0.35
          break
        case 'halo':
          accMesh = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 16, 32), accMat)
          accMesh.position.y = head.position.y + 0.45
          accMesh.rotation.x = Math.PI / 2
          break
        case 'antenna':
          accMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5), accMat)
          accMesh.position.y = head.position.y + 0.45
          break
        case 'visor':
          accMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x22d3ee, emissiveIntensity: 0.3, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.85 }))
          accMesh.position.y = head.position.y + 0.05
          accMesh.position.z = 0.05
          break
      }
      if (accMesh!) charGroup.add(accMesh)
    }

    scene.add(charGroup)

    // Name label sprite
    if (config.name) {
      const labelCanvas = document.createElement('canvas')
      labelCanvas.width = 256
      labelCanvas.height = 64
      const ctx = labelCanvas.getContext('2d')!
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(0, 0, 256, 64)
      ctx.fillStyle = config.bodyColor
      ctx.font = 'bold 28px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(config.name.slice(0, 16), 128, 42)
      const tex = new THREE.CanvasTexture(labelCanvas)
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }))
      sprite.scale.set(1.5, 0.4, 1)
      sprite.position.y = 2.4 + (config.height - 1) * 1
      charGroup.add(sprite)
    }

    // Rotate character slowly so all sides are visible
    let rafId = 0
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      charGroup.rotation.y += 0.005
      ring.rotation.z += 0.01
      renderer.render(scene, camera)
    }
    animate()

    // Cleanup
    return () => {
      cancelAnimationFrame(rafId)
      try { container.removeChild(renderer.domElement) } catch {}
      renderer.dispose()
      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose())
          else obj.material.dispose()
        }
      })
    }
  }, [open, config, showFace])

  if (!open) return null

  const update = (patch: Partial<CharacterConfig>) => setConfig(prev => ({ ...prev, ...patch }))

  const randomize = () => {
    setConfig(prev => ({
      ...prev,
      bodyColor: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      headShape: (['capsule', 'sphere', 'cube', 'cone'] as const)[Math.floor(Math.random() * 4)],
      height: 0.7 + Math.random() * 0.6,
      glowIntensity: Math.random() * 0.8,
      glowColor: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      accessory: (['none', 'crown', 'halo', 'antenna', 'visor'] as const)[Math.floor(Math.random() * 5)],
    }))
  }

  const handleSave = () => {
    saveCharacter(config)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto overflow-x-hidden"
      style={{
        // iOS Safari fixes:
        // 1. -webkit-overflow-scrolling enables momentum scrolling on legacy WebKit
        // 2. overscroll-behavior: contain stops body-page scroll bleed-through
        // 3. h-[100dvh] handles dynamic viewport (iOS Safari URL bar hide/show)
        // items-start (not items-center) so tall modals start at the top
        // of the viewport and scroll DOWN — items-center hides the top
        // when the modal exceeds viewport height (Frank's "cropped at top" bug).
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        height: '100dvh',
      }}
    >
      <div className="w-full max-w-3xl lg:max-w-6xl bg-[#0a0f1f] border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/10 overflow-hidden my-2 sm:my-4">
        {/* Header — sticky on mobile so user always knows where they are */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-black/80 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-mono font-bold text-cyan-400 tracking-wider">CHARACTER DESIGNER</h2>
            <span className="text-[8px] font-mono text-gray-600">NBA 2K mode</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Type Toggle: 3 modes — AGENT pill | OPEN SOURCE (CC0) | AI BUILD (SDXL).
            HUMAN (RPM) tab removed in Phase 16.23 — Ready Player Me's iframe
            is dead for our use case (no subdomain registration, blocked by
            X-Frame-Options). AI BUILD covers the same use case (custom human
            characters) but works on our own RTX 5000 with zero third-party
            dependencies. Pre-removal users with type='human' get auto-migrated
            to 'ai' on character load (see DEFAULT_CHARACTER merge below). */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-cyan-500/10 bg-black/60 backdrop-blur-md flex-wrap sticky top-[49px] z-10">
          <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider mr-2 w-full sm:w-auto">CITIZEN CLASS:</span>
          <button
            onClick={() => update({ type: 'agent' })}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded text-[10px] font-mono font-bold transition ${config.type === 'agent' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}
          >
            🤖 AGENT
          </button>
          <button
            onClick={() => update({ type: 'opensource' })}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded text-[10px] font-mono font-bold transition ${config.type === 'opensource' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}
          >
            🎨 OPEN SOURCE <span className="opacity-60 text-[8px]">(CC0)</span>
          </button>
          <button
            onClick={() => update({ type: 'ai' })}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded text-[10px] font-mono font-bold transition ${config.type === 'ai' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}
          >
            ✨ AI BUILD <span className="opacity-60 text-[8px]">(SDXL)</span>
          </button>
        </div>

        {/* AI BUILD MODE — anvil SDXL-generated character portraits (Phase 16.1).
            NBA2K-style player builds: describe character → SDXL on RTX 5000 generates
            full-body portrait → save to profile + display in Explore3D. */}
        {config.type === 'ai' && (
          <AiBuildPanel config={config} update={update} />
        )}

        {/* HUMAN MODE removed in Phase 16.23 — Ready Player Me is dead for
            our use case (no working subdomain registration, X-Frame-Options
            blocks bare URLs). AI BUILD does the same job on our own RTX 5000
            with zero third-party dependencies. */}

        {/* OPEN SOURCE MODE — curated CC0/MIT GLB avatars (NO third-party deps) */}
        {config.type === 'opensource' && (
          <OpenSourceAvatarBrowser
            selectedId={config.openSourceId}
            currentName={config.name}
            config={config}
            onUpdate={update}
            onPickAvatar={(av) => update({
              humanGlbUrl: av.glbUrl,
              humanAvatarPng: av.thumbnailUrl,
              openSourceId: av.id,
              humanScale: av.scale,
              humanYOffset: av.yOffset,
            })}
            onClearAvatar={() => update({ humanGlbUrl: undefined, humanAvatarPng: undefined, openSourceId: undefined, humanScale: undefined, humanYOffset: undefined })}
            onNameChange={(name) => update({ name })}
          />
        )}

        {/* AGENT MODE — original capsule designer */}
        {config.type === 'agent' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Left: 3D Preview */}
          <div className="bg-black border-b md:border-b-0 md:border-r border-cyan-500/10">
            <div ref={previewRef} className="w-full" style={{ height: '320px' }} />
            <div className="px-3 py-2 flex items-center justify-between border-t border-cyan-500/10">
              <span className="text-[8px] font-mono text-gray-600">LIVE PREVIEW · auto-rotate</span>
              <button onClick={randomize} className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono text-purple-400 hover:bg-purple-500/10 border border-purple-500/20 transition">
                <Shuffle className="w-3 h-3" /> Randomize
              </button>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="p-4 space-y-3">
            {/* Name */}
            <div>
              <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Display Name</label>
              <input
                type="text"
                value={config.name}
                onChange={e => update({ name: e.target.value })}
                placeholder="@handle or custom name"
                className="w-full bg-black/60 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-white outline-none focus:border-cyan-500/50"
                maxLength={16}
              />
            </div>

            {/* BODY / FACE / FIT sub-tab */}
            <div className="grid grid-cols-3 gap-1 border border-white/10 rounded p-0.5 bg-black/40">
              <button
                onClick={() => setActivePanel('body')}
                className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-mono font-bold transition ${activePanel === 'body' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-white'}`}
              >
                <User className="w-3 h-3" /> BODY
              </button>
              <button
                onClick={() => setActivePanel('face')}
                className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-mono font-bold transition ${activePanel === 'face' ? 'bg-pink-500/20 text-pink-400' : 'text-gray-500 hover:text-white'}`}
              >
                <Smile className="w-3 h-3" /> FACE
              </button>
              <button
                onClick={() => setActivePanel('fit')}
                className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-mono font-bold transition ${activePanel === 'fit' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-white'}`}
              >
                👕 FIT
              </button>
            </div>

            {showFit && (() => {
              const outfit = config.outfit || {}
              const colors = config.outfitColors || {}
              const equipItem = (slot: WearableSlot, id: string | null) => {
                const next = { ...outfit }
                if (id) next[slot] = id; else delete next[slot]
                update({ outfit: next })
              }
              const setSlotColor = (slot: WearableSlot, color: string | undefined) => {
                const next = { ...colors }
                if (color) next[slot] = color; else delete next[slot]
                update({ outfitColors: next })
              }
              return (
                <div className="space-y-3">
                  <p className="text-[9px] font-mono text-purple-300 bg-purple-500/5 border border-purple-500/10 rounded px-2 py-1.5">
                    Hat · sunglasses · hoodie · pants · shoes. Mix it up — it all carries into Explore 3D.
                  </p>
                  {WEARABLE_SLOTS.map(slot => {
                    const equippedId = outfit[slot]
                    const equipped = getWearable(equippedId)
                    return (
                      <div key={slot} className="border border-white/10 rounded p-2 bg-white/[0.02]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">{slot}</span>
                          {equipped && (
                            <button onClick={() => equipItem(slot, null)} className="text-[8px] font-mono text-gray-500 hover:text-red-400">remove</button>
                          )}
                        </div>
                        <div className="grid grid-cols-6 gap-1 mb-1">
                          {wearablesForSlot(slot).map(w => (
                            <button
                              key={w.id}
                              onClick={() => equipItem(slot, w.id)}
                              className={`flex flex-col items-center p-1.5 rounded text-[8px] font-mono uppercase transition ${equippedId === w.id ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 scale-105' : 'bg-black/40 text-gray-500 border border-white/5 hover:text-white'}`}
                              title={w.name}
                            >
                              <span className="text-lg leading-none">{w.emoji}</span>
                              <span className="truncate max-w-full mt-0.5">{w.name}</span>
                            </button>
                          ))}
                        </div>
                        {equipped && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {['#1a1a1a', '#ffffff', '#22d3ee', '#a855f7', '#ec4899', '#22c55e', '#facc15', '#ef4444', '#3b82f6', equipped.defaultColor].map(c => (
                              <button
                                key={c}
                                onClick={() => setSlotColor(slot, c)}
                                className={`w-5 h-5 rounded-full border-2 transition ${colors[slot] === c ? 'border-white scale-110' : 'border-white/20 hover:border-white/40'}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                            <input type="color" value={colors[slot] || equipped.defaultColor} onChange={e => setSlotColor(slot, e.target.value)} className="w-5 h-5 rounded cursor-pointer bg-transparent border border-white/10" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <button
                    onClick={() => update({ outfit: {}, outfitColors: {} })}
                    className="w-full py-1.5 rounded text-[9px] font-mono text-gray-400 hover:text-white border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/5 transition"
                  >
                    Strip everything
                  </button>
                </div>
              )
            })()}

            {showFace && (() => {
              const face = { ...DEFAULT_FACE, ...(config.face || {}) }
              const updateFace = (patch: Partial<FaceConfig>) => update({ face: { ...face, ...patch } })
              return (
                <>
                  {/* Skin Tone */}
                  <div>
                    <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Skin Tone</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {['#f5c89c', '#e8b48a', '#d49b7a', '#a87456', '#7a4e35', '#4a2e1f', '#22d3ee', '#a855f7'].map(c => (
                        <button
                          key={c}
                          onClick={() => updateFace({ skinTone: c })}
                          className={`w-7 h-7 rounded border-2 transition ${face.skinTone === c ? 'border-white scale-110' : 'border-white/20 hover:border-white/40'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input type="color" value={face.skinTone || config.bodyColor} onChange={e => updateFace({ skinTone: e.target.value })} className="w-7 h-7 rounded cursor-pointer bg-transparent border border-white/10" />
                      <button onClick={() => updateFace({ skinTone: undefined })} className="text-[9px] font-mono text-gray-400 hover:text-white px-2 py-1 rounded border border-white/10">clear</button>
                    </div>
                  </div>

                  {/* Eye Style */}
                  <div>
                    <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Eyes</label>
                    <div className="grid grid-cols-6 gap-1 mb-1">
                      {(['normal', 'glow', 'cyber', 'narrow', 'wide', 'closed'] as const).map(s => (
                        <button key={s} onClick={() => updateFace({ eyeStyle: s })} className={`px-1 py-1.5 rounded text-[8px] font-mono uppercase transition ${face.eyeStyle === s ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {['#ffffff', '#22d3ee', '#a855f7', '#ec4899', '#22c55e', '#facc15', '#ef4444', '#3b82f6'].map(c => (
                        <button key={c} onClick={() => updateFace({ eyeColor: c })} className={`w-5 h-5 rounded-full border-2 transition ${face.eyeColor === c ? 'border-white scale-110' : 'border-white/20 hover:border-white/40'}`} style={{ backgroundColor: c, boxShadow: face.eyeStyle === 'glow' || face.eyeStyle === 'cyber' ? `0 0 6px ${c}` : undefined }} />
                      ))}
                      <input type="color" value={face.eyeColor || '#ffffff'} onChange={e => updateFace({ eyeColor: e.target.value })} className="w-5 h-5 rounded cursor-pointer bg-transparent border border-white/10" />
                    </div>
                  </div>

                  {/* Mouth */}
                  <div>
                    <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Mouth</label>
                    <div className="grid grid-cols-5 gap-1 mb-1">
                      {(['neutral', 'smile', 'frown', 'smirk', 'open'] as const).map(s => (
                        <button key={s} onClick={() => updateFace({ mouthStyle: s })} className={`px-1 py-1.5 rounded text-[8px] font-mono uppercase transition ${face.mouthStyle === s ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {['#ef4444', '#f59e0b', '#ec4899', '#a855f7', '#000000', '#ffffff'].map(c => (
                        <button key={c} onClick={() => updateFace({ mouthColor: c })} className={`w-5 h-5 rounded-full border-2 transition ${face.mouthColor === c ? 'border-white scale-110' : 'border-white/20 hover:border-white/40'}`} style={{ backgroundColor: c }} />
                      ))}
                      <input type="color" value={face.mouthColor || '#ef4444'} onChange={e => updateFace({ mouthColor: e.target.value })} className="w-5 h-5 rounded cursor-pointer bg-transparent border border-white/10" />
                    </div>
                  </div>

                  {/* Beard / Facial Hair */}
                  <div>
                    <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Facial Hair</label>
                    <div className="grid grid-cols-5 gap-1 mb-1">
                      {(['none', 'stubble', 'mustache', 'goatee', 'full'] as const).map(s => (
                        <button key={s} onClick={() => updateFace({ beard: s })} className={`px-1 py-1.5 rounded text-[8px] font-mono uppercase transition ${face.beard === s ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}>
                          {s === 'none' ? '—' : s}
                        </button>
                      ))}
                    </div>
                    {face.beard !== 'none' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {['#1a1a1a', '#5c4033', '#8b4513', '#c9a064', '#fbbf24', '#e5e7eb', '#a855f7', '#22d3ee'].map(c => (
                          <button key={c} onClick={() => updateFace({ beardColor: c })} className={`w-5 h-5 rounded-full border-2 transition ${face.beardColor === c ? 'border-white scale-110' : 'border-white/20 hover:border-white/40'}`} style={{ backgroundColor: c }} />
                        ))}
                        <input type="color" value={face.beardColor || '#1a1a1a'} onChange={e => updateFace({ beardColor: e.target.value })} className="w-5 h-5 rounded cursor-pointer bg-transparent border border-white/10" />
                      </div>
                    )}
                  </div>

                  {/* Face Paint / Marks */}
                  <div>
                    <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Face Paint / Marks</label>
                    <div className="grid grid-cols-6 gap-1 mb-1">
                      {(['none', 'warrior', 'cyber', 'tribal', 'tear', 'scar'] as const).map(s => (
                        <button key={s} onClick={() => updateFace({ facePaint: s })} className={`px-1 py-1.5 rounded text-[8px] font-mono uppercase transition ${face.facePaint === s ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}>
                          {s === 'none' ? '—' : s}
                        </button>
                      ))}
                    </div>
                    {face.facePaint !== 'none' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {['#22d3ee', '#a855f7', '#ec4899', '#22c55e', '#facc15', '#ef4444', '#ffffff', '#000000'].map(c => (
                          <button key={c} onClick={() => updateFace({ paintColor: c })} className={`w-5 h-5 rounded-full border-2 transition ${face.paintColor === c ? 'border-white scale-110' : 'border-white/20 hover:border-white/40'}`} style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}` }} />
                        ))}
                        <input type="color" value={face.paintColor || '#22d3ee'} onChange={e => updateFace({ paintColor: e.target.value })} className="w-5 h-5 rounded cursor-pointer bg-transparent border border-white/10" />
                      </div>
                    )}
                  </div>

                  {/* Reset face */}
                  <button
                    onClick={() => update({ face: { ...DEFAULT_FACE } })}
                    className="w-full py-1.5 rounded text-[9px] font-mono text-gray-400 hover:text-white border border-white/10 hover:border-pink-500/30 hover:bg-pink-500/5 transition"
                  >
                    Reset face to default
                  </button>
                </>
              )
            })()}

            {activePanel === 'body' && (<>
            {/* Body Color */}
            <div>
              <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Body Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => update({ bodyColor: c })}
                    className={`w-7 h-7 rounded border-2 transition ${config.bodyColor === c ? 'border-white scale-110' : 'border-white/20 hover:border-white/40'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input type="color" value={config.bodyColor} onChange={e => update({ bodyColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer bg-transparent border border-white/10" />
              </div>
            </div>

            {/* Head Shape */}
            <div>
              <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Head Shape</label>
              <div className="grid grid-cols-4 gap-1">
                {(['sphere', 'cube', 'cone', 'capsule'] as const).map(shape => (
                  <button
                    key={shape}
                    onClick={() => update({ headShape: shape })}
                    className={`px-2 py-1.5 rounded text-[9px] font-mono uppercase transition ${config.headShape === shape ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>

            {/* Height */}
            <div>
              <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Height</span><span className="text-cyan-400">{(config.height * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0.6"
                max="1.4"
                step="0.05"
                value={config.height}
                onChange={e => update({ height: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Glow Intensity */}
            <div>
              <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Glow</span><span className="text-cyan-400">{(config.glowIntensity * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.glowIntensity}
                onChange={e => update({ glowIntensity: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Glow Color */}
            <div>
              <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Glow Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => update({ glowColor: c })}
                    className={`w-7 h-7 rounded border-2 transition ${config.glowColor === c ? 'border-white scale-110' : 'border-white/20 hover:border-white/40'}`}
                    style={{ backgroundColor: c, boxShadow: `0 0 8px ${c}` }}
                  />
                ))}
              </div>
            </div>

            {/* Accessory */}
            <div>
              <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Head Accessory</label>
              <div className="grid grid-cols-5 gap-1">
                {(['none', 'crown', 'halo', 'antenna', 'visor'] as const).map(acc => (
                  <button
                    key={acc}
                    onClick={() => update({ accessory: acc })}
                    className={`px-2 py-1.5 rounded text-[8px] font-mono uppercase transition ${config.accessory === acc ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}
                  >
                    {acc === 'none' ? '—' : acc}
                  </button>
                ))}
              </div>
            </div>

            {/* Phase 16.20 — DROID CHASSIS expansion. Adds 10 chassis types
                + 10 finishes + 8 factions + modular add-ons + animation
                profiles. Flows into the SDXL prompt when generating agent
                NFTs and is documented for future 3D mesh swap. */}
            <div className="pt-2 mt-2 border-t border-cyan-500/10">
              <div className="text-[10px] font-mono text-cyan-300/70 bg-cyan-500/5 p-2 rounded border border-cyan-500/10 leading-relaxed mb-2">
                🤖 DROID CHASSIS — Phase 16.20. The classic capsule still works (default). Pick a chassis type below to flavor the agent's silhouette. Modular accessories stack (multi-select).
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Chassis Type</label>
                  <div className="flex flex-wrap gap-1">
                    {(['capsule', 'mech', 'quadruped', 'sphere', 'cyber-monk', 'anime-mech', 'biomech', 'holosphere', 'wireframe', 'decay-bot'] as const).map(c => (
                      <button key={c} onClick={() => update({ chassisType: c })}
                        className={`px-2 py-1 rounded text-[9px] font-mono transition ${(config.chassisType || 'capsule') === c ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Chassis Finish</label>
                  <div className="flex flex-wrap gap-1">
                    {(['chrome', 'matte', 'holographic', 'translucent', 'glowing', 'decayed', 'clean-industrial', 'biomech-organic', 'painted-tags', 'rusted'] as const).map(c => (
                      <button key={c} onClick={() => update({ chassisFinish: c })}
                        className={`px-2 py-1 rounded text-[9px] font-mono transition ${(config.chassisFinish || 'chrome') === c ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Faction</label>
                  <div className="flex flex-wrap gap-1">
                    {(['neutral', 'military', 'luxury', 'scavenger', 'holy', 'glitch', 'synthwave', 'voidwalker'] as const).map(f => (
                      <button key={f} onClick={() => update({ faction: f })}
                        className={`px-2 py-1 rounded text-[9px] font-mono transition ${(config.faction || 'neutral') === f ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Modular Add-ons (multi-select)</label>
                  <div className="flex flex-wrap gap-1">
                    {(['visor', 'antenna', 'wings', 'halo', 'crown', 'sensors', 'aura', 'runic-glyphs', 'shoulder-mount', 'back-pack', 'tail-stinger'] as const).map(m => {
                      const active = (config.modules || []).includes(m)
                      return (
                        <button key={m} onClick={() => {
                          const cur = config.modules || []
                          update({ modules: active ? cur.filter(x => x !== m) : [...cur, m] })
                        }} className={`px-2 py-1 rounded text-[9px] font-mono transition ${active ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}>
                          {active ? '✓ ' : ''}{m}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Animation Profile</label>
                  <div className="flex flex-wrap gap-1">
                    {(['idle', 'dance', 'glitch', 'combat', 'hover', 'patrol', 'meditate'] as const).map(a => (
                      <button key={a} onClick={() => update({ animProfile: a })}
                        className={`px-2 py-1 rounded text-[9px] font-mono transition ${(config.animProfile || 'idle') === a ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">HUD Glow Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={config.hudGlow || config.glowColor || '#22d3ee'} onChange={e => update({ hudGlow: e.target.value })} className="w-10 h-7 rounded border border-white/10 bg-transparent cursor-pointer" />
                    <span className="font-mono text-[10px] text-gray-500">{config.hudGlow || '(matches glow)'}</span>
                    {config.hudGlow && <button onClick={() => update({ hudGlow: undefined })} className="text-[9px] font-mono text-gray-500 hover:text-cyan-300 underline">reset</button>}
                  </div>
                </div>
              </div>
            </div>
            </>)}{/* end body-panel controls */}
          </div>
        </div>
        )}{/* end agent mode */}

        {/* Footer — sticky so SAVE is always one tap away */}
        <div className="px-4 py-3 border-t border-cyan-500/20 bg-black/80 backdrop-blur-md flex items-center justify-between gap-2 sticky bottom-0 z-10">
          <button
            onClick={() => setConfig(DEFAULT_CHARACTER)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition"
          >
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-[10px] font-mono text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-[10px] font-mono font-bold transition ${saved ? 'bg-green-500/30 text-green-300 border border-green-500/50' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30'}`}
            >
              <Save className="w-3 h-3" /> {saved ? 'SAVED!' : 'SAVE CHARACTER'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Open-Source Avatar Browser ─────────────────────────────────
// Renders the curated CC0/MIT avatar grid + 3D preview of the selected one.
// No external services. No rate limits. No surprise pricing changes.
// Frank's vision: "the biggest abyss of nodeverse accessories known to man,
// woman, and agent."
interface OpenSourceAvatarBrowserProps {
  selectedId?: string
  currentName: string
  config: CharacterConfig
  onUpdate: (patch: Partial<CharacterConfig>) => void
  onPickAvatar: (av: typeof OPEN_SOURCE_AVATARS[number]) => void
  onClearAvatar: () => void
  onNameChange: (name: string) => void
}

function OpenSourceAvatarBrowser({ selectedId, currentName, config, onUpdate, onPickAvatar, onClearAvatar, onNameChange }: OpenSourceAvatarBrowserProps) {
  const [category, setCategory] = useState<AvatarCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)

  const filtered = filterAvatarsByCategory(category).filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  const selected = OPEN_SOURCE_AVATARS.find(a => a.id === selectedId)

  // ─── Live 3D preview of the selected avatar (reactive to config) ──
  useEffect(() => {
    if (!selected || !previewRef.current) return
    const container = previewRef.current
    const w = container.clientWidth || 300
    const h = container.clientHeight || 300

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050a14)

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
    camera.position.set(0, 1.4, 3.5)
    camera.lookAt(0, 1, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const dir = new THREE.DirectionalLight(0xffffff, 1.5)
    dir.position.set(5, 8, 5)
    scene.add(dir)
    const cyanLight = new THREE.PointLight(0x22d3ee, 1.2, 15)
    cyanLight.position.set(-3, 3, 3)
    scene.add(cyanLight)
    const purpleLight = new THREE.PointLight(0xa855f7, 0.8, 15)
    purpleLight.position.set(3, 2, -2)
    scene.add(purpleLight)

    // Floor disc
    const floorGeo = new THREE.CircleGeometry(2, 32)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a2540, metalness: 0.7, roughness: 0.3 })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)

    // Glow ring — reactive to config.glowColor + glowIntensity
    const ringGeo = new THREE.RingGeometry(1.0, 1.2, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(config.glowColor),
      transparent: true,
      opacity: config.glowIntensity,
      side: THREE.DoubleSide,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.01
    scene.add(ring)

    // Loading indicator
    const loadingGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5)
    const loadingMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(config.glowColor), emissive: new THREE.Color(config.glowColor), emissiveIntensity: 0.5, wireframe: true })
    const loadingCube = new THREE.Mesh(loadingGeo, loadingMat)
    loadingCube.position.y = 1.2
    scene.add(loadingCube)

    // Avatar group (holds model + accessories)
    const avatarGroup = new THREE.Group()
    scene.add(avatarGroup)

    let mixer: THREE.AnimationMixer | null = null
    let model: THREE.Object3D | null = null
    let cancelled = false

    // Lazy-load GLTFLoader
    import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
      if (cancelled) return
      const loader = new GLTFLoader()
      loader.load(
        selected.glbUrl,
        (gltf) => {
          if (cancelled) return
          scene.remove(loadingCube)
          model = gltf.scene
          const baseScale = selected.scale ?? 1
          model.scale.setScalar(baseScale * config.height)
          model.position.y = selected.yOffset ?? 0

          // Apply tint if bodyColor is not default cyan
          if (config.bodyColor !== '#22d3ee') {
            const tintColor = new THREE.Color(config.bodyColor)
            model.traverse((child: any) => {
              if (child.isMesh && child.material) {
                const mat = child.material.clone()
                mat.color.multiply(tintColor)
                child.material = mat
              }
            })
          }

          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true
              child.receiveShadow = true
            }
          })
          avatarGroup.add(model)

          // Animations
          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model)
            mixer.clipAction(gltf.animations[0]).play()
          }

          // Accessory — attached above the model's bounding box
          if (config.accessory !== 'none') {
            const bbox = new THREE.Box3().setFromObject(model)
            const topY = bbox.max.y + 0.15
            const accMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.1 })
            let accMesh: THREE.Mesh | null = null
            switch (config.accessory) {
              case 'crown':
                accMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 8), accMat)
                accMesh.position.y = topY
                break
              case 'halo':
                accMesh = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 16, 32), accMat)
                accMesh.position.y = topY + 0.1
                accMesh.rotation.x = Math.PI / 2
                break
              case 'antenna':
                accMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4), accMat)
                accMesh.position.y = topY + 0.15
                break
              case 'visor':
                accMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.3), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(config.glowColor), emissiveIntensity: 0.3, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.85 }))
                accMesh.position.y = topY - (bbox.max.y - bbox.min.y) * 0.15
                accMesh.position.z = 0.05
                break
            }
            if (accMesh) avatarGroup.add(accMesh)
          }

          // Name label sprite above model
          if (config.name) {
            const bbox2 = new THREE.Box3().setFromObject(avatarGroup)
            const labelCanvas = document.createElement('canvas')
            labelCanvas.width = 256
            labelCanvas.height = 64
            const ctx2 = labelCanvas.getContext('2d')!
            ctx2.fillStyle = 'rgba(0,0,0,0.7)'
            ctx2.fillRect(0, 0, 256, 64)
            ctx2.fillStyle = config.glowColor
            ctx2.font = 'bold 28px monospace'
            ctx2.textAlign = 'center'
            ctx2.fillText(config.name.slice(0, 16), 128, 42)
            const tex = new THREE.CanvasTexture(labelCanvas)
            const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }))
            sprite.scale.set(1.5, 0.4, 1)
            sprite.position.y = bbox2.max.y + 0.3
            avatarGroup.add(sprite)
          }
        },
        undefined,
        (err) => console.warn('Failed to load avatar GLB:', selected.glbUrl, err)
      )
    })

    const clock = new THREE.Clock()
    let raf = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      const dt = clock.getDelta()
      if (mixer) mixer.update(dt)
      avatarGroup.rotation.y += 0.005
      if (!model) loadingCube.rotation.y += 0.02
      ring.rotation.z += 0.005
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      try { container.removeChild(renderer.domElement) } catch {}
      renderer.dispose()
      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose())
          else obj.material.dispose()
        }
      })
    }
  }, [selected, config.height, config.glowColor, config.glowIntensity, config.bodyColor, config.accessory, config.name])

  return (
    <div className="bg-black">
      {!selected ? (
        <>
          {/* Header / search */}
          <div className="px-4 py-2 bg-green-500/5 border-b border-green-500/10">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-mono text-green-300">
                🎨 OPEN SOURCE LIBRARY · CC0 / MIT licensed · No third-party deps · Forever free
              </p>
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or tag (animal, robot, human...)"
              className="w-full bg-black/60 border border-white/10 rounded px-2 py-1.5 text-[10px] font-mono text-white outline-none focus:border-green-500/50"
            />
          </div>
          {/* Category filter */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 bg-black/20 overflow-x-auto">
            {AVATAR_CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono whitespace-nowrap transition ${category === c.id ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}
              >
                <span>{c.emoji}</span> {c.label}
              </button>
            ))}
            <span className="ml-auto text-[8px] font-mono text-gray-600">{filtered.length} avatars</span>
          </div>
          {/* Avatar grid */}
          <div className="p-3 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[420px] overflow-y-auto">
            {filtered.map(av => (
              <button
                key={av.id}
                onClick={() => onPickAvatar(av)}
                className="group flex flex-col items-center gap-1 p-3 rounded border border-white/10 hover:border-green-500/40 bg-white/[0.02] hover:bg-green-500/5 transition"
              >
                <div className="w-full aspect-square rounded bg-gradient-to-br from-green-900/30 to-cyan-900/30 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                  {av.emoji}
                </div>
                <div className="text-[10px] font-mono text-white text-center truncate w-full" title={av.name}>{av.name}</div>
                <div className="flex items-center gap-1 text-[8px] font-mono">
                  <span className="px-1 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">{av.license}</span>
                  {av.hasAnimations && <span className="px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">▶</span>}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-8 text-[10px] font-mono text-gray-500">No avatars match — try a different category or search</div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Selected — 3D preview + NBA 2K-style customization panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="bg-black border-b md:border-b-0 md:border-r border-green-500/10">
              <div ref={previewRef} className="w-full" style={{ height: '320px' }} />
              <div className="px-3 py-2 flex items-center justify-between border-t border-green-500/10">
                <span className="text-[8px] font-mono text-gray-600">LIVE PREVIEW · auto-rotate · reactive</span>
                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-green-500/10 text-green-400 border border-green-500/20">{selected.license}</span>
                  {selected.hasAnimations && <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">▶ anim</span>}
                </div>
              </div>
            </div>
            {/* Right: Customization controls */}
            <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: '420px' }}>
              {/* Model info header */}
              <div className="flex items-center gap-2">
                <div className="text-2xl">{selected.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono font-bold text-white truncate">{selected.name}</div>
                  <div className="text-[8px] font-mono text-gray-500 capitalize">{selected.category} · {selected.source}</div>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Display Name</label>
                <input
                  type="text"
                  value={currentName}
                  onChange={e => onNameChange(e.target.value)}
                  placeholder="@handle or custom name"
                  className="w-full bg-black/60 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-white outline-none focus:border-green-500/50"
                  maxLength={16}
                />
              </div>

              {/* Height / Scale */}
              <div>
                <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Height / Scale</span><span className="text-green-400">{(config.height * 100).toFixed(0)}%</span>
                </label>
                <input type="range" min="0.5" max="2.0" step="0.05" value={config.height} onChange={e => onUpdate({ height: parseFloat(e.target.value) })} className="w-full accent-green-400" />
              </div>

              {/* Tint Color (multiplied onto model materials) */}
              <div>
                <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Tint / Overlay Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {['#22d3ee', '#a855f7', '#ec4899', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#eab308', '#ffffff'].map(c => (
                    <button key={c} onClick={() => onUpdate({ bodyColor: c })} className={`w-6 h-6 rounded border-2 transition ${config.bodyColor === c ? 'border-white scale-110' : 'border-white/20 hover:border-white/40'}`} style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={config.bodyColor} onChange={e => onUpdate({ bodyColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer bg-transparent border border-white/10" />
                </div>
                <div className="text-[8px] font-mono text-gray-600 mt-1">Multiplied onto model materials. White = no tint.</div>
              </div>

              {/* Glow Ring */}
              <div>
                <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Glow Ring</span><span className="text-green-400">{(config.glowIntensity * 100).toFixed(0)}%</span>
                </label>
                <input type="range" min="0" max="1" step="0.05" value={config.glowIntensity} onChange={e => onUpdate({ glowIntensity: parseFloat(e.target.value) })} className="w-full accent-green-400" />
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {['#22d3ee', '#a855f7', '#ec4899', '#22c55e', '#facc15', '#ef4444', '#3b82f6', '#ffffff'].map(c => (
                    <button key={c} onClick={() => onUpdate({ glowColor: c })} className={`w-5 h-5 rounded border-2 transition ${config.glowColor === c ? 'border-white scale-110' : 'border-white/20 hover:border-white/40'}`} style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}` }} />
                  ))}
                </div>
              </div>

              {/* Accessory */}
              <div>
                <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Accessory</label>
                <div className="grid grid-cols-5 gap-1">
                  {(['none', 'crown', 'halo', 'antenna', 'visor'] as const).map(acc => (
                    <button key={acc} onClick={() => onUpdate({ accessory: acc })} className={`px-2 py-1.5 rounded text-[8px] font-mono uppercase transition ${config.accessory === acc ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}>
                      {acc === 'none' ? '—' : acc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Browse other */}
              <button onClick={onClearAvatar} className="w-full py-1.5 rounded text-[10px] font-mono text-green-400 hover:bg-green-500/10 border border-green-500/20 transition">
                ← Browse other avatars
              </button>
            </div>
          </div>
        </>
      )}
      <div className="px-4 py-2 border-t border-cyan-500/10 bg-black/40 flex items-center justify-between text-[8px] font-mono text-gray-600">
        <span>{OPEN_SOURCE_AVATARS.length} avatars · all CC0/MIT/CC-BY · ZERO third-party deps</span>
        <span className="text-green-500">🌱 Phase 1 of ∞</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 16.1 — AI BUILD Panel
// NBA2K-style player build via anvil SDXL on RTX 5000.
// Free-form text prompt → SDXL portrait → save as character avatar.
// ─────────────────────────────────────────────────────────────────────────

// ─── BuildSpec defaults + presets ───────────────────────────────────────

const DEFAULT_BUILD_SPEC: AiBuildSpec = {
  gender: 'masc',
  ageGroup: 'adult',
  pose: 'standing',
  build: 'athletic',
  heightLabel: 'average',
  shoulders: 'average',
  waist: 'average',
  skinTone: 'medium',
  skinSheen: 'natural',
  tattoos: 'none',
  scars: 'none',
  hairLength: 'short',
  hairStyle: 'natural',
  hairColor: 'black',
  hairHighlights: 'none',
  facialHair: 'clean',
  vibe: 'streetwear',
  topPiece: 'hoodie',
  bottomPiece: 'jeans',
  shoes: 'sneakers',
  jacket: 'none',
  headwear: 'none',
  eyewear: 'none',
  jewelry: 'none',
  piercings: 'none',
  topColor: '#1e3a8a',
  accentColor: '#ffffff',
  extraDetails: '',
}

const DEFAULT_FACE_SPEC: AiFaceSpec = {
  jawWidth: 0, jawLength: 0, noseSize: 0, noseWidth: 0,
  cheekbones: 0, brow: 0, browThickness: 0, eyeSize: 0,
  lipThickness: 0, chinTip: 0, symmetry: true,
  faceShape: 'oval',
  eyeShape: 'almond',
  eyeColor: 'brown',
  eyebrowShape: 'arched',
  lipShape: 'full',
  lipColor: 'natural',
  freckles: 0,
  dimples: 'none',
  moles: 'none',
  makeup: 'none',
  glasses: 'none',
  earrings: 'none',
}

// Each preset is a partial BuildSpec — merged on top of current spec so the
// user can quick-flavor without losing their other tweaks.
const AI_BUILD_PRESETS: Array<{ label: string; spec: Partial<AiBuildSpec> }> = [
  { label: '🏀 Baller', spec: { build: 'athletic', vibe: 'athletic', topPiece: 'jersey', bottomPiece: 'shorts', shoes: 'sneakers', hairStyle: 'cornrows', topColor: '#dc2626', accentColor: '#ffffff' } },
  { label: '🎤 MC', spec: { build: 'athletic', vibe: 'streetwear', topPiece: 'hoodie', bottomPiece: 'jeans', shoes: 'sneakers', hairStyle: 'dreads', accentColor: '#fbbf24' } },
  { label: '🤖 Cyberpunk', spec: { build: 'athletic', vibe: 'cyberpunk', topPiece: 'jacket', bottomPiece: 'cargo', shoes: 'boots', hairColor: 'cyan', topColor: '#000000', accentColor: '#22d3ee' } },
  { label: '🌿 Skater', spec: { build: 'slim', vibe: 'streetwear', topPiece: 'hoodie', bottomPiece: 'jeans', shoes: 'sneakers', topColor: '#84cc16' } },
  { label: '🎨 Artist', spec: { build: 'slim', vibe: 'artist', topPiece: 'jacket', bottomPiece: 'jeans', shoes: 'boots', hairLength: 'medium', topColor: '#7c2d12' } },
  { label: '👑 Royal', spec: { build: 'muscular', vibe: 'royal', topPiece: 'jacket', bottomPiece: 'dresspants', shoes: 'dressshoes', topColor: '#4c1d95', accentColor: '#fbbf24' } },
  { label: '⚔️ Tactical', spec: { build: 'muscular', vibe: 'tactical', topPiece: 'jacket', bottomPiece: 'cargo', shoes: 'boots', hairLength: 'buzz', topColor: '#1f2937', accentColor: '#000000' } },
  { label: '🎸 Punk', spec: { build: 'slim', vibe: 'punk', topPiece: 'jacket', bottomPiece: 'jeans', shoes: 'boots', hairStyle: 'mohawk', hairColor: 'pink', topColor: '#000000' } },
]

// ─── Token tables — map enum value → prompt fragment ────────────────────

const TOKEN_GENDER: Record<AiBuildSpec['gender'], string> = {
  masc: 'masculine',
  fem: 'feminine',
  androgynous: 'androgynous',
}
const TOKEN_BUILD: Record<AiBuildSpec['build'], string> = {
  slim: 'slim build',
  athletic: 'athletic build, toned',
  muscular: 'muscular build, broad shoulders',
  bulky: 'bulky build, heavyset',
}
const TOKEN_SKIN: Record<AiBuildSpec['skinTone'], string> = {
  fair: 'fair skin',
  light: 'light skin',
  medium: 'medium skin tone',
  tan: 'tan skin',
  brown: 'brown skin',
  dark: 'dark skin',
}
const TOKEN_HAIR_LEN: Record<AiBuildSpec['hairLength'], string> = {
  bald: 'bald head',
  buzz: 'buzz cut',
  short: 'short hair',
  medium: 'medium-length hair',
  long: 'long hair',
  'extra-long': 'extra-long flowing hair',
}
const TOKEN_HAIR_STYLE: Record<AiBuildSpec['hairStyle'], string> = {
  natural: 'natural texture',
  wavy: 'wavy',
  curly: 'curly',
  coily: 'coily',
  dreads: 'dreadlocks',
  braids: 'braided',
  cornrows: 'cornrows',
  mohawk: 'mohawk',
  fauxhawk: 'fauxhawk',
  pompadour: 'pompadour',
  undercut: 'undercut',
  'fade-design': 'fade with detailed design',
  twists: 'twists',
  locs: 'locs',
  'side-shave': 'side-shaved with long top',
  'buzz-design': 'buzz cut with shaved design',
}
const TOKEN_HAIR_COLOR: Record<AiBuildSpec['hairColor'], string> = {
  black: 'black hair',
  brown: 'brown hair',
  blonde: 'blonde hair',
  red: 'red hair',
  silver: 'silver hair',
  cyan: 'cyan-dyed hair',
  pink: 'pink-dyed hair',
  purple: 'purple-dyed hair',
  rainbow: 'rainbow-dyed hair',
  platinum: 'platinum blonde hair',
  ginger: 'ginger hair',
  'two-tone': 'two-tone hair',
}
const TOKEN_FACIAL_HAIR: Record<AiBuildSpec['facialHair'], string> = {
  clean: 'clean-shaven',
  stubble: 'light stubble',
  goatee: 'goatee',
  beard: 'full beard',
  mustache: 'mustache',
  'fu-manchu': 'fu manchu mustache',
  'mutton-chops': 'mutton chops',
  'soul-patch': 'soul patch',
  'full-bushy': 'full bushy beard',
}
const TOKEN_VIBE: Record<AiBuildSpec['vibe'], string> = {
  streetwear: 'urban streetwear aesthetic',
  cyberpunk: 'cyberpunk neon aesthetic',
  athletic: 'athletic sportswear aesthetic',
  formal: 'formal business aesthetic',
  casual: 'casual everyday aesthetic',
  artist: 'bohemian artist aesthetic',
  royal: 'regal luxury aesthetic',
  tactical: 'tactical military aesthetic',
  punk: 'punk rock aesthetic',
  festival: 'festival rave aesthetic',
  business: 'business professional',
  goth: 'gothic aesthetic',
  gorpcore: 'gorpcore outdoor aesthetic',
  y2k: 'Y2K early-2000s aesthetic',
  western: 'western frontier aesthetic',
  'avant-garde': 'avant-garde experimental fashion',
}
const TOKEN_TOP: Record<AiBuildSpec['topPiece'], string> = {
  hoodie: 'hoodie',
  tshirt: 't-shirt',
  jersey: 'sports jersey',
  tank: 'tank top',
  jacket: 'jacket',
  buttonup: 'button-up shirt',
  sweater: 'sweater',
  crop: 'cropped top',
  turtleneck: 'turtleneck',
  'bandana-shirt': 'bandana-print shirt',
  kimono: 'kimono top',
  corset: 'corset top',
  mesh: 'mesh top',
  'graphic-tee': 'graphic tee',
  puffer: 'puffer top',
  'denim-jacket': 'denim jacket as top',
}
const TOKEN_BOTTOM: Record<AiBuildSpec['bottomPiece'], string> = {
  jeans: 'jeans',
  joggers: 'joggers',
  shorts: 'shorts',
  cargo: 'cargo pants',
  dresspants: 'dress pants',
  skirt: 'skirt',
  leggings: 'leggings',
  tactical: 'tactical pants',
  parachute: 'parachute pants',
  'wide-leg': 'wide-leg pants',
  flare: 'flare pants',
  'rip-stop': 'rip-stop trousers',
  'cargo-shorts': 'cargo shorts',
}
const TOKEN_SHOES: Record<AiBuildSpec['shoes'], string> = {
  sneakers: 'sneakers',
  boots: 'boots',
  dressshoes: 'dress shoes',
  sandals: 'sandals',
  cleats: 'cleats',
  heels: 'heels',
  'high-tops': 'high-top sneakers',
  'low-tops': 'low-top sneakers',
  jordans: 'Jordan-style sneakers',
  vans: 'Vans skate shoes',
  'doc-martens': 'Doc Martens boots',
  'cowboy-boots': 'cowboy boots',
  platform: 'platform shoes',
  tabi: 'tabi split-toe shoes',
  crocs: 'crocs',
}

// Composer — turn BuildSpec into the SDXL prompt
// Phase 16.19 — token tables for all new fields
const TOKEN_AGE: Record<AiBuildSpec['ageGroup'], string> = {
  teen: 'late-teens', young: 'young adult', adult: 'adult',
  mature: 'mature middle-aged', elder: 'elderly',
}
const TOKEN_POSE: Record<AiBuildSpec['pose'], string> = {
  standing: 'confident standing pose', lean: 'cocky lean against wall',
  rapper: 'hip-hop rapper pose with hands up', athletic: 'athletic ready stance',
  royalty: 'regal commanding stance', cyberpunk: 'cyberpunk crouched ready',
  heroic: 'heroic action pose', walking: 'mid-stride walking pose', dance: 'mid-dance move',
}
const TOKEN_HEIGHT: Record<AiBuildSpec['heightLabel'], string> = {
  short: 'short stature', average: 'average height',
  tall: 'tall stature', towering: 'towering height',
}
const TOKEN_SHOULDERS: Record<AiBuildSpec['shoulders'], string> = {
  narrow: 'narrow shoulders', average: '', broad: 'broad shoulders',
}
const TOKEN_WAIST: Record<AiBuildSpec['waist'], string> = {
  slim: 'slim waist', average: '', thick: 'thick waist',
}
const TOKEN_SHEEN: Record<AiBuildSpec['skinSheen'], string> = {
  matte: 'matte skin', natural: '', glossy: 'glossy radiant skin', metallic: 'metallic chrome skin',
}
const TOKEN_TATTOOS: Record<AiBuildSpec['tattoos'], string> = {
  none: '', minimal: 'minimalist tattoos', 'half-sleeve': 'half-sleeve arm tattoos',
  'full-sleeve': 'full-sleeve tattoos', 'chest-piece': 'chest piece tattoo', 'full-body': 'extensive body tattoos',
}
const TOKEN_SCARS: Record<AiBuildSpec['scars'], string> = {
  none: '', subtle: 'subtle scar across face', 'battle-worn': 'battle-worn scars',
}
const TOKEN_HIGHLIGHTS: Record<AiBuildSpec['hairHighlights'], string> = {
  none: '', subtle: 'subtle highlights', ombre: 'ombre fade',
  balayage: 'balayage highlights', 'dip-dye': 'dip-dye tips', streaks: 'colored streaks',
}
const TOKEN_JACKET: Record<AiBuildSpec['jacket'], string> = {
  none: '', denim: 'denim jacket', 'leather-biker': 'leather biker jacket',
  bomber: 'bomber jacket', puffer: 'puffer jacket', trench: 'trench coat',
  duster: 'duster coat', varsity: 'varsity letterman jacket', windbreaker: 'windbreaker',
  fur: 'fur coat', 'kimono-coat': 'kimono-style coat', cape: 'flowing cape',
  'cargo-vest': 'cargo utility vest', 'fishing-vest': 'multi-pocket fishing vest',
}
const TOKEN_HEADWEAR: Record<AiBuildSpec['headwear'], string> = {
  none: '', snapback: 'snapback cap', 'fitted-cap': 'fitted ballcap', beanie: 'beanie',
  'bucket-hat': 'bucket hat', cowboy: 'cowboy hat', fedora: 'fedora',
  headband: 'sweatband headband', durag: 'silk durag', visor: 'sport visor',
  'wide-brim': 'wide-brim hat', 'top-hat': 'top hat', crown: 'jeweled crown',
  helmet: 'tactical helmet', turban: 'wrapped turban', hood: 'pulled-up hood',
}
const TOKEN_EYEWEAR: Record<AiBuildSpec['eyewear'], string> = {
  none: '', aviator: 'aviator sunglasses', wayfarer: 'wayfarer sunglasses',
  rectangle: 'rectangular glasses', round: 'round glasses', 'cat-eye': 'cat-eye frames',
  oversized: 'oversized sunglasses', sport: 'sport wraparound shades',
  'cyber-visor': 'cyber visor with HUD', monocle: 'monocle', 'reading-glasses': 'reading glasses', shield: 'shield wrap shades',
}
const TOKEN_JEWELRY: Record<AiBuildSpec['jewelry'], string> = {
  none: '', 'gold-chain': 'gold chain', 'silver-chain': 'silver chain',
  'cuban-link': 'thick cuban link chain', pearls: 'pearl necklace', grillz: 'iced grillz',
  rings: 'stacked rings', watch: 'designer watch', 'bracelet-stack': 'stacked bracelets',
  choker: 'choker', pendant: 'statement pendant', 'all-jewelry': 'full jewelry stack — chains, rings, watch',
}
const TOKEN_PIERCINGS: Record<AiBuildSpec['piercings'], string> = {
  none: '', 'ear-single': 'single ear stud', 'ear-multi': 'multiple ear piercings',
  'nose-stud': 'nose stud', septum: 'septum ring', eyebrow: 'eyebrow piercing',
  lip: 'lip piercing', industrial: 'industrial bar', 'multi-facial': 'multiple facial piercings',
}

function composePrompt(spec: AiBuildSpec): string {
  const parts: string[] = []
  // Identity
  parts.push(`${TOKEN_AGE[spec.ageGroup]} ${TOKEN_GENDER[spec.gender]} character`)
  // Body
  const bodyBits = [TOKEN_BUILD[spec.build], TOKEN_HEIGHT[spec.heightLabel], TOKEN_SHOULDERS[spec.shoulders], TOKEN_WAIST[spec.waist]].filter(Boolean)
  if (bodyBits.length) parts.push(bodyBits.join(', '))
  // Skin
  const skinColor = spec.skinHex ? `skin tone ${spec.skinHex}` : TOKEN_SKIN[spec.skinTone]
  parts.push(skinColor)
  if (TOKEN_SHEEN[spec.skinSheen]) parts.push(TOKEN_SHEEN[spec.skinSheen])
  if (TOKEN_TATTOOS[spec.tattoos]) parts.push(TOKEN_TATTOOS[spec.tattoos])
  if (TOKEN_SCARS[spec.scars]) parts.push(TOKEN_SCARS[spec.scars])
  // Hair
  if (spec.hairLength !== 'bald') {
    const hairColorStr = spec.hairColorHex ? `hair colored ${spec.hairColorHex}` : TOKEN_HAIR_COLOR[spec.hairColor as keyof typeof TOKEN_HAIR_COLOR] || `${spec.hairColor} hair`
    parts.push(`${TOKEN_HAIR_LEN[spec.hairLength]} ${TOKEN_HAIR_STYLE[spec.hairStyle as keyof typeof TOKEN_HAIR_STYLE] || spec.hairStyle} ${hairColorStr}`)
    if (TOKEN_HIGHLIGHTS[spec.hairHighlights]) parts.push(TOKEN_HIGHLIGHTS[spec.hairHighlights])
  } else {
    parts.push(TOKEN_HAIR_LEN.bald)
  }
  if (spec.facialHair !== 'clean') parts.push(TOKEN_FACIAL_HAIR[spec.facialHair as keyof typeof TOKEN_FACIAL_HAIR] || spec.facialHair)
  // Outfit — layered: top → jacket overlay → bottom → shoes
  parts.push(`wearing ${TOKEN_TOP[spec.topPiece as keyof typeof TOKEN_TOP] || spec.topPiece} in ${spec.topColor}`)
  if (TOKEN_JACKET[spec.jacket]) {
    const jc = spec.jacketColor ? ` in ${spec.jacketColor}` : ''
    parts.push(`layered with ${TOKEN_JACKET[spec.jacket]}${jc}`)
  }
  const bc = spec.bottomColor ? ` in ${spec.bottomColor}` : ''
  parts.push(`${TOKEN_BOTTOM[spec.bottomPiece as keyof typeof TOKEN_BOTTOM] || spec.bottomPiece}${bc}`)
  const sc = spec.shoeColor || spec.accentColor
  parts.push(`${TOKEN_SHOES[spec.shoes as keyof typeof TOKEN_SHOES] || spec.shoes} in ${sc}`)
  // Accessories
  if (TOKEN_HEADWEAR[spec.headwear]) parts.push(TOKEN_HEADWEAR[spec.headwear])
  if (TOKEN_EYEWEAR[spec.eyewear]) {
    const ec = spec.eyewearColor ? ` tinted ${spec.eyewearColor}` : ''
    parts.push(`${TOKEN_EYEWEAR[spec.eyewear]}${ec}`)
  }
  if (TOKEN_JEWELRY[spec.jewelry]) {
    const metal = spec.jewelryMetal && spec.jewelryMetal !== 'custom' ? ` (${spec.jewelryMetal})` : spec.jewelryMetal === 'custom' && spec.jewelryColor ? ` colored ${spec.jewelryColor}` : ''
    parts.push(`${TOKEN_JEWELRY[spec.jewelry]}${metal}`)
  }
  if (TOKEN_PIERCINGS[spec.piercings]) parts.push(TOKEN_PIERCINGS[spec.piercings])
  // Vibe + pose
  parts.push(TOKEN_VIBE[spec.vibe as keyof typeof TOKEN_VIBE] || spec.vibe)
  parts.push(`${TOKEN_POSE[spec.pose]}, clean background, hyper-detailed`)
  if (spec.extraDetails.trim()) parts.push(spec.extraDetails.trim())
  return parts.join(', ')
}

// Phase 16.19 — face spec prompt fragments (face-tab additions)
// Defensive about missing fields — pre-16.19 saved configs may not have them,
// callers should always backfill via DEFAULT_FACE_SPEC but this guards anyway.
function composeFaceTokens(face: AiFaceSpec): string[] {
  if (!face) return []
  const parts: string[] = []
  if (face.faceShape && face.faceShape !== 'oval') parts.push(`${face.faceShape}-shaped face`)
  if (face.eyeShape || face.eyeColor || face.eyeColorHex) {
    parts.push(`${face.eyeShape || 'almond'} ${face.eyeColorHex ? `${face.eyeColorHex} eyes` : `${face.eyeColor || 'brown'} eyes`}`)
  }
  if (face.eyebrowShape && face.eyebrowShape !== 'arched') parts.push(`${face.eyebrowShape} eyebrows`)
  if (face.lipShape && face.lipColor && (face.lipShape !== 'full' || face.lipColor !== 'natural')) {
    const lc = face.lipColorHex ? face.lipColorHex : face.lipColor
    parts.push(`${face.lipShape} lips${face.lipColor !== 'natural' ? ` in ${lc}` : ''}`)
  }
  if (typeof face.freckles === 'number' && face.freckles > 0.2) parts.push(face.freckles > 0.6 ? 'heavy freckles' : 'light freckles across nose')
  if (face.dimples && face.dimples !== 'none') parts.push(`${face.dimples === 'both' ? 'cheek and chin' : face.dimples} dimples`)
  if (face.moles && face.moles !== 'none') parts.push(face.moles === 'beauty-mark' ? 'beauty mark' : `${String(face.moles).replace(/-/g, ' ')} mole`)
  if (face.makeup && face.makeup !== 'none') parts.push(`${face.makeup} makeup`)
  if (face.glasses && face.glasses !== 'none') parts.push(String(face.glasses).replace(/-/g, ' '))
  if (face.earrings && face.earrings !== 'none') parts.push(`${face.earrings} earrings`)
  return parts
}

function AiBuildPanel({
  config,
  update,
}: {
  config: CharacterConfig
  update: (partial: Partial<CharacterConfig>) => void
}) {
  // Phase 16.19 — merge defaults so pre-16.19 saved configs get backfilled
  // with new fields (ageGroup, pose, heightLabel, shoulders, waist, skinSheen,
  // tattoos, scars, hairHighlights, jacket, headwear, eyewear, jewelry,
  // piercings, faceShape, eyeShape, eyeColor, eyebrowShape, lipShape,
  // lipColor, freckles, dimples, moles, makeup, glasses, earrings). Without
  // this, composers crashed on `e.moles.replace(...)` etc. for old characters.
  const [spec, setSpec] = useState<AiBuildSpec>({ ...DEFAULT_BUILD_SPEC, ...(config.aiBuildSpec || {}) })
  const [face, setFace] = useState<AiFaceSpec>({ ...DEFAULT_FACE_SPEC, ...(config.aiFaceSpec || {}) })
  const [seed, setSeed] = useState<number>(config.aiPortraitSeed || Math.floor(Math.random() * 1_000_000))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [variant, setVariant] = useState<'portrait' | 'face'>('portrait')
  const [showAdvanced, setShowAdvanced] = useState(false)
  // Phase 16.3 — 3D mesh generation state
  const [meshLoading, setMeshLoading] = useState(false)
  const [meshError, setMeshError] = useState<string | null>(null)
  const [viewer3DOpen, setViewer3DOpen] = useState(false)
  // Phase 16.6 — InZOI-style tab strip
  const [activeTab, setActiveTab] = useState<'face' | 'body' | 'outfit' | 'accessories' | 'render'>('body')

  // Phase 16.19 — fold face tokens into the prompt too (face-shape, eye color,
  // makeup, freckles, etc all flow into SDXL alongside body+outfit tokens).
  const composedPrompt = (() => {
    const base = composePrompt(spec)
    const faceTokens = composeFaceTokens(face).join(', ')
    return faceTokens ? `${base}, ${faceTokens}` : base
  })()
  const tweak = (patch: Partial<AiBuildSpec>) => setSpec((s) => ({ ...s, ...patch }))
  const applyPreset = (preset: Partial<AiBuildSpec>) => setSpec((s) => ({ ...s, ...preset }))
  const newCharacter = () => setSeed(Math.floor(Math.random() * 1_000_000))

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/character/generate-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: composedPrompt, variant, seed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })
      update({
        aiPortraitDataUrl: dataUrl,
        aiPortraitPrompt: composedPrompt,
        aiPortraitSeed: seed,
        aiBuildSpec: spec,
        aiFaceSpec: face,
      })
    } catch (err: any) {
      setError(err?.message || 'Generation failed — anvil SDXL may not be reachable')
    } finally {
      setLoading(false)
    }
  }

  // Phase 16.3 — Generate 3D mesh via TripoSR on anvil.
  // Sends the SDXL portrait's raw base64 bytes to /api/character/portrait-to-mesh,
  // which returns a binary GLB. Convert to data URL so it persists in character config
  // across page refreshes (Blob URLs die on refresh).
  async function generate3DMesh() {
    if (!config.aiPortraitDataUrl) {
      setMeshError('Generate a 2D portrait first, then we can lift it to 3D')
      return
    }
    setMeshLoading(true)
    setMeshError(null)
    try {
      // Strip data URL prefix to get raw base64
      const b64 = config.aiPortraitDataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, '')
      const res = await fetch('/api/character/portrait-to-mesh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_b64: b64, resolution: 256, remove_bg: true }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      // Convert GLB bytes → data URL for character config persistence
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })
      update({ aiGlbUrl: dataUrl })
      setViewer3DOpen(true)
    } catch (err: any) {
      setMeshError(err?.message || '3D mesh generation failed — TripoSR may not be live on anvil yet')
    } finally {
      setMeshLoading(false)
    }
  }

  return (
    <div className="bg-black space-y-0">
      <div className="px-4 py-2 bg-pink-500/5 border-b border-pink-500/10">
        <p className="text-[10px] font-mono text-pink-300">
          NBA2K-style player builder. Live 3D preview updates as you tweak. Tap ✨ Generate for high-quality SDXL render on RTX 5000.
        </p>
      </div>

      {/* Phase 16.18 — desktop side-by-side (InZOI layout)
          Phase 16.22 — MOBILE: tabs sticky at top, then preview sticky
          BELOW tabs so it stays visible while user scrolls sliders.
          - lg+: 3D preview LEFT half (sticky), tabs+sliders RIGHT half (scroll)
          - mobile/sm: pink banner → sticky tabs → sticky preview → scrollable sliders */}

      {/* MOBILE-ONLY tab strip — at top of scroll so it's the first sticky anchor.
          Hidden on lg+ where tabs live inside the right column. */}
      <div className="lg:hidden flex items-center px-2 py-1.5 border-b border-pink-500/10 bg-black/80 backdrop-blur-md sticky top-[97px] z-[6] gap-1 overflow-x-auto">
        {([
          ['body', '👤 BODY'],
          ['face', '😀 FACE'],
          ['outfit', '👕 OUTFIT'],
          ['accessories', '💎 EXTRAS'],
          ['render', '✨ RENDER'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex-1 min-w-[68px] px-2 py-1.5 rounded text-[10px] font-mono font-bold transition whitespace-nowrap ${activeTab === key ? 'bg-pink-500/25 text-pink-300 border border-pink-500/40' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="lg:flex lg:items-start">
        {/* LEFT: live 3D preview
            - lg+: sticky at top-[97px] in the left half, fills column height
            - mobile: sticky BELOW the tab strip (top-[137px] = 97 header + 40 tabs)
              so it stays visible while sliders scroll underneath. z-[5] sits
              below the tabs (z-[6]) so they layer correctly. bg-black so
              scrolling sliders don't bleed through. */}
        <div className="lg:w-1/2 sticky top-[137px] lg:top-[97px] z-[5] bg-black lg:self-start lg:h-[calc(100vh-200px)] lg:max-h-[700px] lg:border-r lg:border-pink-500/10">
          <LivePreview3D spec={spec} face={face} bigMode={activeTab === 'face'} />
        </div>

        {/* RIGHT: sliders. On lg+ this column also contains the tab strip
            (since the mobile tab strip is `lg:hidden`). On mobile this is just
            the slider content that scrolls underneath the sticky preview. */}
        <div className="lg:w-1/2 lg:flex lg:flex-col lg:min-h-0">
          {/* Desktop-only tab strip — lives in the right column above sliders */}
          <div className="hidden lg:flex items-center px-2 py-1.5 border-b border-pink-500/10 bg-black/60 backdrop-blur-md lg:sticky lg:top-0 z-[5] gap-1 overflow-x-auto">
            {([
              ['body', '👤 BODY'],
              ['face', '😀 FACE'],
              ['outfit', '👕 OUTFIT'],
              ['accessories', '💎 EXTRAS'],
              ['render', '✨ RENDER'],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex-1 min-w-[68px] px-2 py-1.5 rounded text-[10px] font-mono font-bold transition whitespace-nowrap ${activeTab === key ? 'bg-pink-500/25 text-pink-300 border border-pink-500/40' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3 lg:overflow-y-auto lg:flex-1">
        {/* Seed + new-character row — always visible */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-[9px] font-mono text-gray-500">seed: {seed}</span>
          <button onClick={newCharacter} className="px-2 py-1 rounded text-[10px] font-mono bg-pink-500/15 text-pink-300 border border-pink-500/30 hover:bg-pink-500/25">🎲 New Character</button>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setVariant('portrait')} className={pillCls(variant === 'portrait')}>Full body</button>
            <button onClick={() => setVariant('face')} className={pillCls(variant === 'face')}>Face</button>
          </div>
        </div>

        {/* ─── BODY TAB ─── */}
        {activeTab === 'body' && (
          <>
            {/* Quick-start presets stay on body — that's the "preset look" lane */}
            <PickerSection label="Quick start preset">
              <div className="flex flex-wrap gap-1">
                {AI_BUILD_PRESETS.map((p) => (
                  <button key={p.label} onClick={() => applyPreset(p.spec)} className="px-2 py-1 rounded text-[10px] font-mono bg-white/[0.02] text-gray-300 border border-white/5 hover:bg-pink-500/10 hover:text-pink-300 hover:border-pink-500/20 transition">
                    {p.label}
                  </button>
                ))}
              </div>
            </PickerSection>
            <PickerSection label="Identity">
              <ChipRow value={spec.gender} options={[['masc', '♂ Masc'], ['fem', '♀ Fem'], ['androgynous', '◐ Andro']]} onPick={(v) => tweak({ gender: v as any })} />
            </PickerSection>
            <PickerSection label="Age group">
              <ChipRow value={spec.ageGroup} options={[['teen', 'Teen'], ['young', 'Young'], ['adult', 'Adult'], ['mature', 'Mature'], ['elder', 'Elder']]} onPick={(v) => tweak({ ageGroup: v as any })} />
            </PickerSection>
            <PickerSection label="Pose">
              <ChipRow value={spec.pose} options={[['standing', 'Standing'], ['lean', 'Lean'], ['rapper', 'Rapper'], ['athletic', 'Athletic'], ['royalty', 'Royal'], ['cyberpunk', 'Cyber'], ['heroic', 'Heroic'], ['walking', 'Walking'], ['dance', 'Dance']]} onPick={(v) => tweak({ pose: v as any })} />
            </PickerSection>
            <PickerSection label="Build">
              <ChipRow value={spec.build} options={[['slim', 'Slim'], ['athletic', 'Athletic'], ['muscular', 'Muscular'], ['bulky', 'Bulky']]} onPick={(v) => tweak({ build: v as any })} />
            </PickerSection>
            <PickerSection label="Height">
              <ChipRow value={spec.heightLabel} options={[['short', '5\'2" Short'], ['average', '5\'8" Avg'], ['tall', '6\'2" Tall'], ['towering', '6\'8" Tower']]} onPick={(v) => tweak({ heightLabel: v as any })} />
            </PickerSection>
            <PickerSection label="Shoulders">
              <ChipRow value={spec.shoulders} options={[['narrow', 'Narrow'], ['average', 'Average'], ['broad', 'Broad']]} onPick={(v) => tweak({ shoulders: v as any })} />
            </PickerSection>
            <PickerSection label="Waist">
              <ChipRow value={spec.waist} options={[['slim', 'Slim'], ['average', 'Average'], ['thick', 'Thick']]} onPick={(v) => tweak({ waist: v as any })} />
            </PickerSection>
            <PickerSection label="Skin tone">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['fair', 'light', 'medium', 'tan', 'brown', 'dark'] as const).map((t, i) => {
                  const swatches = ['#f3d5b5', '#e0b48d', '#c08a5e', '#a16641', '#7a4a2b', '#4a2e1a']
                  const active = spec.skinTone === t && !spec.skinHex
                  return (
                    <button key={t} onClick={() => tweak({ skinTone: t, skinHex: undefined })} title={t}
                      className={`w-7 h-7 rounded-full border-2 transition ${active ? 'border-pink-400 scale-110' : 'border-white/10 hover:border-white/30'}`}
                      style={{ backgroundColor: swatches[i] }} />
                  )
                })}
                {/* Phase 16.19 — custom hex color picker for any skin tone */}
                <CustomColorBtn value={spec.skinHex} onChange={(hex) => tweak({ skinHex: hex })} fallback="#c08a5e" />
              </div>
            </PickerSection>
            <PickerSection label="Skin sheen">
              <ChipRow value={spec.skinSheen} options={[['matte', 'Matte'], ['natural', 'Natural'], ['glossy', 'Glossy'], ['metallic', 'Metal']]} onPick={(v) => tweak({ skinSheen: v as any })} />
            </PickerSection>
            <PickerSection label="Tattoos">
              <ChipRow value={spec.tattoos} options={[['none', 'None'], ['minimal', 'Minimal'], ['half-sleeve', '½ Sleeve'], ['full-sleeve', 'Sleeve'], ['chest-piece', 'Chest'], ['full-body', 'Full body']]} onPick={(v) => tweak({ tattoos: v as any })} />
            </PickerSection>
            <PickerSection label="Scars">
              <ChipRow value={spec.scars} options={[['none', 'None'], ['subtle', 'Subtle'], ['battle-worn', 'Battle-worn']]} onPick={(v) => tweak({ scars: v as any })} />
            </PickerSection>
            <PickerSection label="Vibe / aesthetic">
              <ChipRow value={spec.vibe} options={[['streetwear', 'Streetwear'], ['cyberpunk', 'Cyberpunk'], ['athletic', 'Athletic'], ['formal', 'Formal'], ['casual', 'Casual'], ['artist', 'Artist'], ['royal', 'Royal'], ['tactical', 'Tactical'], ['punk', 'Punk'], ['festival', 'Festival'], ['business', 'Business'], ['goth', 'Goth'], ['gorpcore', 'Gorpcore'], ['y2k', 'Y2K'], ['western', 'Western'], ['avant-garde', 'Avant-Garde']]} onPick={(v) => tweak({ vibe: v as any })} />
            </PickerSection>
          </>
        )}

        {/* ─── FACE TAB — InZOI-style precision sliders ─── */}
        {activeTab === 'face' && (
          <>
            <div className="text-[10px] font-mono text-pink-300/70 bg-pink-500/5 p-2 rounded border border-pink-500/10 leading-relaxed">
              🧬 Precision face sliders — each slider morphs the live 3D face on the left in real-time via 52 ARkit blendshapes (jawOpen, browInnerUp, cheekPuff, eyeWide_L/R, mouthSmile_L/R, etc). Values also persist + flow into your SDXL prompt.
            </div>
            <PickerSection label="Face shape">
              <ChipRow value={face.faceShape} options={[['oval', 'Oval'], ['round', 'Round'], ['square', 'Square'], ['heart', 'Heart'], ['diamond', 'Diamond'], ['oblong', 'Oblong'], ['triangle', 'Triangle']]} onPick={(v) => setFace(f => ({ ...f, faceShape: v as any }))} />
            </PickerSection>
            <PickerSection label="Eye shape">
              <ChipRow value={face.eyeShape} options={[['almond', 'Almond'], ['round', 'Round'], ['hooded', 'Hooded'], ['upturned', 'Upturned'], ['downturned', 'Downturned'], ['monolid', 'Monolid'], ['wide-set', 'Wide-set'], ['close-set', 'Close-set']]} onPick={(v) => setFace(f => ({ ...f, eyeShape: v as any }))} />
            </PickerSection>
            <PickerSection label="Eye color">
              <div className="flex flex-wrap items-center gap-1.5">
                {([['brown', '#5a3a20'], ['blue', '#3d7bb8'], ['green', '#3a7a4a'], ['hazel', '#a07a3a'], ['grey', '#7a7a7a'], ['amber', '#c08c2a'], ['violet', '#9a4ac0'], ['heterochromia', 'linear-gradient(90deg,#5a3a20 50%,#3d7bb8 50%)']] as const).map(([name, hex]) => {
                  const active = face.eyeColor === name && !face.eyeColorHex
                  return (
                    <button key={name} onClick={() => setFace(f => ({ ...f, eyeColor: name as any, eyeColorHex: undefined }))} title={name}
                      className={`w-7 h-7 rounded-full border-2 transition ${active ? 'border-pink-400 scale-110' : 'border-white/10 hover:border-white/30'}`}
                      style={{ background: hex }} />
                  )
                })}
                <CustomColorBtn value={face.eyeColorHex} onChange={(hex) => setFace(f => ({ ...f, eyeColorHex: hex }))} fallback="#3d7bb8" />
              </div>
            </PickerSection>
            <PickerSection label="Eyebrow shape">
              <ChipRow value={face.eyebrowShape} options={[['arched', 'Arched'], ['straight', 'Straight'], ['rounded', 'Rounded'], ['angled', 'Angled'], ['soft', 'Soft'], ['feathered', 'Feathered'], ['thin-line', 'Thin'], ['bold', 'Bold']]} onPick={(v) => setFace(f => ({ ...f, eyebrowShape: v as any }))} />
            </PickerSection>
            <PickerSection label="Lip shape">
              <ChipRow value={face.lipShape} options={[['full', 'Full'], ['thin', 'Thin'], ['heart', 'Heart'], ['wide', 'Wide'], ['bow', 'Cupid bow'], ['asymmetric', 'Asym'], ['pouty', 'Pouty']]} onPick={(v) => setFace(f => ({ ...f, lipShape: v as any }))} />
            </PickerSection>
            <PickerSection label="Lip color">
              <div className="flex flex-wrap items-center gap-1.5">
                {([['natural', '#c08070'], ['red', '#c93838'], ['dark', '#5a2030'], ['glossy', '#d89090'], ['matte', '#a06060'], ['nude', '#c8a08a'], ['berry', '#8a2a4a'], ['black', '#1a0a0a']] as const).map(([name, hex]) => {
                  const active = face.lipColor === name && !face.lipColorHex
                  return (
                    <button key={name} onClick={() => setFace(f => ({ ...f, lipColor: name as any, lipColorHex: undefined }))} title={name}
                      className={`w-7 h-7 rounded-full border-2 transition ${active ? 'border-pink-400 scale-110' : 'border-white/10 hover:border-white/30'}`}
                      style={{ backgroundColor: hex }} />
                  )
                })}
                <CustomColorBtn value={face.lipColorHex} onChange={(hex) => setFace(f => ({ ...f, lipColorHex: hex }))} fallback="#c93838" />
              </div>
            </PickerSection>
            <PickerSection label="Hair length">
              <ChipRow value={spec.hairLength} options={[['bald', 'Bald'], ['buzz', 'Buzz'], ['short', 'Short'], ['medium', 'Medium'], ['long', 'Long'], ['extra-long', 'XLong']]} onPick={(v) => tweak({ hairLength: v as any })} />
            </PickerSection>
            {spec.hairLength !== 'bald' && (
              <>
                <PickerSection label="Hair style">
                  <ChipRow value={spec.hairStyle} options={[['natural', 'Natural'], ['wavy', 'Wavy'], ['curly', 'Curly'], ['coily', 'Coily'], ['dreads', 'Dreads'], ['braids', 'Braids'], ['cornrows', 'Cornrows'], ['mohawk', 'Mohawk'], ['fauxhawk', 'Fauxhawk'], ['pompadour', 'Pompadour'], ['undercut', 'Undercut'], ['fade-design', 'Fade-Art'], ['twists', 'Twists'], ['locs', 'Locs'], ['side-shave', 'Side-shave'], ['buzz-design', 'Buzz-Art']]} onPick={(v) => tweak({ hairStyle: v as any })} />
                </PickerSection>
                <PickerSection label="Hair color">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {([['black', '#1a1a1a'], ['brown', '#5a3520'], ['blonde', '#d4a86c'], ['red', '#a03838'], ['silver', '#c0c0c0'], ['cyan', '#22d3ee'], ['pink', '#f472b6'], ['purple', '#9333ea'], ['rainbow', 'linear-gradient(90deg,#ef4444,#f59e0b,#eab308,#22c55e,#3b82f6,#a855f7)'], ['platinum', '#e8e8d4'], ['ginger', '#c05828'], ['two-tone', 'linear-gradient(180deg,#1a1a1a 50%,#d4a86c 50%)']] as const).map(([name, hex]) => {
                      const active = spec.hairColor === name && !spec.hairColorHex
                      return (
                        <button key={name} onClick={() => tweak({ hairColor: name as any, hairColorHex: undefined })} title={name}
                          className={`w-7 h-7 rounded-full border-2 transition ${active ? 'border-pink-400 scale-110' : 'border-white/10 hover:border-white/30'}`}
                          style={{ background: hex }} />
                      )
                    })}
                    <CustomColorBtn value={spec.hairColorHex} onChange={(hex) => tweak({ hairColorHex: hex })} fallback="#1a1a1a" />
                  </div>
                </PickerSection>
                <PickerSection label="Hair highlights">
                  <ChipRow value={spec.hairHighlights} options={[['none', 'None'], ['subtle', 'Subtle'], ['ombre', 'Ombre'], ['balayage', 'Balayage'], ['dip-dye', 'Dip-dye'], ['streaks', 'Streaks']]} onPick={(v) => tweak({ hairHighlights: v as any })} />
                </PickerSection>
              </>
            )}
            <PickerSection label="Facial hair">
              <ChipRow value={spec.facialHair} options={[['clean', 'Clean'], ['stubble', 'Stubble'], ['goatee', 'Goatee'], ['beard', 'Beard'], ['mustache', '\'Stache'], ['fu-manchu', 'Fu Manchu'], ['mutton-chops', 'Muttons'], ['soul-patch', 'Soul-patch'], ['full-bushy', 'Bushy']]} onPick={(v) => tweak({ facialHair: v as any })} />
            </PickerSection>
            <PickerSection label="Freckles intensity">
              <FaceSlider label="" value={face.freckles * 2 - 1} onChange={(v) => setFace(f => ({ ...f, freckles: Math.max(0, Math.min(1, (v + 1) / 2)) }))} />
            </PickerSection>
            <PickerSection label="Dimples">
              <ChipRow value={face.dimples} options={[['none', 'None'], ['cheek', 'Cheek'], ['chin', 'Chin'], ['both', 'Both']]} onPick={(v) => setFace(f => ({ ...f, dimples: v as any }))} />
            </PickerSection>
            <PickerSection label="Moles / beauty marks">
              <ChipRow value={face.moles} options={[['none', 'None'], ['single-cheek', 'Cheek mole'], ['lip-corner', 'Lip corner'], ['scattered', 'Scattered'], ['beauty-mark', 'Beauty mark']]} onPick={(v) => setFace(f => ({ ...f, moles: v as any }))} />
            </PickerSection>
            <PickerSection label="Makeup style">
              <ChipRow value={face.makeup} options={[['none', 'None'], ['natural', 'Natural'], ['glam', 'Glam'], ['dramatic', 'Dramatic'], ['cyber', 'Cyber'], ['festival', 'Festival'], ['gothic', 'Gothic'], ['minimalist', 'Minimal']]} onPick={(v) => setFace(f => ({ ...f, makeup: v as any }))} />
            </PickerSection>
            <PickerSection label="Glasses">
              <ChipRow value={face.glasses} options={[['none', 'None'], ['reading', 'Reading'], ['sunglasses-aviator', 'Aviator'], ['sunglasses-round', 'Round'], ['cyber-visor', 'Visor'], ['monocle', 'Monocle']]} onPick={(v) => setFace(f => ({ ...f, glasses: v as any }))} />
            </PickerSection>
            <PickerSection label="Earrings">
              <ChipRow value={face.earrings} options={[['none', 'None'], ['studs', 'Studs'], ['hoops', 'Hoops'], ['dangling', 'Dangling'], ['cuffs', 'Cuffs'], ['gauges', 'Gauges']]} onPick={(v) => setFace(f => ({ ...f, earrings: v as any }))} />
            </PickerSection>
            {/* Symmetry toggle — matches InZOI "Symmetry Mode" */}
            <div className="flex items-center gap-2">
              <button onClick={() => setFace(f => ({ ...f, symmetry: !f.symmetry }))}
                className={`px-3 py-1.5 rounded text-[10px] font-mono ${face.symmetry ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40' : 'bg-white/[0.02] text-gray-500 border border-white/5'}`}>
                {face.symmetry ? '◐ Symmetry ON' : '◑ Symmetry OFF'}
              </button>
              <button onClick={() => setFace(DEFAULT_FACE_SPEC)}
                className="ml-auto text-[10px] font-mono text-gray-500 hover:text-pink-300 underline">
                Reset face
              </button>
            </div>
            {/* Precision sliders */}
            <FaceSlider label="Jaw width" value={face.jawWidth} onChange={(v) => setFace(f => ({ ...f, jawWidth: v }))} />
            <FaceSlider label="Jaw length" value={face.jawLength} onChange={(v) => setFace(f => ({ ...f, jawLength: v }))} />
            <FaceSlider label="Nose size" value={face.noseSize} onChange={(v) => setFace(f => ({ ...f, noseSize: v }))} />
            <FaceSlider label="Nose width" value={face.noseWidth} onChange={(v) => setFace(f => ({ ...f, noseWidth: v }))} />
            <FaceSlider label="Cheekbones" value={face.cheekbones} onChange={(v) => setFace(f => ({ ...f, cheekbones: v }))} />
            <FaceSlider label="Brow position" value={face.brow} onChange={(v) => setFace(f => ({ ...f, brow: v }))} />
            <FaceSlider label="Brow thickness" value={face.browThickness} onChange={(v) => setFace(f => ({ ...f, browThickness: v }))} />
            <FaceSlider label="Eye size" value={face.eyeSize} onChange={(v) => setFace(f => ({ ...f, eyeSize: v }))} />
            <FaceSlider label="Lip thickness" value={face.lipThickness} onChange={(v) => setFace(f => ({ ...f, lipThickness: v }))} />
            <FaceSlider label="Chin tip" value={face.chinTip} onChange={(v) => setFace(f => ({ ...f, chinTip: v }))} />
          </>
        )}

        {/* ─── OUTFIT TAB ─── */}
        {activeTab === 'outfit' && (
          <>
            <PickerSection label="Top">
              <ChipRow value={spec.topPiece} options={[['hoodie', 'Hoodie'], ['tshirt', 'T-shirt'], ['jersey', 'Jersey'], ['tank', 'Tank'], ['jacket', 'Jacket'], ['buttonup', 'Button-up'], ['sweater', 'Sweater'], ['crop', 'Crop'], ['turtleneck', 'Turtleneck'], ['bandana-shirt', 'Bandana'], ['kimono', 'Kimono'], ['corset', 'Corset'], ['mesh', 'Mesh'], ['graphic-tee', 'Graphic-T'], ['puffer', 'Puffer'], ['denim-jacket', 'Denim-J']]} onPick={(v) => tweak({ topPiece: v as any })} />
            </PickerSection>
            <PickerSection label="Top color">
              <input type="color" value={spec.topColor} onChange={(e) => tweak({ topColor: e.target.value })} className="w-12 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
              <span className="ml-2 font-mono text-[10px] text-gray-500">{spec.topColor}</span>
            </PickerSection>
            <PickerSection label="Jacket / outerwear">
              <ChipRow value={spec.jacket} options={[['none', 'None'], ['denim', 'Denim'], ['leather-biker', 'Leather'], ['bomber', 'Bomber'], ['puffer', 'Puffer'], ['trench', 'Trench'], ['duster', 'Duster'], ['varsity', 'Varsity'], ['windbreaker', 'Windbreaker'], ['fur', 'Fur'], ['kimono-coat', 'Kimono-coat'], ['cape', 'Cape'], ['cargo-vest', 'Cargo-vest'], ['fishing-vest', 'Fishing-vest']]} onPick={(v) => tweak({ jacket: v as any })} />
            </PickerSection>
            {spec.jacket !== 'none' && (
              <PickerSection label="Jacket color">
                <div className="flex items-center gap-2">
                  <input type="color" value={spec.jacketColor || spec.topColor} onChange={(e) => tweak({ jacketColor: e.target.value })} className="w-12 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                  <span className="font-mono text-[10px] text-gray-500">{spec.jacketColor || '(matches top)'}</span>
                  {spec.jacketColor && <button onClick={() => tweak({ jacketColor: undefined })} className="text-[9px] font-mono text-gray-500 hover:text-pink-300 underline">reset</button>}
                </div>
              </PickerSection>
            )}
            <PickerSection label="Bottom">
              <ChipRow value={spec.bottomPiece} options={[['jeans', 'Jeans'], ['joggers', 'Joggers'], ['shorts', 'Shorts'], ['cargo', 'Cargo'], ['dresspants', 'Dress pants'], ['skirt', 'Skirt'], ['leggings', 'Leggings'], ['tactical', 'Tactical'], ['parachute', 'Parachute'], ['wide-leg', 'Wide-leg'], ['flare', 'Flare'], ['rip-stop', 'Rip-stop'], ['cargo-shorts', 'Cargo-shorts']]} onPick={(v) => tweak({ bottomPiece: v as any })} />
            </PickerSection>
            <PickerSection label="Bottom color">
              <div className="flex items-center gap-2">
                <input type="color" value={spec.bottomColor || '#1f2937'} onChange={(e) => tweak({ bottomColor: e.target.value })} className="w-12 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                <span className="font-mono text-[10px] text-gray-500">{spec.bottomColor || '(neutral)'}</span>
                {spec.bottomColor && <button onClick={() => tweak({ bottomColor: undefined })} className="text-[9px] font-mono text-gray-500 hover:text-pink-300 underline">reset</button>}
              </div>
            </PickerSection>
            <PickerSection label="Shoes">
              <ChipRow value={spec.shoes} options={[['sneakers', 'Sneakers'], ['boots', 'Boots'], ['dressshoes', 'Dress'], ['sandals', 'Sandals'], ['cleats', 'Cleats'], ['heels', 'Heels'], ['high-tops', 'High-tops'], ['low-tops', 'Low-tops'], ['jordans', 'Jordans'], ['vans', 'Vans'], ['doc-martens', 'Docs'], ['cowboy-boots', 'Cowboy'], ['platform', 'Platform'], ['tabi', 'Tabi'], ['crocs', 'Crocs']]} onPick={(v) => tweak({ shoes: v as any })} />
            </PickerSection>
            <PickerSection label="Shoe color">
              <div className="flex items-center gap-2">
                <input type="color" value={spec.shoeColor || spec.accentColor} onChange={(e) => tweak({ shoeColor: e.target.value })} className="w-12 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                <span className="font-mono text-[10px] text-gray-500">{spec.shoeColor || '(matches accent)'}</span>
                {spec.shoeColor && <button onClick={() => tweak({ shoeColor: undefined })} className="text-[9px] font-mono text-gray-500 hover:text-pink-300 underline">reset</button>}
              </div>
            </PickerSection>
            <PickerSection label="Accent color">
              <input type="color" value={spec.accentColor} onChange={(e) => tweak({ accentColor: e.target.value })} className="w-12 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
              <span className="ml-2 font-mono text-[10px] text-gray-500">{spec.accentColor}</span>
            </PickerSection>
          </>
        )}

        {/* ─── EXTRAS TAB — accessories + free-form ─── */}
        {activeTab === 'accessories' && (
          <>
            <PickerSection label="Headwear">
              <ChipRow value={spec.headwear} options={[['none', 'None'], ['snapback', 'Snapback'], ['fitted-cap', 'Fitted'], ['beanie', 'Beanie'], ['bucket-hat', 'Bucket'], ['cowboy', 'Cowboy'], ['fedora', 'Fedora'], ['headband', 'Headband'], ['durag', 'Durag'], ['visor', 'Visor'], ['wide-brim', 'Wide-brim'], ['top-hat', 'Top hat'], ['crown', 'Crown'], ['helmet', 'Helmet'], ['turban', 'Turban'], ['hood', 'Hood']]} onPick={(v) => tweak({ headwear: v as any })} />
            </PickerSection>
            <PickerSection label="Eyewear (body-tab; face-tab has separate glasses)">
              <ChipRow value={spec.eyewear} options={[['none', 'None'], ['aviator', 'Aviator'], ['wayfarer', 'Wayfarer'], ['rectangle', 'Rectangle'], ['round', 'Round'], ['cat-eye', 'Cat-eye'], ['oversized', 'Oversized'], ['sport', 'Sport'], ['cyber-visor', 'Cyber visor'], ['monocle', 'Monocle'], ['reading-glasses', 'Reading'], ['shield', 'Shield']]} onPick={(v) => tweak({ eyewear: v as any })} />
            </PickerSection>
            {spec.eyewear !== 'none' && (
              <PickerSection label="Eyewear lens tint">
                <div className="flex items-center gap-2">
                  <input type="color" value={spec.eyewearColor || '#000000'} onChange={(e) => tweak({ eyewearColor: e.target.value })} className="w-12 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                  <span className="font-mono text-[10px] text-gray-500">{spec.eyewearColor || '(default)'}</span>
                  {spec.eyewearColor && <button onClick={() => tweak({ eyewearColor: undefined })} className="text-[9px] font-mono text-gray-500 hover:text-pink-300 underline">reset</button>}
                </div>
              </PickerSection>
            )}
            <PickerSection label="Jewelry">
              <ChipRow value={spec.jewelry} options={[['none', 'None'], ['gold-chain', 'Gold chain'], ['silver-chain', 'Silver chain'], ['cuban-link', 'Cuban link'], ['pearls', 'Pearls'], ['grillz', 'Grillz'], ['rings', 'Rings'], ['watch', 'Watch'], ['bracelet-stack', 'Bracelets'], ['choker', 'Choker'], ['pendant', 'Pendant'], ['all-jewelry', 'ALL STACK']]} onPick={(v) => tweak({ jewelry: v as any })} />
            </PickerSection>
            {spec.jewelry !== 'none' && (
              <>
                <PickerSection label="Jewelry metal">
                  <ChipRow value={spec.jewelryMetal || 'gold'} options={[['gold', 'Gold'], ['silver', 'Silver'], ['rose-gold', 'Rose Gold'], ['platinum', 'Platinum'], ['iridium', 'Iridium'], ['custom', 'Custom']]} onPick={(v) => tweak({ jewelryMetal: v as any })} />
                </PickerSection>
                {spec.jewelryMetal === 'custom' && (
                  <PickerSection label="Jewelry color">
                    <input type="color" value={spec.jewelryColor || '#facc15'} onChange={(e) => tweak({ jewelryColor: e.target.value })} className="w-12 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                    <span className="ml-2 font-mono text-[10px] text-gray-500">{spec.jewelryColor || '#facc15'}</span>
                  </PickerSection>
                )}
              </>
            )}
            <PickerSection label="Piercings">
              <ChipRow value={spec.piercings} options={[['none', 'None'], ['ear-single', 'Ear single'], ['ear-multi', 'Ear multi'], ['nose-stud', 'Nose stud'], ['septum', 'Septum'], ['eyebrow', 'Eyebrow'], ['lip', 'Lip'], ['industrial', 'Industrial'], ['multi-facial', 'Multi-facial']]} onPick={(v) => tweak({ piercings: v as any })} />
            </PickerSection>
            <PickerSection label="Free-form extras">
              <textarea value={spec.extraDetails} onChange={(e) => tweak({ extraDetails: e.target.value })} placeholder="anything not covered above: phone in hand, microphone, instrument, ball, custom logos, accessories…" rows={3}
                className="w-full bg-white/[0.02] border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-gray-600 resize-none focus:outline-none focus:border-pink-500/40" />
            </PickerSection>
          </>
        )}

        {/* ─── RENDER TAB ─── */}
        {activeTab === 'render' && (
          <>
            <div className="text-[10px] font-mono text-pink-300/70 bg-pink-500/5 p-2 rounded border border-pink-500/10 leading-relaxed">
              ✨ Generate high-quality SDXL portrait of your build, then 🔮 lift it to a 3D mesh you can rotate + walk around with in Explore3D.
            </div>
            <button onClick={() => setShowAdvanced((s) => !s)} className="w-full text-left text-[10px] font-mono text-pink-300/70 hover:text-pink-300 transition">
              {showAdvanced ? '▾' : '▸'} Composed SDXL prompt preview
            </button>
            {showAdvanced && (
              <div className="text-[9px] font-mono text-gray-500 break-words leading-relaxed bg-black/40 p-2 rounded border border-white/5">
                <span className="text-pink-400">SDXL prompt: </span>{composedPrompt}
              </div>
            )}
          </>
        )}

        {/* Generate button — always visible across tabs */}
        <button onClick={generate} disabled={loading}
          className="w-full py-2.5 rounded text-xs font-mono font-bold bg-gradient-to-br from-pink-500/30 to-purple-500/30 text-pink-300 border border-pink-500/40 hover:from-pink-500/40 hover:to-purple-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition">
          {loading ? '⚡ Generating on RTX 5000…' : config.aiPortraitDataUrl ? '🔁 Regenerate with these settings' : '✨ Generate Character'}
        </button>

        {error && (
          <div className="text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        {/* Loading skeleton — shimmering placeholder during generation */}
        {loading && !config.aiPortraitDataUrl && (
          <div className="w-full max-w-[400px] mx-auto aspect-[3/4] rounded border border-pink-500/20 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-pink-500/5 animate-pulse flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full border-2 border-pink-400/30 border-t-pink-400 animate-spin" />
            <div className="text-[10px] font-mono text-pink-300/70 px-4 text-center">
              SDXL rendering on RTX 5000<br />
              <span className="text-[9px] text-pink-300/40">Cold-start ~30-60s · warm ~10-15s</span>
            </div>
          </div>
        )}

        {/* First-time placeholder — before any portrait exists */}
        {!loading && !config.aiPortraitDataUrl && (
          <div className="w-full max-w-[400px] mx-auto aspect-[3/4] rounded border-2 border-dashed border-pink-500/15 bg-pink-500/[0.02] flex flex-col items-center justify-center gap-2 text-pink-300/40">
            <div className="text-3xl">🎨</div>
            <div className="text-[10px] font-mono text-center px-4">Tweak the sliders above and tap<br /><span className="text-pink-300/70">✨ Generate Character</span><br />to see your build come to life</div>
          </div>
        )}

        {/* Portrait preview */}
        {config.aiPortraitDataUrl && (
          <div className="space-y-2">
            <div className="text-[9px] font-mono text-gray-500 uppercase">Your character:</div>
            <img src={config.aiPortraitDataUrl} alt="AI-generated character"
              className={`w-full max-w-[400px] mx-auto rounded border border-pink-500/20 ${loading ? 'opacity-40' : ''}`} />
            {loading && (
              <div className="text-[10px] font-mono text-pink-300 text-center animate-pulse">⚡ Regenerating with new settings…</div>
            )}
            {config.aiPortraitSeed != null && (
              <div className="text-[9px] font-mono text-gray-500 italic text-center">
                seed: {config.aiPortraitSeed} · tweak any slider + Regenerate to keep the same character
              </div>
            )}

            {/* Phase 16.3 — 3D mesh generation */}
            <div className="space-y-1 pt-2">
              <button onClick={generate3DMesh} disabled={meshLoading || loading}
                className="w-full py-2 rounded text-xs font-mono font-bold bg-gradient-to-br from-cyan-500/30 to-blue-500/30 text-cyan-200 border border-cyan-500/40 hover:from-cyan-500/40 hover:to-blue-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
                {meshLoading && <span className="inline-block w-3 h-3 rounded-full border border-cyan-400/30 border-t-cyan-400 animate-spin" />}
                {meshLoading ? 'Lifting to 3D on RTX 5000 — TripoSR ~25-40s' : config.aiGlbUrl ? '🔁 Regenerate 3D Mesh' : '🔮 Generate 3D Mesh (TripoSR)'}
              </button>
              {meshError && (
                <div className="text-[10px] font-mono text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2">
                  {meshError}
                </div>
              )}
              {config.aiGlbUrl && (
                <>
                  <div className="flex gap-2">
                    <button onClick={() => setViewer3DOpen(true)}
                      className="flex-1 py-1.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition">
                      🌀 Rotate 3D
                    </button>
                    <button onClick={() => update({ type: 'ai', humanGlbUrl: config.aiGlbUrl })}
                      className="flex-1 py-1.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition">
                      ✓ Save as Avatar
                    </button>
                  </div>
                  {/* Phase 16.10 — play your character in the worlds */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        update({ type: 'ai', humanGlbUrl: config.aiGlbUrl })
                        // Brief delay so update commits to storage before nav
                        setTimeout(() => { window.location.href = '/explore3d' }, 150)
                      }}
                      className="flex-1 py-2 rounded text-[10px] font-mono font-bold bg-gradient-to-br from-emerald-500/25 to-cyan-500/25 text-emerald-200 border border-emerald-500/40 hover:from-emerald-500/40 hover:to-cyan-500/40 transition shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      🚀 PLAY IN EXPLORE3D
                    </button>
                    <button
                      onClick={() => {
                        update({ type: 'ai', humanGlbUrl: config.aiGlbUrl })
                        setTimeout(() => { window.location.href = '/gallery3d' }, 150)
                      }}
                      className="flex-1 py-2 rounded text-[10px] font-mono font-bold bg-gradient-to-br from-purple-500/25 to-pink-500/25 text-purple-200 border border-purple-500/40 hover:from-purple-500/40 hover:to-pink-500/40 transition shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                      🎨 PLAY IN GALLERY3D
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 3D viewer modal */}
        {viewer3DOpen && config.aiGlbUrl && (
          <Mesh3DViewer glbUrl={config.aiGlbUrl} onClose={() => setViewer3DOpen(false)} />
        )}
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-pink-500/10 bg-black/40 flex items-center justify-between text-[8px] font-mono text-gray-600">
        <span>Powered by Lucy SDXL + TripoSR on anvil · RTX 5000</span>
        <span className="text-pink-500">🎨 Phase 16.18</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Mesh3DViewer — Three.js GLB viewer with OrbitControls.
// Modal overlay. Loads from data URL or remote URL. Auto-frames the model.
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// LivePreview3D — Phase 16.5
// Real-time 3D mannequin that morphs as the slider spec changes. The first
// step toward our own Ready Player Me replacement: open-source rigged
// humanoid GLB + per-spec material tints + per-spec body scale, all running
// in the browser in pure Three.js.
//
// v1 covers: build scale (slim/athletic/muscular/bulky), skin tone tint,
// top color tint (applied as a global accent). v2 will add face morph
// targets (when we get a rigged GLB with blendshapes), hair piece swaps,
// and outfit slot system.
// ─────────────────────────────────────────────────────────────────────────

// Phase 16.7 — body mannequin sources (full humanoid figure).
// XBot from threejs.org examples — guaranteed CORS-open, MIT licensed,
// rigged for animation. No face morph targets (body-only rig).
const BODY_MANNEQUIN_SOURCES = [
  'https://threejs.org/examples/models/gltf/Xbot.glb',
]

// Phase 16.7 — face mannequin sources (head with ARkit blendshapes).
// facecap.glb — 333KB MIT-licensed head from three.js examples, ships with
// all 52 ARkit face blendshapes (jawOpen, browInnerUp, cheekPuff, eyeWide_L/R,
// mouthSmile_L/R, noseSneer_L/R, etc). Loaded in FACE tab so precision
// sliders morph a real face in real-time.
//
// Phase 16.29 — threejs.org/examples + raw.githubusercontent.com keep failing
// in production (CORS / network / GitHub Pages cache). Added jsDelivr's
// GitHub-mirror CDN as primary — it has cache-friendly CORS and is more
// reliable in production. Falls back to the original sources.
//
// NOTE: facecap is HEAD ONLY. Body tab still uses XBot. Future ship can
// layer a body GLB + facecap as parented meshes for unified rendering.
const FACE_MANNEQUIN_SOURCES = [
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/models/gltf/facecap.glb',
  'https://threejs.org/examples/models/gltf/facecap.glb',
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/facecap.glb',
]

// Backwards-compat alias for any code that still references the old name
const MANNEQUIN_SOURCES = BODY_MANNEQUIN_SOURCES

const BUILD_SCALE: Record<AiBuildSpec['build'], { x: number; z: number }> = {
  slim:      { x: 0.85, z: 0.85 },
  athletic:  { x: 1.00, z: 1.00 },
  muscular:  { x: 1.15, z: 1.10 },
  bulky:     { x: 1.30, z: 1.20 },
}

const SKIN_HEX: Record<AiBuildSpec['skinTone'], string> = {
  fair: '#f3d5b5', light: '#e0b48d', medium: '#c08a5e',
  tan: '#a16641', brown: '#7a4a2b', dark: '#4a2e1a',
}

function LivePreview3D({ spec, face, bigMode }: { spec: AiBuildSpec; face: AiFaceSpec; bigMode?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Mutable refs to live Three.js objects — re-used across spec changes,
  // never re-mounted (would lose the camera angle the user dragged to).
  const modelRef = useRef<any>(null)
  const faceModelRef = useRef<any>(null)  // facecap.glb — head with 52 ARkit blendshapes
  const overlayGroupRef = useRef<any>(null)  // Phase 16.30 — primitive accessory overlays (hair/hat/glasses/beard/chain)
  const cameraRef = useRef<any>(null)
  const controlsRef = useRef<any>(null)
  const headBoneRef = useRef<any>(null)
  const modelHeightRef = useRef<number>(1.8)  // measured at load time
  const morphMeshesRef = useRef<any[]>([])
  const skinMatsRef = useRef<any[]>([])
  const accentMatsRef = useRef<any[]>([])
  const [ready, setReady] = useState(false)
  const [faceReady, setFaceReady] = useState(0)  // bumps when face GLB lands so camera re-frames
  const [faceLoadStatus, setFaceLoadStatus] = useState<'pending' | 'loaded' | 'failed'>('pending')
  const [loadError, setLoadError] = useState<string | null>(null)
  // bigMode = face tab — viewport gets taller on mobile, camera zooms to head.
  // Mobile heights via inline style; desktop overrides via Tailwind lg: classes
  // (lg:!h-full lg:!min-h-0) so on lg+ the viewport fills the sticky left
  // half of the parent's defined height (lg:h-[calc(100vh-200px)]).
  const mobileViewportHeight = bigMode ? 480 : 380

  // Mount the Three.js scene ONCE per panel mount.
  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    let disposed = false
    let rafId = 0
    let cleanup: (() => void) | null = null

    void Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/controls/OrbitControls.js'),
    ]).then(([THREE, { GLTFLoader }, { OrbitControls }]) => {
      if (disposed) return

      const width = container.clientWidth
      const height = container.clientHeight

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x0a0a0a)

      const camera = new THREE.PerspectiveCamera(35, width / height, 0.01, 100)
      camera.position.set(0, 1.3, 2.4)
      cameraRef.current = camera

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.setSize(width, height)
      container.appendChild(renderer.domElement)

      // Three-point lighting for clean character display
      scene.add(new THREE.AmbientLight(0xffffff, 0.45))
      const key = new THREE.DirectionalLight(0xffffff, 1.0)
      key.position.set(2, 3, 2); scene.add(key)
      const fill = new THREE.DirectionalLight(0x88ccff, 0.4)
      fill.position.set(-2, 1, -2); scene.add(fill)
      const rim = new THREE.DirectionalLight(0xff66cc, 0.5)
      rim.position.set(0, -1, -3); scene.add(rim)

      // Floor grid for spatial anchor
      const grid = new THREE.GridHelper(4, 12, 0x444466, 0x222244)
      ;(grid.material as any).transparent = true
      ;(grid.material as any).opacity = 0.35
      scene.add(grid)

      // Phase 16.30 — overlay group for primitive accessories (hair/hat/
      // glasses/beard/chain/etc). Sits in world space, repositioned in the
      // mutation effect to follow the body model's head height.
      const overlayGroup = new THREE.Group()
      scene.add(overlayGroup)
      overlayGroupRef.current = overlayGroup

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.1
      controls.target.set(0, 1, 0)
      controls.minDistance = 0.4
      controls.maxDistance = 5.0
      controls.maxPolarAngle = Math.PI * 0.9
      controlsRef.current = controls

      const loader = new GLTFLoader()
      // Load BODY mannequin (XBot) — visible by default, hidden in face mode.
      const tryLoadBody = (index: number) => {
        if (disposed) return
        if (index >= BODY_MANNEQUIN_SOURCES.length) return
        loader.load(
          BODY_MANNEQUIN_SOURCES[index],
          (gltf: any) => onBodyGltfLoaded(gltf, BODY_MANNEQUIN_SOURCES[index]),
          undefined,
          () => tryLoadBody(index + 1),
        )
      }
      // Load FACE mannequin (facecap.glb — 52 ARkit blendshapes) — hidden by
      // default, shown when face tab active. Sliders morph this in real-time.
      const tryLoadFace = (index: number) => {
        if (disposed) return
        if (index >= FACE_MANNEQUIN_SOURCES.length) {
          console.warn('[LivePreview3D] face mannequin all sources failed — falling back to body head zoom in face tab')
          setFaceLoadStatus('failed')
          return
        }
        loader.load(
          FACE_MANNEQUIN_SOURCES[index],
          (gltf: any) => onFaceGltfLoaded(gltf, FACE_MANNEQUIN_SOURCES[index]),
          undefined,
          (err: any) => {
            console.warn(`[LivePreview3D] face source ${FACE_MANNEQUIN_SOURCES[index]} failed:`, err?.message || err)
            tryLoadFace(index + 1)
          },
        )
      }
      const onBodyGltfLoaded = (gltf: any, sourceUrl: string) => {
          if (disposed) return
          const model = gltf.scene
          const meshes: any[] = []
          model.traverse((obj: any) => {
            if (obj.isMesh) meshes.push(obj)
            if (obj.isBone && /head|neck/i.test(obj.name)) headBoneRef.current = obj
          })
          if (meshes.length > 0) {
            meshes.forEach((m, i) => {
              m.material = m.material.clone()
              if (i === 0) skinMatsRef.current.push(m.material)
              else accentMatsRef.current.push(m.material)
              m.castShadow = true
              m.receiveShadow = true
            })
            if (accentMatsRef.current.length === 0) accentMatsRef.current.push(meshes[0].material)
          }
          const preBox = new THREE.Box3().setFromObject(model)
          const preCenter = new THREE.Vector3(); preBox.getCenter(preCenter)
          model.position.x -= preCenter.x
          model.position.z -= preCenter.z
          model.position.y -= preBox.min.y
          model.visible = !bigMode  // hidden in face mode
          scene.add(model)
          modelRef.current = model

          // Recompute bbox AFTER repositioning — use these dimensions to frame
          // the camera so the whole character is in view with breathing room.
          const box = new THREE.Box3().setFromObject(model)
          const size = new THREE.Vector3(); box.getSize(size)
          const modelHeight = size.y || 1.8
          modelHeightRef.current = modelHeight
          // Frame body: camera distance = ~1.8 * model height so the figure
          // fills the vertical viewport with a little headroom.
          const bodyDistance = modelHeight * 1.6
          const bodyTargetY = modelHeight * 0.5
          camera.position.set(0, bodyTargetY + modelHeight * 0.1, bodyDistance)
          controls.target.set(0, bodyTargetY, 0)
          controls.update()

          console.log(`[LivePreview3D] body loaded ${sourceUrl} — height ${modelHeight.toFixed(2)}u`)
          setReady(true)
        }

      // Face mannequin handler — populates morphMeshesRef so face sliders
      // drive real-time blendshape morphing (facecap has 52 ARkit shapes)
      const onFaceGltfLoaded = (gltf: any, sourceUrl: string) => {
        if (disposed) return
        const faceModel = gltf.scene
        faceModel.traverse((obj: any) => {
          if (obj.isMesh) {
            obj.castShadow = true
            obj.receiveShadow = true
            // facecap morph dictionary keys come prefixed "blendShape1.";
            // strip + re-register on bare ARkit names so our mapping table hits.
            if (obj.morphTargetDictionary && obj.morphTargetInfluences) {
              const cleaned: Record<string, number> = {}
              for (const [k, v] of Object.entries(obj.morphTargetDictionary)) {
                const bare = k.replace(/^.*?\./, '')
                cleaned[bare] = v as number
                cleaned[k] = v as number  // keep original key too for safety
              }
              obj.morphTargetDictionary = cleaned
              morphMeshesRef.current.push(obj)
            }
          }
        })
        // Center + scale face to roughly fill the face-mode camera framing
        const fBox = new THREE.Box3().setFromObject(faceModel)
        const fCenter = new THREE.Vector3(); fBox.getCenter(fCenter)
        const fSize = new THREE.Vector3(); fBox.getSize(fSize)
        const targetFaceHeight = 0.45  // ~head height in body-frame units
        const fScale = targetFaceHeight / Math.max(fSize.y, 0.001)
        faceModel.scale.setScalar(fScale)
        faceModel.position.x -= fCenter.x * fScale
        faceModel.position.y = 1.55 - fCenter.y * fScale  // head-level w/ XBot
        faceModel.position.z -= fCenter.z * fScale
        faceModel.visible = !!bigMode  // hidden in body mode
        scene.add(faceModel)
        faceModelRef.current = faceModel
        setFaceLoadStatus('loaded')
        const morphCount = morphMeshesRef.current.reduce((sum, m) => sum + (m.morphTargetInfluences?.length || 0), 0)
        console.log(`[LivePreview3D] face loaded ${sourceUrl} — ${morphCount} blendshapes wired`)
        // Re-trigger camera framing once face exists (camera effect re-runs)
        setFaceReady((n) => n + 1)
      }

      tryLoadBody(0)
      tryLoadFace(0)

      const onResize = () => {
        const w = container.clientWidth
        const h = container.clientHeight
        if (w === 0 || h === 0) return
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', onResize)

      // ResizeObserver catches container-size changes that DON'T fire window
      // resize (CSS layout settling, lg:h-full kicking in after CSS computes,
      // sticky positioning recalculating). Critical for the desktop side-by-
      // side layout where the container is 0×0 at mount then grows when CSS
      // finishes — without this, canvas was stuck at 0px and the whole left
      // half rendered black. Works on Chrome, Firefox, Edge, Safari 13.1+.
      let resizeObs: ResizeObserver | null = null
      if (typeof ResizeObserver !== 'undefined') {
        resizeObs = new ResizeObserver(() => onResize())
        resizeObs.observe(container)
      }
      // Belt-and-suspenders: also schedule delayed onResize calls to cover
      // the race between useEffect firing and the browser finishing layout.
      const resizeTimers = [
        setTimeout(onResize, 50),
        setTimeout(onResize, 200),
        setTimeout(onResize, 500),
      ]

      const tick = () => {
        if (disposed) return
        controls.update()
        renderer.render(scene, camera)
        rafId = requestAnimationFrame(tick)
      }
      tick()

      cleanup = () => {
        window.removeEventListener('resize', onResize)
        if (resizeObs) resizeObs.disconnect()
        resizeTimers.forEach(clearTimeout)
        controls.dispose()
        renderer.dispose()
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement)
        }
        scene.traverse((obj: any) => {
          if (obj.geometry) obj.geometry.dispose()
          if (obj.material) {
            const mat = obj.material as any
            if (Array.isArray(mat)) mat.forEach((m: any) => m.dispose())
            else mat.dispose()
          }
        })
      }
    })

    return () => {
      disposed = true
      if (rafId) cancelAnimationFrame(rafId)
      if (cleanup) cleanup()
    }
    // Run ONCE per mount — don't include spec, we mutate the live scene
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Phase 16.30 — accessory overlay rebuild. Fires on EVERY spec/face change
  // so users see immediate visual feedback for hair / hat / glasses / beard /
  // jewelry / outfit selections that XBot's body-only mesh can't show.
  // Primitives: hair sphere on head, hat on top, glasses band over eyes,
  // beard patch on chin, chain torus at neck, shirt band on torso.
  useEffect(() => {
    if (!ready || !overlayGroupRef.current) return
    const group = overlayGroupRef.current as any
    // Tear down old primitives
    while (group.children.length > 0) {
      const c = group.children[0]
      group.remove(c)
      if (c.geometry) c.geometry.dispose()
      if (c.material) { Array.isArray(c.material) ? c.material.forEach((m: any) => m.dispose()) : c.material.dispose() }
    }
    const h = modelHeightRef.current || 1.8
    // Approximate head center on XBot — about 92% of model height
    const headY = h * 0.92
    const headR = 0.16

    // Named-color hex map for accessories (subset of the full hair palette)
    const HAIR_HEX: Record<string, string> = {
      black: '#1a1a1a', brown: '#5a3520', blonde: '#d4a86c', red: '#a03838',
      silver: '#c0c0c0', cyan: '#22d3ee', pink: '#f472b6', purple: '#9333ea',
      rainbow: '#a855f7', platinum: '#e8e8d4', ginger: '#c05828', 'two-tone': '#5a3520',
    }
    const hairCol = new THREE.Color(spec.hairColorHex || HAIR_HEX[spec.hairColor] || '#1a1a1a')

    // HAIR — dome on top of head, sized by hairLength
    if (spec.hairLength !== 'bald') {
      const lenMap: Record<string, { r: number; y: number; t: number }> = {
        buzz:        { r: 0.17, y: 0.02, t: 0.4 },
        short:       { r: 0.19, y: 0.05, t: 0.6 },
        medium:      { r: 0.22, y: 0.12, t: 1.0 },
        long:        { r: 0.24, y: 0.22, t: 1.4 },
        'extra-long':{ r: 0.26, y: 0.32, t: 1.8 },
      }
      const conf = lenMap[spec.hairLength] || lenMap.short
      const hairMat = new THREE.MeshStandardMaterial({ color: hairCol, roughness: 0.85, metalness: 0.05 })
      // Cap dome
      const cap = new THREE.Mesh(new THREE.SphereGeometry(conf.r, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), hairMat)
      cap.position.set(0, headY + conf.y, 0)
      group.add(cap)
      // Trailing hair for medium/long/extra-long — cylinders dropping behind head
      if (conf.t > 0.5) {
        const trail = new THREE.Mesh(new THREE.CylinderGeometry(conf.r * 0.85, conf.r * 0.65, conf.t, 12), hairMat)
        trail.position.set(0, headY - conf.t * 0.4, -0.04)
        group.add(trail)
      }
      // Style accent — mohawk strip on top, dreads as small spheres
      if (spec.hairStyle === 'mohawk' || spec.hairStyle === 'fauxhawk') {
        const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.32), hairMat)
        ridge.position.set(0, headY + 0.18, 0)
        group.add(ridge)
      }
      if (spec.hairStyle === 'dreads' || spec.hairStyle === 'locs' || spec.hairStyle === 'twists' || spec.hairStyle === 'braids' || spec.hairStyle === 'cornrows') {
        for (let i = -2; i <= 2; i++) {
          const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, conf.t * 0.9, 8), hairMat)
          strand.position.set(i * 0.06, headY - conf.t * 0.3, -0.06)
          group.add(strand)
        }
      }
    }

    // HEADWEAR — colored cap above the head
    if (spec.headwear !== 'none') {
      const hatColors: Record<string, number> = {
        snapback: 0x1a1a1a, 'fitted-cap': 0x1a1a1a, beanie: 0xa03838, 'bucket-hat': 0x1a3a1a,
        cowboy: 0x5a3520, fedora: 0x2a1810, headband: 0xfacc15, durag: 0x1a1a1a, visor: 0x22d3ee,
        'wide-brim': 0x2a1810, 'top-hat': 0x0a0a0a, crown: 0xfacc15, helmet: 0x4a4a4a, turban: 0xfafafa, hood: 0x1a1a1a,
      }
      const hatMat = new THREE.MeshStandardMaterial({ color: hatColors[spec.headwear] || 0x1a1a1a, metalness: 0.2, roughness: 0.7 })
      let hatMesh: any
      if (spec.headwear === 'top-hat' || spec.headwear === 'fedora') {
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, spec.headwear === 'top-hat' ? 0.32 : 0.16, 16), hatMat)
        top.position.set(0, headY + (spec.headwear === 'top-hat' ? 0.27 : 0.20), 0)
        group.add(top)
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.025, 24), hatMat)
        brim.position.set(0, headY + 0.13, 0)
        group.add(brim)
      } else if (spec.headwear === 'crown') {
        hatMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.10, 8), hatMat)
        hatMesh.position.set(0, headY + 0.18, 0)
        group.add(hatMesh)
      } else if (spec.headwear === 'beanie' || spec.headwear === 'helmet' || spec.headwear === 'hood' || spec.headwear === 'turban' || spec.headwear === 'durag') {
        hatMesh = new THREE.Mesh(new THREE.SphereGeometry(headR + 0.04, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), hatMat)
        hatMesh.position.set(0, headY + 0.05, 0)
        group.add(hatMesh)
      } else if (spec.headwear === 'headband' || spec.headwear === 'visor') {
        hatMesh = new THREE.Mesh(new THREE.TorusGeometry(headR + 0.01, 0.02, 8, 24), hatMat)
        hatMesh.position.set(0, headY + 0.02, 0)
        hatMesh.rotation.x = Math.PI / 2
        group.add(hatMesh)
      } else {
        // Generic cap (snapback / fitted / bucket / cowboy / wide-brim)
        hatMesh = new THREE.Mesh(new THREE.SphereGeometry(headR + 0.03, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), hatMat)
        hatMesh.position.set(0, headY + 0.10, 0)
        group.add(hatMesh)
        const brim = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.18), hatMat)
        brim.position.set(0, headY + 0.10, 0.12)
        brim.rotation.x = -Math.PI / 2
        group.add(brim)
      }
    }

    // EYEWEAR — black band over eye area
    if (spec.eyewear !== 'none') {
      const tint = spec.eyewearColor ? new THREE.Color(spec.eyewearColor) : new THREE.Color(0x0a0a0a)
      const lensMat = new THREE.MeshStandardMaterial({ color: tint, metalness: 0.8, roughness: 0.15, transparent: true, opacity: 0.85 })
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.04), lensMat)
      lens.position.set(0, headY - 0.02, headR - 0.01)
      group.add(lens)
    }

    // FACE-TAB GLASSES (separate from outfit eyewear above — face tab adds its own)
    if (face.glasses && face.glasses !== 'none') {
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.8, roughness: 0.15, transparent: true, opacity: 0.7 })
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.04), lensMat)
      lens.position.set(0, headY - 0.02, headR - 0.01)
      group.add(lens)
    }

    // BEARD — dark patch on lower face if facialHair ≠ clean
    if (spec.facialHair !== 'clean') {
      const beardMat = new THREE.MeshStandardMaterial({ color: hairCol, roughness: 0.95 })
      const beardSize: Record<string, [number, number]> = {
        stubble:      [0.18, 0.04],
        goatee:       [0.10, 0.08],
        beard:        [0.20, 0.14],
        mustache:     [0.10, 0.03],
        'fu-manchu':  [0.10, 0.10],
        'mutton-chops':[0.22, 0.12],
        'soul-patch': [0.04, 0.05],
        'full-bushy': [0.24, 0.18],
      }
      const [w, hh] = beardSize[spec.facialHair] || [0.18, 0.10]
      const beard = new THREE.Mesh(new THREE.BoxGeometry(w, hh, 0.04), beardMat)
      beard.position.set(0, headY - 0.08, headR - 0.02)
      group.add(beard)
    }

    // JEWELRY — chain torus at neck
    if (spec.jewelry && spec.jewelry !== 'none') {
      const metalColor: Record<string, number> = {
        gold: 0xfacc15, silver: 0xc0c0c0, 'rose-gold': 0xb76e79,
        platinum: 0xe5e4e2, iridium: 0x9090a0, custom: 0xfacc15,
      }
      const baseCol = spec.jewelryColor && spec.jewelryMetal === 'custom'
        ? new THREE.Color(spec.jewelryColor)
        : new THREE.Color(metalColor[spec.jewelryMetal || 'gold'] || 0xfacc15)
      const chainMat = new THREE.MeshStandardMaterial({ color: baseCol, metalness: 0.9, roughness: 0.2, emissive: baseCol, emissiveIntensity: 0.05 })
      const chain = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.014, 8, 24), chainMat)
      chain.position.set(0, headY - 0.22, 0)
      chain.rotation.x = Math.PI / 2
      group.add(chain)
      // Pendant for some jewelry types
      if (spec.jewelry === 'pendant' || spec.jewelry === 'cuban-link' || spec.jewelry === 'all-jewelry') {
        const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), chainMat)
        pendant.position.set(0, headY - 0.30, 0.07)
        group.add(pendant)
      }
    }

    // OUTFIT TOP COLOR INDICATOR — colored band on torso so user sees top color change
    const torsoMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.topColor), metalness: 0.1, roughness: 0.7, transparent: true, opacity: 0.65 })
    const torsoBand = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.30, 0.55, 16, 1, true), torsoMat)
    torsoBand.position.set(0, headY * 0.62, 0)
    group.add(torsoBand)

    // JACKET — additional band over the torso
    if (spec.jacket && spec.jacket !== 'none') {
      const jacketCol = new THREE.Color(spec.jacketColor || spec.topColor).offsetHSL(0, 0, -0.1)
      const jacketMat = new THREE.MeshStandardMaterial({ color: jacketCol, metalness: 0.15, roughness: 0.6, transparent: true, opacity: 0.5 })
      const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.65, 16, 1, true), jacketMat)
      jacket.position.set(0, headY * 0.6, 0)
      group.add(jacket)
    }

    // Phase 16.33 — FACE-TAB PRIMITIVE OVERLAYS. Without facecap.glb,
    // face-shape / eye-color / lip / brow / freckle picks couldn't morph
    // anything. These primitives sit at the face plane (z = headR + 0.01)
    // and visibly change with every face-tab click.
    const EYE_HEX: Record<string, string> = {
      brown: '#5a3a20', blue: '#3d7bb8', green: '#3a7a4a', hazel: '#a07a3a',
      grey: '#7a7a7a', amber: '#c08c2a', violet: '#9a4ac0', heterochromia: '#5a3a20',
    }
    const LIP_HEX: Record<string, string> = {
      natural: '#c08070', red: '#c93838', dark: '#5a2030', glossy: '#d89090',
      matte: '#a06060', nude: '#c8a08a', berry: '#8a2a4a', black: '#1a0a0a',
    }

    // FACE SHAPE — head ellipsoid scaled to match face shape preset
    const faceShapeScale: Record<string, [number, number, number]> = {
      oval:     [1.0,  1.0,  1.0],
      round:    [1.15, 0.95, 1.0],
      square:   [1.15, 1.0,  1.0],
      heart:    [1.1,  1.0,  1.0],  // wide top
      diamond:  [0.95, 1.05, 1.0],
      oblong:   [0.95, 1.15, 1.0],
      triangle: [1.05, 1.0,  1.0],
    }
    const fs = faceShapeScale[face.faceShape] || [1, 1, 1]
    const faceMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.skinHex || SKIN_HEX[spec.skinTone]),
      roughness: 0.85, metalness: 0.05,
      transparent: true, opacity: 0.55,
    })
    const faceShape = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.95, 24, 18), faceMat)
    faceShape.scale.set(fs[0], fs[1], fs[2])
    faceShape.position.set(0, headY - 0.02, 0.02)
    group.add(faceShape)

    // EYES — left + right small spheres on the face plane
    const eyeColor = face.eyeColorHex ? new THREE.Color(face.eyeColorHex) : new THREE.Color(EYE_HEX[face.eyeColor] || '#5a3a20')
    const eyeShapeScale: Record<string, [number, number]> = {
      almond:     [1.4, 0.8],
      round:      [1.0, 1.0],
      hooded:     [1.2, 0.6],
      upturned:   [1.3, 0.7],
      downturned: [1.3, 0.7],
      monolid:    [1.3, 0.5],
      'wide-set': [1.0, 0.9],
      'close-set':[1.0, 0.9],
    }
    const es = eyeShapeScale[face.eyeShape] || [1.2, 0.8]
    const eyeSep = face.eyeShape === 'wide-set' ? 0.075 : face.eyeShape === 'close-set' ? 0.045 : 0.06
    ;[-1, 1].forEach((side) => {
      // For heterochromia: right eye gets a different color
      const thisEyeColor = (face.eyeColor === 'heterochromia' && side === 1)
        ? new THREE.Color('#3d7bb8')
        : eyeColor
      const eyeMat = new THREE.MeshStandardMaterial({
        color: thisEyeColor,
        emissive: thisEyeColor,
        emissiveIntensity: 0.15,
        metalness: 0.4, roughness: 0.3,
      })
      const eyeGeo = new THREE.SphereGeometry(0.022, 10, 8)
      const eye = new THREE.Mesh(eyeGeo, eyeMat)
      eye.scale.set(es[0], es[1], 1)
      const tiltY = face.eyeShape === 'upturned' ? 0.005 : face.eyeShape === 'downturned' ? -0.005 : 0
      eye.position.set(side * eyeSep, headY + 0.005 + tiltY * side, headR - 0.005)
      group.add(eye)
    })

    // EYEBROWS — thin horizontal bar above each eye
    const browColor = new THREE.Color(spec.hairColorHex || HAIR_HEX[spec.hairColor] || '#1a1a1a')
    const browMat = new THREE.MeshStandardMaterial({ color: browColor, roughness: 0.95 })
    const browThickness: Record<string, number> = {
      arched: 0.008, straight: 0.008, rounded: 0.009, angled: 0.008,
      soft: 0.007, feathered: 0.008, 'thin-line': 0.004, bold: 0.014,
    }
    const browH = browThickness[face.eyebrowShape] || 0.008
    ;[-1, 1].forEach((side) => {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.05, browH, 0.012), browMat)
      const tilt = face.eyebrowShape === 'arched' ? -0.15 * side
                 : face.eyebrowShape === 'angled' ? -0.25 * side
                 : 0
      brow.position.set(side * eyeSep, headY + 0.035, headR - 0.002)
      brow.rotation.z = tilt
      group.add(brow)
    })

    // LIPS — colored box at the mouth line
    const lipColor = face.lipColorHex ? new THREE.Color(face.lipColorHex) : new THREE.Color(LIP_HEX[face.lipColor] || '#c08070')
    const lipMat = new THREE.MeshStandardMaterial({ color: lipColor, roughness: 0.6 })
    const lipDims: Record<string, [number, number]> = {
      full:      [0.06, 0.020],
      thin:      [0.05, 0.008],
      heart:     [0.05, 0.018],
      wide:      [0.08, 0.014],
      bow:       [0.05, 0.018],
      asymmetric:[0.06, 0.015],
      pouty:     [0.05, 0.025],
    }
    const [lw, lh] = lipDims[face.lipShape] || [0.06, 0.018]
    const lips = new THREE.Mesh(new THREE.BoxGeometry(lw, lh, 0.015), lipMat)
    lips.position.set(0, headY - 0.07, headR - 0.005)
    group.add(lips)

    // FRECKLES — sprinkle of small dots on cheeks if intensity > 0.2
    if (face.freckles > 0.2) {
      const freckleMat = new THREE.MeshBasicMaterial({ color: 0x8a5a3a, transparent: true, opacity: face.freckles })
      const freckleCount = Math.round(face.freckles * 14)
      for (let i = 0; i < freckleCount; i++) {
        const angle = (i / freckleCount) * Math.PI * 2
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 4), freckleMat)
        const r = 0.04 + Math.random() * 0.04
        dot.position.set(Math.cos(angle) * r, headY - 0.01 + (Math.random() - 0.5) * 0.03, headR - 0.001)
        group.add(dot)
      }
    }

    // DIMPLES — small indents (rendered as darker dots) on cheek/chin
    if (face.dimples !== 'none') {
      const dimpleMat = new THREE.MeshBasicMaterial({ color: 0x5a3a20, transparent: true, opacity: 0.5 })
      if (face.dimples === 'cheek' || face.dimples === 'both') {
        ;[-1, 1].forEach((side) => {
          const d = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), dimpleMat)
          d.position.set(side * 0.07, headY - 0.05, headR - 0.001)
          group.add(d)
        })
      }
      if (face.dimples === 'chin' || face.dimples === 'both') {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), dimpleMat)
        d.position.set(0, headY - 0.11, headR - 0.001)
        group.add(d)
      }
    }

    // MOLES / beauty marks — single dot at a specific position
    if (face.moles !== 'none') {
      const moleMat = new THREE.MeshBasicMaterial({ color: 0x2a1810 })
      const mole = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), moleMat)
      if (face.moles === 'single-cheek') mole.position.set(0.05, headY - 0.03, headR - 0.001)
      else if (face.moles === 'lip-corner') mole.position.set(0.04, headY - 0.07, headR - 0.001)
      else if (face.moles === 'beauty-mark') mole.position.set(0.025, headY - 0.04, headR - 0.001)
      else if (face.moles === 'scattered') {
        for (let i = 0; i < 3; i++) {
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 4), moleMat)
          m.position.set((Math.random() - 0.5) * 0.12, headY - 0.04 + (Math.random() - 0.5) * 0.04, headR - 0.001)
          group.add(m)
        }
        return
      }
      group.add(mole)
    }

    // MAKEUP — colored tint band across upper face if non-natural
    if (face.makeup !== 'none' && face.makeup !== 'natural') {
      const makeupColor: Record<string, number> = {
        glam: 0xc73a8a, dramatic: 0x4a0a0a, cyber: 0x22d3ee,
        festival: 0xfacc15, gothic: 0x1a0a1a, minimalist: 0xb8a890,
      }
      const mkMat = new THREE.MeshBasicMaterial({ color: makeupColor[face.makeup] || 0xc73a8a, transparent: true, opacity: 0.35 })
      const mk = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.04), mkMat)
      mk.position.set(0, headY + 0.018, headR - 0.001)
      group.add(mk)
    }
  }, [
    ready,
    spec.hairLength, spec.hairStyle, spec.hairColor, spec.hairColorHex,
    spec.facialHair, spec.headwear, spec.eyewear, spec.eyewearColor,
    spec.jewelry, spec.jewelryMetal, spec.jewelryColor,
    spec.topColor, spec.jacket, spec.jacketColor,
    spec.skinTone, spec.skinHex,
    face.faceShape, face.eyeShape, face.eyeColor, face.eyeColorHex,
    face.eyebrowShape, face.lipShape, face.lipColor, face.lipColorHex,
    face.freckles, face.dimples, face.moles, face.makeup,
    face.glasses,
  ])

  // Per-spec MUTATION effect — runs on every spec change, never re-mounts.
  // Phase 16.29 — expanded to honor heightLabel, shoulders, waist, skinHex
  // so more slider changes have a visible live-preview effect.
  useEffect(() => {
    if (!ready || !modelRef.current) return
    const model = modelRef.current
    // Build scale — slim/athletic/muscular/bulky changes x/z
    const buildScale = BUILD_SCALE[spec.build]
    // Gender height modifier (purely cosmetic — fem slightly shorter)
    const genderMul = spec.gender === 'fem' ? 0.96 : spec.gender === 'masc' ? 1.0 : 0.98
    // Phase 16.29 — heightLabel multiplies y scale (short→towering)
    const heightMulMap: Record<string, number> = { short: 0.85, average: 1.0, tall: 1.15, towering: 1.3 }
    const heightMul = heightMulMap[spec.heightLabel] || 1.0
    // Shoulders + waist nudge x scale on top of build
    const shouldersBonus = spec.shoulders === 'broad' ? 1.1 : spec.shoulders === 'narrow' ? 0.92 : 1.0
    const waistBonus = spec.waist === 'thick' ? 1.08 : spec.waist === 'slim' ? 0.94 : 1.0
    model.scale.set(
      buildScale.x * shouldersBonus * waistBonus,
      genderMul * heightMul,
      buildScale.z * shouldersBonus,
    )

    // Skin tone tint — apply to skin materials (skinHex overrides preset)
    const skinHex = spec.skinHex || SKIN_HEX[spec.skinTone]
    const skinColor = new THREE.Color(skinHex)
    skinMatsRef.current.forEach((mat: any) => {
      if (mat?.color) mat.color.copy(skinColor)
    })

    // Top color → accent materials (clothing on XBot)
    const topColor = new THREE.Color(spec.topColor)
    accentMatsRef.current.forEach((mat: any) => {
      if (mat?.color) mat.color.copy(topColor)
    })
  }, [
    ready, spec.build, spec.gender, spec.skinTone, spec.skinHex,
    spec.topColor, spec.accentColor, spec.heightLabel, spec.shoulders, spec.waist,
  ])

  // Face morph effect — writes the precision-slider values to morphTargetInfluences
  // on any meshes that have them. No-op when current mannequin (XBot) lacks
  // face blendshapes; lights up live the moment a rigged GLB with morphs lands
  // in Phase 16.7.
  useEffect(() => {
    if (!ready) return
    const meshes = morphMeshesRef.current
    if (meshes.length === 0) return
    // ARkit-style blendshape names that our face spec maps to. If the GLB's
    // morph target dictionary contains these keys, we write the slider value
    // to the corresponding influence. Range: face spec is -1..1, blendshapes
    // are 0..1 — so we map negative half to one shape, positive half to its
    // mirror counterpart when present.
    const mappings: Array<{ key: keyof AiFaceSpec; pos: string[]; neg?: string[] }> = [
      { key: 'jawWidth',     pos: ['jawOpen', 'jaw_width_up', 'JawWide'],            neg: ['jaw_width_dn', 'JawNarrow'] },
      { key: 'jawLength',    pos: ['jaw_length_up', 'JawForward'],                    neg: ['jaw_length_dn', 'JawShort'] },
      { key: 'noseSize',     pos: ['noseSneerLeft', 'nose_size_up', 'NoseBig'] },
      { key: 'noseWidth',    pos: ['nose_width_up', 'NoseWide'],                       neg: ['NoseNarrow'] },
      { key: 'cheekbones',   pos: ['cheekPuff', 'CheekUp', 'cheekbone_up'],            neg: ['cheekbone_dn'] },
      { key: 'brow',         pos: ['browInnerUp', 'BrowUp'],                            neg: ['browDown_L', 'BrowDown'] },
      { key: 'browThickness',pos: ['brow_thick_up', 'BrowThick'] },
      { key: 'eyeSize',      pos: ['eyeWideLeft', 'EyeWide', 'eye_size_up'],            neg: ['eyeSquintLeft', 'EyeSmall'] },
      { key: 'lipThickness', pos: ['lip_thickness_up', 'MouthFat'],                    neg: ['lip_thickness_dn', 'MouthThin'] },
      { key: 'chinTip',      pos: ['chin_tip_up', 'ChinForward'],                       neg: ['chin_tip_dn', 'ChinBack'] },
    ]
    meshes.forEach((mesh: any) => {
      const dict = mesh.morphTargetDictionary || {}
      mappings.forEach(({ key, pos, neg }) => {
        const v = face[key] as number
        if (typeof v !== 'number') return
        const posIdx = pos.map((n) => dict[n]).find((i) => typeof i === 'number')
        const negIdx = neg?.map((n) => dict[n]).find((i) => typeof i === 'number')
        if (typeof posIdx === 'number') mesh.morphTargetInfluences[posIdx] = Math.max(0, v)
        if (typeof negIdx === 'number') mesh.morphTargetInfluences[negIdx] = Math.max(0, -v)
      })
    })
  }, [ready, face])

  // Camera-zoom effect — face mode zooms to head, body mode shows full figure.
  // Visibility toggle: when face GLB loaded, hide body + show face. If face
  // GLB FAILED to load (network/CORS/etc), keep body visible and zoom to
  // body's head — user always sees SOMETHING instead of black void.
  useEffect(() => {
    if (!ready || !cameraRef.current || !controlsRef.current) return
    const camera = cameraRef.current
    const controls = controlsRef.current
    const h = modelHeightRef.current || 1.8
    const hasFaceModel = !!faceModelRef.current
    // Visibility — body shown by default. Only hide in face mode IF we have
    // a working face model to show in its place.
    if (modelRef.current) modelRef.current.visible = !bigMode || !hasFaceModel
    if (faceModelRef.current) faceModelRef.current.visible = !!bigMode
    if (bigMode) {
      if (hasFaceModel) {
        // Face GLB loaded — target the FACE model's actual bounding box center.
        const fBox = new THREE.Box3().setFromObject(faceModelRef.current)
        const fCenter = new THREE.Vector3(); fBox.getCenter(fCenter)
        const fSize = new THREE.Vector3(); fBox.getSize(fSize)
        const targetY = fSize.y > 0 ? fCenter.y : 1.55
        const dist = fSize.y > 0 ? Math.max(fSize.y * 3, 0.8) : 1.0
        camera.position.set(0, targetY, dist)
        controls.target.set(0, targetY, 0)
      } else {
        // No face GLB — fall back to body's head area so something is visible.
        // Use head bone if rigged, else top 88% of model height.
        let headY = h * 0.88
        if (headBoneRef.current) {
          const v = new THREE.Vector3()
          headBoneRef.current.getWorldPosition(v)
          if (v.y > 0) headY = v.y
        }
        camera.position.set(0, headY, h * 0.7)
        controls.target.set(0, headY, 0)
      }
    } else {
      // Body mode: frame the full figure INCLUDING the head + hair primitives
      // above it. Old framing cut off the head; pull camera back + raise
      // target so the whole figure is visible plus ~30% headroom above for
      // hats/hair primitive accessories.
      const targetY = h * 0.55  // slightly above body center
      camera.position.set(0, targetY + h * 0.2, h * 1.9)
      controls.target.set(0, targetY, 0)
    }
    controls.update()
  }, [ready, bigMode, faceReady])

  return (
    <div
      className="relative bg-black border-b border-pink-500/10 lg:border-b-0 transition-all duration-300 lg:!h-full lg:!min-h-0"
      style={{ height: mobileViewportHeight }}
    >
      <div ref={containerRef} className="absolute inset-0" />
      {!ready && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center text-pink-300/60 font-mono text-[10px]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border border-pink-400/30 border-t-pink-400 animate-spin" />
            Loading live mannequin…
          </div>
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center text-yellow-400/70 font-mono text-[10px] text-center px-4">
          {loadError} · sliders still work, just no 3D preview
        </div>
      )}
      {ready && (
        <>
          {/* Phase 16.31 — ALWAYS-VISIBLE SPEC SUMMARY STRIP. Guarantees the
              user sees text feedback for every pick even if a 3D primitive
              isn't visible against the mannequin (e.g. black hair on dark
              XBot). Updates instantly on every spec/face change. */}
          <div className="absolute top-2 left-2 right-2 flex flex-wrap items-center gap-1 pointer-events-none text-[9px] font-mono">
            <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-pink-500/40 text-pink-300">
              {spec.gender === 'masc' ? '♂' : spec.gender === 'fem' ? '♀' : '◐'} {spec.ageGroup} {spec.build}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-amber-500/40 text-amber-300">
              {spec.heightLabel} · {spec.skinTone}
            </span>
            {spec.hairLength !== 'bald' && (
              <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-fuchsia-500/40 text-fuchsia-300">
                {spec.hairLength} {spec.hairStyle} {spec.hairColor}
              </span>
            )}
            {spec.facialHair !== 'clean' && (
              <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-orange-500/40 text-orange-300">
                {spec.facialHair}
              </span>
            )}
            {spec.headwear !== 'none' && (
              <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-cyan-500/40 text-cyan-300">
                🎩 {spec.headwear}
              </span>
            )}
            {spec.eyewear !== 'none' && (
              <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-cyan-500/40 text-cyan-300">
                🕶 {spec.eyewear}
              </span>
            )}
            {spec.jewelry !== 'none' && (
              <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-yellow-500/40 text-yellow-300">
                💎 {spec.jewelry}
              </span>
            )}
            {spec.tattoos !== 'none' && (
              <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-purple-500/40 text-purple-300">
                tat: {spec.tattoos}
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-emerald-500/40 text-emerald-300">
              👕 {spec.topPiece}{spec.jacket !== 'none' ? ` + ${spec.jacket}` : ''}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-emerald-500/40 text-emerald-300">
              {spec.bottomPiece} · {spec.shoes}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-rose-500/40 text-rose-300">
              ✨ {spec.vibe}
            </span>
            {bigMode && (face.faceShape !== 'oval' || face.eyeColor !== 'brown' || face.makeup !== 'none') && (
              <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-pink-500/40 text-pink-300">
                😀 {face.faceShape} · {face.eyeShape} {face.eyeColor}
                {face.makeup !== 'none' && ` · ${face.makeup}`}
              </span>
            )}
          </div>
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[8px] font-mono text-pink-400/60 pointer-events-none">
            <span>
              {bigMode ? '😀 FACE BUILDER' : '🎮 LIVE 3D'} · drag to rotate
              {bigMode && faceLoadStatus === 'failed' && <span className="ml-2 text-yellow-400">⚠ face GLB unreachable</span>}
              {bigMode && faceLoadStatus === 'pending' && <span className="ml-2 text-cyan-400">↻ loading face mesh…</span>}
              {!bigMode && <span className="ml-2 text-pink-300/80">tap ✨ Generate for full character</span>}
            </span>
            <span>scroll to zoom</span>
          </div>
        </>
      )}
    </div>
  )
}

// FaceSlider — precision -1..1 slider matching InZOI's face customizer.
// Snap to 0 when very close to center (forgiving UX).
function FaceSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const display = Math.round(value * 100)
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-gray-400">{label}</span>
        <span className={display === 0 ? 'text-gray-600' : display > 0 ? 'text-pink-400' : 'text-cyan-400'}>{display > 0 ? `+${display}` : display}</span>
      </div>
      <input
        type="range"
        min={-100}
        max={100}
        step={1}
        value={display}
        onChange={(e) => {
          const v = Number(e.target.value) / 100
          onChange(Math.abs(v) < 0.05 ? 0 : v)
        }}
        className="w-full h-1 rounded appearance-none cursor-pointer bg-gradient-to-r from-cyan-500/30 via-gray-700 to-pink-500/30 accent-pink-400"
        style={{ accentColor: '#f472b6' }}
      />
    </div>
  )
}

function Mesh3DViewer({ glbUrl, onClose }: { glbUrl: string; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Esc-to-close + body-scroll lock while viewer open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    let disposed = false
    let rafId = 0
    let cleanup: (() => void) | null = null

    // Dynamic import keeps three.js out of the main bundle for users who never tap the viewer
    void Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/controls/OrbitControls.js'),
    ]).then(([THREE, { GLTFLoader }, { OrbitControls }]) => {
      if (disposed) return

      const width = container.clientWidth
      const height = container.clientHeight

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x0a0a0a)

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100)
      camera.position.set(0, 0.5, 2.5)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.setSize(width, height)
      container.appendChild(renderer.domElement)

      // Lighting — three-point setup for clean character display
      const ambient = new THREE.AmbientLight(0xffffff, 0.45)
      scene.add(ambient)
      const key = new THREE.DirectionalLight(0xffffff, 1.0)
      key.position.set(2, 3, 2)
      scene.add(key)
      const fill = new THREE.DirectionalLight(0x88ccff, 0.4)
      fill.position.set(-2, 1, -2)
      scene.add(fill)
      const rim = new THREE.DirectionalLight(0xff66cc, 0.6)
      rim.position.set(0, -1, -3)
      scene.add(rim)

      // Floor grid for spatial anchor
      const grid = new THREE.GridHelper(4, 16, 0x222244, 0x111122)
      ;(grid.material as THREE.Material).transparent = true
      ;(grid.material as THREE.Material).opacity = 0.4
      scene.add(grid)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.1
      controls.autoRotate = true
      controls.autoRotateSpeed = 1.2
      controls.target.set(0, 0.5, 0)

      const loader = new GLTFLoader()
      loader.load(
        glbUrl,
        (gltf: any) => {
          if (disposed) return
          const model = gltf.scene as any
          // Auto-frame: compute bounding box, scale to fit ~1.5 units, recenter
          const box = new THREE.Box3().setFromObject(model)
          const size = new THREE.Vector3()
          box.getSize(size)
          const maxDim = Math.max(size.x, size.y, size.z)
          if (maxDim > 0) {
            const targetSize = 1.5
            model.scale.setScalar(targetSize / maxDim)
          }
          const newBox = new THREE.Box3().setFromObject(model)
          const center = new THREE.Vector3()
          newBox.getCenter(center)
          model.position.sub(center)  // center at origin
          model.position.y += (newBox.max.y - newBox.min.y) / 2  // sit on grid plane
          scene.add(model)
        },
        undefined,
        (err: any) => {
          console.error('[Mesh3DViewer] GLB load failed:', err)
        }
      )

      const onResize = () => {
        const w = container.clientWidth
        const h = container.clientHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', onResize)

      const tick = () => {
        if (disposed) return
        controls.update()
        renderer.render(scene, camera)
        rafId = requestAnimationFrame(tick)
      }
      tick()

      cleanup = () => {
        window.removeEventListener('resize', onResize)
        controls.dispose()
        renderer.dispose()
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement)
        }
        scene.traverse((obj: any) => {
          if (obj.geometry) obj.geometry.dispose()
          if (obj.material) {
            const mat = obj.material as any
            if (Array.isArray(mat)) mat.forEach((m: any) => m.dispose())
            else mat.dispose()
          }
        })
      }
    })

    return () => {
      disposed = true
      if (rafId) cancelAnimationFrame(rafId)
      if (cleanup) cleanup()
    }
  }, [glbUrl])

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-black border border-cyan-500/30 rounded-xl shadow-[0_0_40px_rgba(34,211,238,0.3)] max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-2 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="font-mono text-xs text-cyan-300">🌀 3D Character — drag to rotate · scroll to zoom · auto-spinning</div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
        </div>
        <div ref={containerRef} className="flex-1 min-h-[500px] bg-[#0a0a0a]" />
        <div className="px-4 py-2 border-t border-cyan-500/20 bg-black/50 text-[10px] font-mono text-cyan-500/70 flex items-center justify-between">
          <span>TripoSR · 550M params · RTX 5000 Turing</span>
          <a href={glbUrl} download="character.glb" className="text-cyan-400 hover:text-cyan-300">⬇ Download GLB</a>
        </div>
      </div>
    </div>
  )
}

// Small helper components for the slider UI
function pillCls(active: boolean): string {
  return `px-3 py-1 rounded text-[10px] font-mono ${active ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`
}

function PickerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">{label}</div>
      {children}
    </div>
  )
}

// Phase 16.19 — CustomColorBtn — a circular swatch that opens the browser's
// native color picker. Use alongside named-color swatches to give users the
// full color spectrum for any color-bearing field (hair, lips, eyes, clothing,
// shoes, jewelry, etc). Clicking the gradient ring opens picker; clearing
// resets to the named preset.
function CustomColorBtn({ value, onChange, fallback }: { value?: string; onChange: (hex: string | undefined) => void; fallback: string }) {
  const active = !!value
  return (
    <div className="relative inline-flex items-center">
      <input
        type="color"
        value={value || fallback}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-7 h-7 opacity-0 cursor-pointer"
        title="custom color picker"
      />
      <div
        className={`w-7 h-7 rounded-full border-2 transition pointer-events-none ${active ? 'border-pink-400 scale-110' : 'border-white/30 hover:border-pink-300'}`}
        style={{
          background: 'conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)',
        }}
        aria-label="custom color"
      />
      {active && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(undefined) }}
          className="ml-1 text-[8px] font-mono text-gray-500 hover:text-pink-300"
          title="reset to named preset"
        >×</button>
      )}
    </div>
  )
}

function ChipRow({ value, options, onPick }: { value: string; options: Array<[string, string]>; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(([v, label]) => {
        const active = value === v
        return (
          <button key={v} onClick={() => onPick(v)}
            className={`px-2 py-1 rounded text-[10px] font-mono transition ${active ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40' : 'bg-white/[0.02] text-gray-400 border border-white/5 hover:bg-white/[0.05] hover:text-white'}`}>
            {label}
          </button>
        )
      })}
    </div>
  )
}
