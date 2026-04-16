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
import { X, Save, RefreshCw, Shuffle, User } from 'lucide-react'

export interface CharacterConfig {
  bodyColor: string         // hex
  headShape: 'capsule' | 'sphere' | 'cube' | 'cone'
  height: number            // 0.6 - 1.4 multiplier
  glowIntensity: number     // 0 - 1
  glowColor: string         // hex
  name: string              // override @handle
  accessory: 'none' | 'crown' | 'halo' | 'antenna' | 'visor'
}

export const DEFAULT_CHARACTER: CharacterConfig = {
  bodyColor: '#22d3ee',
  headShape: 'sphere',
  height: 1.0,
  glowIntensity: 0.4,
  glowColor: '#22d3ee',
  name: '',
  accessory: 'none',
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

  // ─── Live 3D Preview ─────────────────────────────────────
  useEffect(() => {
    if (!open || !previewRef.current) return
    const container = previewRef.current
    const w = container.clientWidth || 300
    const h = container.clientHeight || 300

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0f1f)

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
    camera.position.set(0, 1.2, 4)

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
    const head = new THREE.Mesh(headGeo, bodyMat.clone())
    head.position.y = 1.5 + (config.height - 1) * 1
    head.castShadow = true
    charGroup.add(head)

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
  }, [open, config])

  if (!open) return null

  const update = (patch: Partial<CharacterConfig>) => setConfig(prev => ({ ...prev, ...patch }))

  const randomize = () => {
    setConfig({
      bodyColor: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      headShape: (['capsule', 'sphere', 'cube', 'cone'] as const)[Math.floor(Math.random() * 4)],
      height: 0.7 + Math.random() * 0.6,
      glowIntensity: Math.random() * 0.8,
      glowColor: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      name: config.name,
      accessory: (['none', 'crown', 'halo', 'antenna', 'visor'] as const)[Math.floor(Math.random() * 5)],
    })
  }

  const handleSave = () => {
    saveCharacter(config)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#0a0f1f] border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/10 overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-black/40">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-mono font-bold text-cyan-400 tracking-wider">CHARACTER DESIGNER</h2>
            <span className="text-[8px] font-mono text-gray-600">NBA 2K mode</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Body — 3D Preview + Controls */}
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
          <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
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
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-cyan-500/20 bg-black/40 flex items-center justify-between gap-2">
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
