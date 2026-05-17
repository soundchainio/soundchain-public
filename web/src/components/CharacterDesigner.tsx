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
  type: 'agent' | 'human' | 'opensource' | 'ai'  // pill / RPM GLB / CC0 GLB / AI-generated portrait
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
}

// Phase 16.2 — NBA2K-style structured character config.
// Each field composes into a fragment of the SDXL prompt; the BuildSpec lets
// users tweak one trait (e.g. swap hair style) and regenerate with the same
// seed so the rest of the character stays largely consistent.
export interface AiBuildSpec {
  gender: 'masc' | 'fem' | 'androgynous'
  build: 'slim' | 'athletic' | 'muscular' | 'bulky'
  skinTone: 'fair' | 'light' | 'medium' | 'tan' | 'brown' | 'dark'
  hairLength: 'bald' | 'buzz' | 'short' | 'medium' | 'long'
  hairStyle: 'natural' | 'wavy' | 'curly' | 'coily' | 'dreads' | 'braids' | 'cornrows' | 'mohawk'
  hairColor: 'black' | 'brown' | 'blonde' | 'red' | 'silver' | 'cyan' | 'pink' | 'purple'
  facialHair: 'clean' | 'stubble' | 'goatee' | 'beard' | 'mustache'
  vibe: 'streetwear' | 'cyberpunk' | 'athletic' | 'formal' | 'casual' | 'artist' | 'royal' | 'tactical' | 'punk'
  topPiece: 'hoodie' | 'tshirt' | 'jersey' | 'tank' | 'jacket' | 'buttonup' | 'sweater' | 'crop'
  bottomPiece: 'jeans' | 'joggers' | 'shorts' | 'cargo' | 'dresspants' | 'skirt' | 'leggings'
  shoes: 'sneakers' | 'boots' | 'dressshoes' | 'sandals' | 'cleats' | 'heels'
  topColor: string  // hex
  accentColor: string  // hex (used for shoes / chains / accents)
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    window.dispatchEvent(new CustomEvent('character-updated', { detail: config }))
  } catch {}
  // Fire-and-forget Mongo sync — if logged in, server stores it on profile so
  // other devices pick it up on next load. If 401 (guest), silently no-op.
  try {
    fetch('/api/profile/character', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character: config }),
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
  // Ready Player Me iframe loads in 3rd-party context and frequently fails silently on
  // mobile PWA / tunnel origins (black rectangle, no error event). Track whether it
  // sends any signal within 6s; if not, surface a fallback CTA to OPEN SOURCE.
  const [rpmStatus, setRpmStatus] = useState<'loading' | 'ready' | 'stalled'>('loading')

  // On open, pull the authoritative character from Mongo (if logged in).
  // Merges into local state + localStorage so the designer opens with the
  // latest look, regardless of which device last saved.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    loadRemoteCharacter().then(remote => {
      if (cancelled || !remote) return
      const merged = { ...DEFAULT_CHARACTER, ...remote, name: remote.name || initialName || '' }
      setConfig(merged)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)) } catch {}
      window.dispatchEvent(new CustomEvent('character-updated', { detail: merged }))
    })
    return () => { cancelled = true }
  }, [open, initialName])

  // ─── Ready Player Me message handler ─────────────────────
  // Listens for avatar export from RPM iframe + any frame.ready / subscribe signal
  // so we can clear the "stalled" fallback if RPM is actually alive.
  useEffect(() => {
    if (!open || config.type !== 'human') return
    // Reset status every time the user re-enters HUMAN mode
    setRpmStatus('loading')
    const stallTimer = setTimeout(() => {
      setRpmStatus(prev => (prev === 'loading' ? 'stalled' : prev))
    }, 6000)

    const handler = (event: MessageEvent) => {
      // Validate origin (Ready Player Me sends from readyplayer.me)
      if (typeof event.data !== 'string' && (!event.data || typeof event.data !== 'object')) return
      let data = event.data
      // RPM sends JSON strings sometimes
      if (typeof data === 'string') {
        try { data = JSON.parse(data) } catch { return }
      }
      // Any RPM postMessage counts as "iframe is alive" — kill the stall timer
      if (data?.source === 'readyplayerme' || data?.eventName?.startsWith?.('v1.')) {
        setRpmStatus('ready')
      }
      // Avatar exported event
      if (data?.eventName === 'v1.avatar.exported' || data?.source === 'readyplayerme') {
        const url = data.data?.url || data.url
        if (url && typeof url === 'string' && url.endsWith('.glb')) {
          // Generate 2D preview URL from GLB url (RPM provides .png too)
          const pngUrl = url.replace('.glb', '.png')
          setConfig(prev => ({ ...prev, humanGlbUrl: url, humanAvatarPng: pngUrl }))
        }
      }
    }
    window.addEventListener('message', handler)
    return () => {
      clearTimeout(stallTimer)
      window.removeEventListener('message', handler)
    }
  }, [open, config.type])

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
    <div className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#0a0f1f] border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/10 overflow-hidden my-2 sm:my-4">
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

        {/* Type Toggle: 3 modes — AGENT pill | HUMAN (RPM) | OPEN SOURCE (CC0) */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-cyan-500/10 bg-black/60 backdrop-blur-md flex-wrap sticky top-[49px] z-10">
          <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider mr-2 w-full sm:w-auto">CITIZEN CLASS:</span>
          <button
            onClick={() => update({ type: 'agent' })}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded text-[10px] font-mono font-bold transition ${config.type === 'agent' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}
          >
            🤖 AGENT
          </button>
          <button
            onClick={() => {
              // Clear open-source GLB data so RPM iframe shows fresh
              if (config.openSourceId) {
                update({ type: 'human', humanGlbUrl: undefined, humanAvatarPng: undefined, openSourceId: undefined, humanScale: undefined, humanYOffset: undefined })
              } else {
                update({ type: 'human' })
              }
            }}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded text-[10px] font-mono font-bold transition ${config.type === 'human' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}
          >
            👤 HUMAN <span className="opacity-60 text-[8px]">(RPM)</span>
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

        {/* HUMAN MODE — Ready Player Me iframe */}
        {config.type === 'human' && (
          <div className="bg-black">
            {!config.humanGlbUrl ? (
              <div className="space-y-0">
                <div className="px-4 py-2 bg-purple-500/5 border-b border-purple-500/10">
                  <p className="text-[10px] font-mono text-purple-300">
                    Build your humanoid avatar with face, hair, body, clothes — full Ready Player Me editor below.
                    Click ✓ when done to save.
                  </p>
                </div>
                <div className="relative" style={{ height: '500px' }}>
                  {/* Loading overlay — visible until RPM iframe posts its first message */}
                  {rpmStatus === 'loading' && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black pointer-events-none">
                      <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin mb-3" />
                      <p className="text-[10px] font-mono text-purple-300">Loading Ready Player Me…</p>
                      <p className="text-[9px] font-mono text-gray-600 mt-1">(first load can take a few seconds)</p>
                    </div>
                  )}
                  {/* Stalled fallback — RPM didn't respond within 6s.
                      Ready Player Me's iframe requires a registered subdomain at
                      studio.readyplayer.me; without one, the bare URL redirects to
                      login which X-Frame-Options blocks → black rectangle. Offer
                      two escape hatches: AI BUILD (own pipeline, always works) +
                      OPEN SOURCE (CC0 GLB library). */}
                  {rpmStatus === 'stalled' && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black p-6 text-center">
                      <p className="text-[11px] font-mono text-purple-300 mb-2">⚠ Ready Player Me didn't load</p>
                      <p className="text-[10px] font-mono text-gray-500 mb-4 max-w-xs leading-relaxed">
                        RPM needs a registered subdomain (we don't have one yet).
                        Use <span className="text-pink-300">AI BUILD</span> for NBA2K-style
                        custom characters on our RTX 5000, or <span className="text-cyan-300">OPEN SOURCE</span> for CC0 avatars.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
                        <button
                          onClick={() => update({ type: 'ai' })}
                          className="flex-1 px-4 py-2.5 rounded bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-pink-500/40 text-pink-200 text-[11px] font-mono font-bold hover:from-pink-500/40 hover:to-purple-500/40 transition shadow-[0_0_20px_rgba(236,72,153,0.2)]"
                        >
                          ✨ SWITCH TO AI BUILD
                        </button>
                        <button
                          onClick={() => update({ type: 'opensource', humanGlbUrl: undefined, humanAvatarPng: undefined })}
                          className="flex-1 px-4 py-2.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-bold hover:bg-cyan-500/25 transition"
                        >
                          🎨 SWITCH TO OPEN SOURCE
                        </button>
                      </div>
                      <button
                        onClick={() => setRpmStatus('loading')}
                        className="mt-4 text-[9px] font-mono text-gray-500 hover:text-gray-300 underline"
                      >
                        retry Ready Player Me
                      </button>
                    </div>
                  )}
                  <iframe
                    src="https://demo.readyplayer.me/avatar?frameApi=true&clearCache=true&quickStart=true&bodyType=fullbody"
                    className="w-full h-full"
                    style={{ border: 'none', background: '#000' }}
                    allow="camera *; microphone *; clipboard-write; display-capture"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                    referrerPolicy="strict-origin-when-cross-origin"
                    loading="lazy"
                    title="Ready Player Me Avatar Editor"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div className="aspect-square max-w-xs mx-auto bg-gradient-to-br from-purple-900/30 to-cyan-900/30 rounded-lg overflow-hidden border border-purple-500/20">
                  {config.humanAvatarPng ? (
                    <img src={config.humanAvatarPng} alt="Your avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-purple-400 font-mono text-xs">Humanoid loaded · {config.humanGlbUrl.slice(-12)}</div>
                  )}
                </div>
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-mono text-green-400">✓ Humanoid avatar saved</p>
                  <p className="text-[9px] font-mono text-gray-500 break-all px-4">{config.humanGlbUrl}</p>
                  <button
                    onClick={() => update({ humanGlbUrl: undefined, humanAvatarPng: undefined })}
                    className="text-[9px] font-mono text-purple-400 hover:text-purple-300 underline"
                  >
                    Edit avatar
                  </button>
                </div>
              </div>
            )}
            <div className="px-4 py-2 border-t border-cyan-500/10 bg-black/40 flex items-center justify-between">
              <span className="text-[8px] font-mono text-gray-600">Powered by Ready Player Me · 100% free</span>
              <input
                type="text"
                value={config.name}
                onChange={e => update({ name: e.target.value })}
                placeholder="Display name (max 16)"
                className="bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white outline-none focus:border-purple-500/50 w-44"
                maxLength={16}
              />
            </div>
          </div>
        )}

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
              <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Accessory</label>
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
  build: 'athletic',
  skinTone: 'medium',
  hairLength: 'short',
  hairStyle: 'natural',
  hairColor: 'black',
  facialHair: 'clean',
  vibe: 'streetwear',
  topPiece: 'hoodie',
  bottomPiece: 'jeans',
  shoes: 'sneakers',
  topColor: '#1e3a8a',  // deep blue
  accentColor: '#ffffff',
  extraDetails: '',
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
}
const TOKEN_FACIAL_HAIR: Record<AiBuildSpec['facialHair'], string> = {
  clean: 'clean-shaven',
  stubble: 'light stubble',
  goatee: 'goatee',
  beard: 'full beard',
  mustache: 'mustache',
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
}
const TOKEN_BOTTOM: Record<AiBuildSpec['bottomPiece'], string> = {
  jeans: 'jeans',
  joggers: 'joggers',
  shorts: 'shorts',
  cargo: 'cargo pants',
  dresspants: 'dress pants',
  skirt: 'skirt',
  leggings: 'leggings',
}
const TOKEN_SHOES: Record<AiBuildSpec['shoes'], string> = {
  sneakers: 'sneakers',
  boots: 'boots',
  dressshoes: 'dress shoes',
  sandals: 'sandals',
  cleats: 'cleats',
  heels: 'heels',
}

// Composer — turn BuildSpec into the SDXL prompt
function composePrompt(spec: AiBuildSpec): string {
  const parts: string[] = []
  parts.push(`${TOKEN_GENDER[spec.gender]} character`)
  parts.push(TOKEN_BUILD[spec.build])
  parts.push(TOKEN_SKIN[spec.skinTone])
  if (spec.hairLength !== 'bald') {
    parts.push(`${TOKEN_HAIR_LEN[spec.hairLength]} ${TOKEN_HAIR_STYLE[spec.hairStyle]} ${TOKEN_HAIR_COLOR[spec.hairColor]}`)
  } else {
    parts.push(TOKEN_HAIR_LEN.bald)
  }
  if (spec.facialHair !== 'clean') parts.push(TOKEN_FACIAL_HAIR[spec.facialHair])
  parts.push(`wearing ${TOKEN_TOP[spec.topPiece]} in ${spec.topColor}`)
  parts.push(TOKEN_BOTTOM[spec.bottomPiece])
  parts.push(`${TOKEN_SHOES[spec.shoes]} accented with ${spec.accentColor}`)
  parts.push(TOKEN_VIBE[spec.vibe])
  parts.push('confident pose, clean background')
  if (spec.extraDetails.trim()) parts.push(spec.extraDetails.trim())
  return parts.join(', ')
}

function AiBuildPanel({
  config,
  update,
}: {
  config: CharacterConfig
  update: (partial: Partial<CharacterConfig>) => void
}) {
  const [spec, setSpec] = useState<AiBuildSpec>(config.aiBuildSpec || DEFAULT_BUILD_SPEC)
  const [seed, setSeed] = useState<number>(config.aiPortraitSeed || Math.floor(Math.random() * 1_000_000))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [variant, setVariant] = useState<'portrait' | 'face'>('portrait')
  const [showAdvanced, setShowAdvanced] = useState(false)
  // Phase 16.3 — 3D mesh generation state
  const [meshLoading, setMeshLoading] = useState(false)
  const [meshError, setMeshError] = useState<string | null>(null)
  const [viewer3DOpen, setViewer3DOpen] = useState(false)

  const composedPrompt = composePrompt(spec)
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

      {/* Phase 16.5 — LIVE 3D PREVIEW. Mannequin morphs in real-time as sliders change. */}
      <LivePreview3D spec={spec} />

      <div className="p-4 space-y-3">
        {/* Variant + Seed row */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-[9px] font-mono text-gray-500 uppercase">View:</span>
          <button onClick={() => setVariant('portrait')} className={pillCls(variant === 'portrait')}>Full body</button>
          <button onClick={() => setVariant('face')} className={pillCls(variant === 'face')}>Face only</button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[9px] font-mono text-gray-500">seed: {seed}</span>
            <button onClick={newCharacter} className="px-2 py-1 rounded text-[10px] font-mono bg-pink-500/15 text-pink-300 border border-pink-500/30 hover:bg-pink-500/25">🎲 New</button>
          </div>
        </div>

        {/* Quick-start preset chips — populate the BuildSpec, not freeform */}
        <PickerSection label="Quick start preset">
          <div className="flex flex-wrap gap-1">
            {AI_BUILD_PRESETS.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p.spec)} className="px-2 py-1 rounded text-[10px] font-mono bg-white/[0.02] text-gray-300 border border-white/5 hover:bg-pink-500/10 hover:text-pink-300 hover:border-pink-500/20 transition">
                {p.label}
              </button>
            ))}
          </div>
        </PickerSection>

        {/* Identity */}
        <PickerSection label="Identity">
          <ChipRow value={spec.gender} options={[['masc', '♂ Masc'], ['fem', '♀ Fem'], ['androgynous', '◐ Andro']]} onPick={(v) => tweak({ gender: v as any })} />
        </PickerSection>

        {/* Body */}
        <PickerSection label="Build">
          <ChipRow value={spec.build} options={[['slim', 'Slim'], ['athletic', 'Athletic'], ['muscular', 'Muscular'], ['bulky', 'Bulky']]} onPick={(v) => tweak({ build: v as any })} />
        </PickerSection>

        {/* Skin tone — swatches */}
        <PickerSection label="Skin tone">
          <div className="flex flex-wrap gap-1.5">
            {(['fair', 'light', 'medium', 'tan', 'brown', 'dark'] as const).map((t, i) => {
              const swatches = ['#f3d5b5', '#e0b48d', '#c08a5e', '#a16641', '#7a4a2b', '#4a2e1a']
              const active = spec.skinTone === t
              return (
                <button key={t} onClick={() => tweak({ skinTone: t })} title={t}
                  className={`w-7 h-7 rounded-full border-2 transition ${active ? 'border-pink-400 scale-110' : 'border-white/10 hover:border-white/30'}`}
                  style={{ backgroundColor: swatches[i] }} />
              )
            })}
          </div>
        </PickerSection>

        {/* Hair */}
        <PickerSection label="Hair length">
          <ChipRow value={spec.hairLength} options={[['bald', 'Bald'], ['buzz', 'Buzz'], ['short', 'Short'], ['medium', 'Medium'], ['long', 'Long']]} onPick={(v) => tweak({ hairLength: v as any })} />
        </PickerSection>
        {spec.hairLength !== 'bald' && (
          <>
            <PickerSection label="Hair style">
              <ChipRow value={spec.hairStyle} options={[['natural', 'Natural'], ['wavy', 'Wavy'], ['curly', 'Curly'], ['coily', 'Coily'], ['dreads', 'Dreads'], ['braids', 'Braids'], ['cornrows', 'Cornrows'], ['mohawk', 'Mohawk']]} onPick={(v) => tweak({ hairStyle: v as any })} />
            </PickerSection>
            <PickerSection label="Hair color">
              <ChipRow value={spec.hairColor} options={[['black', 'Black'], ['brown', 'Brown'], ['blonde', 'Blonde'], ['red', 'Red'], ['silver', 'Silver'], ['cyan', 'Cyan'], ['pink', 'Pink'], ['purple', 'Purple']]} onPick={(v) => tweak({ hairColor: v as any })} />
            </PickerSection>
          </>
        )}

        {/* Facial hair */}
        <PickerSection label="Facial hair">
          <ChipRow value={spec.facialHair} options={[['clean', 'Clean'], ['stubble', 'Stubble'], ['goatee', 'Goatee'], ['beard', 'Beard'], ['mustache', '\'Stache']]} onPick={(v) => tweak({ facialHair: v as any })} />
        </PickerSection>

        {/* Vibe */}
        <PickerSection label="Vibe / aesthetic">
          <ChipRow value={spec.vibe} options={[['streetwear', 'Streetwear'], ['cyberpunk', 'Cyberpunk'], ['athletic', 'Athletic'], ['formal', 'Formal'], ['casual', 'Casual'], ['artist', 'Artist'], ['royal', 'Royal'], ['tactical', 'Tactical'], ['punk', 'Punk']]} onPick={(v) => tweak({ vibe: v as any })} />
        </PickerSection>

        {/* Outfit */}
        <PickerSection label="Top">
          <ChipRow value={spec.topPiece} options={[['hoodie', 'Hoodie'], ['tshirt', 'T-shirt'], ['jersey', 'Jersey'], ['tank', 'Tank'], ['jacket', 'Jacket'], ['buttonup', 'Button-up'], ['sweater', 'Sweater'], ['crop', 'Crop']]} onPick={(v) => tweak({ topPiece: v as any })} />
        </PickerSection>
        <PickerSection label="Bottom">
          <ChipRow value={spec.bottomPiece} options={[['jeans', 'Jeans'], ['joggers', 'Joggers'], ['shorts', 'Shorts'], ['cargo', 'Cargo'], ['dresspants', 'Dress pants'], ['skirt', 'Skirt'], ['leggings', 'Leggings']]} onPick={(v) => tweak({ bottomPiece: v as any })} />
        </PickerSection>
        <PickerSection label="Shoes">
          <ChipRow value={spec.shoes} options={[['sneakers', 'Sneakers'], ['boots', 'Boots'], ['dressshoes', 'Dress'], ['sandals', 'Sandals'], ['cleats', 'Cleats'], ['heels', 'Heels']]} onPick={(v) => tweak({ shoes: v as any })} />
        </PickerSection>

        {/* Colors */}
        <PickerSection label="Top color">
          <div className="flex items-center gap-2">
            <input type="color" value={spec.topColor} onChange={(e) => tweak({ topColor: e.target.value })} className="w-10 h-7 rounded border border-white/10 bg-transparent cursor-pointer" />
            <span className="font-mono text-[10px] text-gray-500">{spec.topColor}</span>
          </div>
        </PickerSection>
        <PickerSection label="Accent color">
          <div className="flex items-center gap-2">
            <input type="color" value={spec.accentColor} onChange={(e) => tweak({ accentColor: e.target.value })} className="w-10 h-7 rounded border border-white/10 bg-transparent cursor-pointer" />
            <span className="font-mono text-[10px] text-gray-500">{spec.accentColor}</span>
          </div>
        </PickerSection>

        {/* Advanced — extra details */}
        <button onClick={() => setShowAdvanced((s) => !s)} className="w-full text-left text-[10px] font-mono text-pink-300/70 hover:text-pink-300 transition">
          {showAdvanced ? '▾' : '▸'} Advanced — extra prompt details
        </button>
        {showAdvanced && (
          <div className="space-y-2">
            <textarea value={spec.extraDetails} onChange={(e) => tweak({ extraDetails: e.target.value })} placeholder="extra details to layer on: tattoos, accessories, mood, lighting…" rows={2}
              className="w-full bg-white/[0.02] border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-gray-600 resize-none focus:outline-none focus:border-pink-500/40" />
            <div className="text-[9px] font-mono text-gray-500 break-words leading-relaxed bg-black/40 p-2 rounded border border-white/5">
              <span className="text-pink-400">SDXL prompt: </span>{composedPrompt}
            </div>
          </div>
        )}

        {/* Generate */}
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
                <div className="flex gap-2">
                  <button onClick={() => setViewer3DOpen(true)}
                    className="flex-1 py-1.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition">
                    🌀 Rotate 3D
                  </button>
                  <button onClick={() => update({ type: 'ai', humanGlbUrl: config.aiGlbUrl })}
                    className="flex-1 py-1.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition">
                    ✓ Use in Explore3D
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3D viewer modal */}
        {viewer3DOpen && config.aiGlbUrl && (
          <Mesh3DViewer glbUrl={config.aiGlbUrl} onClose={() => setViewer3DOpen(false)} />
        )}
      </div>

      <div className="px-4 py-2 border-t border-pink-500/10 bg-black/40 flex items-center justify-between text-[8px] font-mono text-gray-600">
        <span>Powered by Lucy SDXL + TripoSR on anvil · RTX 5000</span>
        <span className="text-pink-500">🎨 Phase 16.3</span>
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

const BASE_HUMANOID_GLB = 'https://threejs.org/examples/models/gltf/Xbot.glb'

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

function LivePreview3D({ spec }: { spec: AiBuildSpec }) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Mutable refs to live Three.js objects — re-used across spec changes,
  // never re-mounted (would lose the camera angle the user dragged to).
  const modelRef = useRef<any>(null)
  const skinMatsRef = useRef<any[]>([])
  const accentMatsRef = useRef<any[]>([])
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

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

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.1
      controls.target.set(0, 1, 0)
      controls.minDistance = 1.0
      controls.maxDistance = 5.0
      controls.maxPolarAngle = Math.PI * 0.9

      const loader = new GLTFLoader()
      loader.load(
        BASE_HUMANOID_GLB,
        (gltf: any) => {
          if (disposed) return
          const model = gltf.scene
          // Pull all materials out — we mutate their color on spec changes.
          // XBot has a head+body mesh structure; treat first mesh as skin,
          // rest as accent (clothing/accessories) for v1.
          const meshes: any[] = []
          model.traverse((obj: any) => { if (obj.isMesh) meshes.push(obj) })
          if (meshes.length > 0) {
            // Clone materials so mutations don't bleed into the GLB cache
            meshes.forEach((m, i) => {
              m.material = m.material.clone()
              if (i === 0) skinMatsRef.current.push(m.material)
              else accentMatsRef.current.push(m.material)
              m.castShadow = true
              m.receiveShadow = true
            })
            // Fallback if only ONE mesh: that material gets both skin + accent treatment
            if (accentMatsRef.current.length === 0) accentMatsRef.current.push(meshes[0].material)
          }
          // Auto-frame the model
          const box = new THREE.Box3().setFromObject(model)
          const size = new THREE.Vector3(); box.getSize(size)
          const center = new THREE.Vector3(); box.getCenter(center)
          model.position.x -= center.x
          model.position.z -= center.z
          model.position.y -= box.min.y  // feet on grid
          scene.add(model)
          modelRef.current = model
          setReady(true)
        },
        undefined,
        (err: any) => {
          console.warn('[LivePreview3D] GLB load failed:', err)
          setLoadError('mannequin failed to load')
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
    // Run ONCE per mount — don't include spec, we mutate the live scene
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Per-spec MUTATION effect — runs on every spec change, never re-mounts.
  // This is what makes the preview feel instant.
  useEffect(() => {
    if (!ready || !modelRef.current) return
    void Promise.all([import('three')]).then(([THREE]) => {
      const model = modelRef.current
      // Build scale — slim/athletic/muscular/bulky changes x/z
      const buildScale = BUILD_SCALE[spec.build]
      // Gender height modifier (purely cosmetic — fem slightly shorter)
      const heightMul = spec.gender === 'fem' ? 0.96 : spec.gender === 'masc' ? 1.0 : 0.98
      model.scale.set(buildScale.x, heightMul, buildScale.z)

      // Skin tone tint — apply to skin materials
      const skinColor = new THREE.Color(SKIN_HEX[spec.skinTone])
      skinMatsRef.current.forEach((mat: any) => {
        if (mat?.color) mat.color.copy(skinColor)
      })

      // Top color → accent materials (clothing on XBot)
      const topColor = new THREE.Color(spec.topColor)
      accentMatsRef.current.forEach((mat: any) => {
        if (mat?.color) mat.color.copy(topColor)
      })
    })
  }, [ready, spec.build, spec.gender, spec.skinTone, spec.topColor, spec.accentColor])

  return (
    <div className="relative bg-black border-b border-pink-500/10" style={{ height: 280 }}>
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
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[8px] font-mono text-pink-400/50 pointer-events-none">
          <span>🎮 LIVE 3D · drag to rotate · {spec.build} · {spec.skinTone}</span>
          <span>scroll to zoom</span>
        </div>
      )}
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
