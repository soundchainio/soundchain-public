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
  type: 'agent' | 'human' | 'opensource'  // visual class: pill / RPM GLB / curated CC0 GLB
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
  // Listens for avatar export from RPM iframe
  useEffect(() => {
    if (!open || config.type !== 'human') return
    const handler = (event: MessageEvent) => {
      // Validate origin (Ready Player Me sends from readyplayer.me)
      if (typeof event.data !== 'string' && (!event.data || typeof event.data !== 'object')) return
      let data = event.data
      // RPM sends JSON strings sometimes
      if (typeof data === 'string') {
        try { data = JSON.parse(data) } catch { return }
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
    return () => window.removeEventListener('message', handler)
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
        </div>

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
                <iframe
                  src="https://readyplayer.me/avatar?frameApi&clearCache"
                  className="w-full"
                  style={{ height: '500px', border: 'none', background: '#000' }}
                  allow="camera *; microphone *; clipboard-write"
                  title="Ready Player Me Avatar Editor"
                  loading="lazy"
                />
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
