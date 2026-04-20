/**
 * GalleryRoom3D — Personal NFT/SCid gallery scene (Nodeverse)
 *
 * Three.js 3D room with frames on walls. Each frame shows:
 * - NFT artwork
 * - SCid track cover (with audio playback when nearby)
 * - Wall/feed post media
 *
 * WASD to walk through. Click any frame for detail modal.
 * Frames within 4 units = audio fades in (proximity audio).
 *
 * Themes: 'modern' | 'cyberpunk' | 'vinyl' | 'vault'
 */

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useRouter } from 'next/router'
import { Music, X, Heart, Share2, Play, Pause, Volume2, Copy, Check } from 'lucide-react'
import { toast } from 'react-toastify'

interface Track {
  id: string
  title: string
  artist?: string
  artworkUrl?: string
  playbackUrl?: string
  audioUrl?: string
  isNFT?: boolean
  editionSize?: number
  ipfsHash?: string
}

interface GalleryRoom3DProps {
  ownerHandle: string
  ownerProfileId?: string
  theme?: 'modern' | 'cyberpunk' | 'vinyl' | 'vault'
}

const THEME_CONFIG = {
  modern: { wall: 0xf5f5f5, floor: 0xe5e5e5, accent: 0x22d3ee, ambient: 0xffffff, name: 'MODERN' },
  cyberpunk: { wall: 0x1a1a3a, floor: 0x0a0a1a, accent: 0xa855f7, ambient: 0x4040ff, name: 'CYBERPUNK' },
  vinyl: { wall: 0x3a2a1a, floor: 0x2a1a0a, accent: 0xfacc15, ambient: 0xfacc15, name: 'VINYL STORE' },
  vault: { wall: 0x0a0a0a, floor: 0x050505, accent: 0xfacc15, ambient: 0x666666, name: 'NFT VAULT' },
}

export default function GalleryRoom3D({ ownerHandle, ownerProfileId, theme = 'cyberpunk' }: GalleryRoom3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [stats, setStats] = useState({ fps: 0, frames: 0, position: 'x:0 z:0' })
  const [nowPlaying, setNowPlaying] = useState<string | null>(null)
  const audioRefsMap = useRef<Map<string, HTMLAudioElement>>(new Map())

  // Fetch owner's tracks (NFTs + SCids)
  useEffect(() => {
    if (!ownerProfileId) { setLoading(false); return }
    fetch(`/api/feed/tracks?profileId=${ownerProfileId}&limit=20`)
      .then(r => r.json())
      .then(data => {
        // Deduplicate multi-edition tracks — show one frame per unique title
        const seen = new Set<string>()
        const ts = (data.tracks || []).filter((t: any) => {
          if (!t.id || !t.title) return false
          const key = t.title.toLowerCase().trim()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        }).map((t: any) => ({
          ...t,
          playbackUrl: t.audioUrl || t.playbackUrl,
        })).slice(0, 16)
        setTracks(ts)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [ownerProfileId])

  useEffect(() => {
    if (!containerRef.current || loading) return
    const container = containerRef.current
    const w = container.clientWidth || window.innerWidth
    const h = container.clientHeight || window.innerHeight - 200
    const themeCfg = THEME_CONFIG[theme]

    // ─── Scene Setup ─────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(themeCfg.floor).multiplyScalar(0.5)
    scene.fog = new THREE.Fog(themeCfg.floor, 30, 80)

    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 200)
    camera.position.set(0, 2.5, 8)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // ─── Lighting ────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(themeCfg.ambient, 0.6)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 1.2)
    dir.position.set(5, 15, 5)
    dir.castShadow = true
    scene.add(dir)
    const accentLight = new THREE.PointLight(themeCfg.accent, 1.5, 30)
    accentLight.position.set(0, 6, 0)
    scene.add(accentLight)

    // ─── Floor ───────────────────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(40, 40)
    const floorMat = new THREE.MeshStandardMaterial({ color: themeCfg.floor, metalness: 0.6, roughness: 0.3 })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    // Grid lines for depth
    const gridHelper = new THREE.GridHelper(40, 20, themeCfg.accent, themeCfg.accent)
    ;(gridHelper.material as THREE.Material).transparent = true
    ;(gridHelper.material as THREE.Material).opacity = 0.15
    scene.add(gridHelper)

    // ─── Walls (4 walls, frames mounted on them) ─────────────
    const wallMat = new THREE.MeshStandardMaterial({ color: themeCfg.wall, metalness: 0.3, roughness: 0.7 })
    const wallHeight = 8
    const wallLength = 40

    // Back wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(wallLength, wallHeight), wallMat)
    backWall.position.set(0, wallHeight / 2, -wallLength / 2)
    backWall.receiveShadow = true
    scene.add(backWall)

    // Front wall (with door gap)
    const frontWallLeft = new THREE.Mesh(new THREE.PlaneGeometry(15, wallHeight), wallMat)
    frontWallLeft.position.set(-12.5, wallHeight / 2, wallLength / 2)
    frontWallLeft.rotation.y = Math.PI
    scene.add(frontWallLeft)
    const frontWallRight = new THREE.Mesh(new THREE.PlaneGeometry(15, wallHeight), wallMat)
    frontWallRight.position.set(12.5, wallHeight / 2, wallLength / 2)
    frontWallRight.rotation.y = Math.PI
    scene.add(frontWallRight)

    // Side walls
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(wallLength, wallHeight), wallMat)
    leftWall.position.set(-wallLength / 2, wallHeight / 2, 0)
    leftWall.rotation.y = Math.PI / 2
    scene.add(leftWall)
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(wallLength, wallHeight), wallMat)
    rightWall.position.set(wallLength / 2, wallHeight / 2, 0)
    rightWall.rotation.y = -Math.PI / 2
    scene.add(rightWall)

    // Ceiling
    const ceilingMat = new THREE.MeshStandardMaterial({ color: themeCfg.wall, metalness: 0.2, roughness: 0.8 })
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(wallLength, wallLength), ceilingMat)
    ceiling.position.y = wallHeight
    ceiling.rotation.x = Math.PI / 2
    scene.add(ceiling)

    // ─── Frames (one per track, distributed around walls) ────
    const frameMeshes: Array<{ group: THREE.Group; track: Track; spotlight: THREE.SpotLight }> = []
    const textureLoader = new THREE.TextureLoader()
    textureLoader.crossOrigin = 'anonymous'

    // Calculate frame positions — distribute across 4 walls
    const positions: Array<{ pos: THREE.Vector3; rot: number }> = []
    const wallPadding = 4
    const framesPerWall = Math.ceil(tracks.length / 4) || 1
    const wallSpacing = (wallLength - wallPadding * 2) / Math.max(framesPerWall, 1)

    // Back wall (z = -19.5)
    for (let i = 0; i < framesPerWall; i++) {
      const x = -wallLength / 2 + wallPadding + (i + 0.5) * wallSpacing
      positions.push({ pos: new THREE.Vector3(x, 3, -19.5), rot: 0 })
    }
    // Right wall (x = 19.5)
    for (let i = 0; i < framesPerWall; i++) {
      const z = -wallLength / 2 + wallPadding + (i + 0.5) * wallSpacing
      positions.push({ pos: new THREE.Vector3(19.5, 3, z), rot: -Math.PI / 2 })
    }
    // Left wall (x = -19.5)
    for (let i = 0; i < framesPerWall; i++) {
      const z = -wallLength / 2 + wallPadding + (i + 0.5) * wallSpacing
      positions.push({ pos: new THREE.Vector3(-19.5, 3, z), rot: Math.PI / 2 })
    }
    // Front wall split (avoid door)
    for (let i = 0; i < framesPerWall; i++) {
      const x = i < framesPerWall / 2
        ? -wallLength / 2 + wallPadding + (i + 0.5) * (10 / Math.max(framesPerWall / 2, 1))
        : wallLength / 2 - wallPadding - (i - framesPerWall / 2 + 0.5) * (10 / Math.max(framesPerWall / 2, 1))
      positions.push({ pos: new THREE.Vector3(x, 3, 19.5), rot: Math.PI })
    }

    tracks.forEach((track, i) => {
      if (i >= positions.length) return
      const { pos, rot } = positions[i]
      const group = new THREE.Group()

      // Frame (gold/silver border around image)
      const frameMat = new THREE.MeshStandardMaterial({
        color: track.isNFT ? 0xfacc15 : 0x9ca3af,
        emissive: track.isNFT ? 0xfacc15 : 0x9ca3af,
        emissiveIntensity: 0.1,
        metalness: 0.9,
        roughness: 0.2,
      })
      const frameGeo = new THREE.BoxGeometry(2.4, 2.4, 0.15)
      const frame = new THREE.Mesh(frameGeo, frameMat)
      frame.castShadow = true
      group.add(frame)

      // Inner art canvas
      const artGeo = new THREE.PlaneGeometry(2.1, 2.1)
      const artMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
      const art = new THREE.Mesh(artGeo, artMat)
      art.position.z = 0.08
      ;(art as any).userData = { track }
      group.add(art)

      // Try to load artwork texture
      if (track.artworkUrl) {
        textureLoader.load(track.artworkUrl, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          art.material = new THREE.MeshBasicMaterial({ map: tex })
        }, undefined, () => {
          // Fallback: gradient
          art.material = new THREE.MeshBasicMaterial({ color: 0x222244 })
        })
      } else {
        art.material = new THREE.MeshBasicMaterial({ color: 0x222244 })
      }

      // Title plaque below frame
      const plaqueCanvas = document.createElement('canvas')
      plaqueCanvas.width = 512
      plaqueCanvas.height = 128
      const pctx = plaqueCanvas.getContext('2d')!
      pctx.fillStyle = 'rgba(0,0,0,0.85)'
      pctx.fillRect(0, 0, 512, 128)
      pctx.fillStyle = '#ffffff'
      pctx.font = 'bold 36px monospace'
      pctx.textAlign = 'center'
      pctx.fillText((track.title || 'Untitled').slice(0, 22), 256, 50)
      pctx.fillStyle = `#${themeCfg.accent.toString(16).padStart(6, '0')}`
      pctx.font = '24px monospace'
      pctx.fillText((track.artist || ownerHandle).slice(0, 28), 256, 84)
      if (track.editionSize && track.editionSize > 1) {
        pctx.fillStyle = '#facc15'
        pctx.font = 'bold 20px monospace'
        pctx.fillText(`1/${track.editionSize}`, 256, 110)
      }
      const plaqueTex = new THREE.CanvasTexture(plaqueCanvas)
      const plaque = new THREE.Sprite(new THREE.SpriteMaterial({ map: plaqueTex }))
      plaque.scale.set(2.4, 0.6, 1)
      plaque.position.y = -1.7
      group.add(plaque)

      // Spotlight on the frame
      const spotlight = new THREE.SpotLight(0xffffff, 1.5, 8, Math.PI / 4, 0.4, 1)
      spotlight.position.set(pos.x + Math.sin(rot) * 1.5, pos.y + 3, pos.z + Math.cos(rot) * 1.5)
      spotlight.target = group
      spotlight.castShadow = true
      scene.add(spotlight)

      group.position.copy(pos)
      group.rotation.y = rot
      scene.add(group)
      frameMeshes.push({ group, track, spotlight })

      // Audio element for music tracks
      if (track.playbackUrl) {
        const audio = new Audio(track.playbackUrl)
        audio.crossOrigin = 'anonymous'
        audio.loop = true
        audio.volume = 0
        audio.preload = 'metadata'
        audioRefsMap.current.set(track.id, audio)
      }
    })

    // ─── Player capsule (you, in the gallery) ────────────────
    const playerGroup = new THREE.Group()
    const playerGeo = new THREE.CapsuleGeometry(0.4, 1, 4, 8)
    const playerMat = new THREE.MeshStandardMaterial({ color: themeCfg.accent, emissive: themeCfg.accent, emissiveIntensity: 0.3, metalness: 0.5, roughness: 0.3 })
    const playerMesh = new THREE.Mesh(playerGeo, playerMat)
    playerMesh.position.y = 1
    playerMesh.castShadow = true
    playerGroup.add(playerMesh)
    playerGroup.position.set(0, 0, 5)
    scene.add(playerGroup)

    // ─── Movement ────────────────────────────────────────────
    const keys: Record<string, boolean> = {}
    const onKeyDown = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true }
    const onKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // ─── Click frame → open detail modal ─────────────────────
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const onClick = (event: MouseEvent | TouchEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      let cx: number, cy: number
      if ('touches' in event) {
        if (!event.touches[0]) return
        cx = event.touches[0].clientX; cy = event.touches[0].clientY
      } else {
        cx = event.clientX; cy = event.clientY
      }
      mouse.x = ((cx - rect.left) / rect.width) * 2 - 1
      mouse.y = -((cy - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(frameMeshes.map(fm => fm.group), true)
      if (hits.length > 0) {
        for (const hit of hits) {
          const data = (hit.object.userData?.track || hit.object.parent?.children?.find(c => (c as any).userData?.track)?.userData?.track) as Track | undefined
          if (data) {
            setSelectedTrack(data)
            return
          }
        }
      }
    }
    renderer.domElement.addEventListener('click', onClick)
    renderer.domElement.addEventListener('touchend', onClick as any)

    // ─── Resize ──────────────────────────────────────────────
    const onResize = () => {
      const cw = container.clientWidth || window.innerWidth
      const ch = container.clientHeight || window.innerHeight - 200
      camera.aspect = cw / ch
      camera.updateProjectionMatrix()
      renderer.setSize(cw, ch)
    }
    window.addEventListener('resize', onResize)
    const fitTimer = setTimeout(onResize, 200)

    // ─── Animation Loop ──────────────────────────────────────
    const SPEED = 0.18
    const PLAYER_BOUNDS = 19
    let lastFrame = performance.now()
    let frameCount = 0
    let fpsLastUpdate = lastFrame
    let rafId = 0

    const animate = () => {
      rafId = requestAnimationFrame(animate)
      const now = performance.now()
      lastFrame = now
      frameCount++
      if (now - fpsLastUpdate > 1000) {
        const fps = Math.round((frameCount * 1000) / (now - fpsLastUpdate))
        setStats({ fps, frames: frameMeshes.length, position: `x:${playerGroup.position.x.toFixed(1)} z:${playerGroup.position.z.toFixed(1)}` })
        frameCount = 0
        fpsLastUpdate = now
      }

      // Movement (with bounds)
      const fwd = (keys['w'] || keys['arrowup']) ? 1 : 0
      const back = (keys['s'] || keys['arrowdown']) ? 1 : 0
      const left = (keys['a'] || keys['arrowleft']) ? 1 : 0
      const right = (keys['d'] || keys['arrowright']) ? 1 : 0
      playerGroup.position.z -= (fwd - back) * SPEED
      playerGroup.position.x += (right - left) * SPEED
      playerGroup.position.x = Math.max(-PLAYER_BOUNDS, Math.min(PLAYER_BOUNDS, playerGroup.position.x))
      playerGroup.position.z = Math.max(-PLAYER_BOUNDS, Math.min(PLAYER_BOUNDS, playerGroup.position.z))
      if (fwd || back || left || right) {
        playerGroup.rotation.y = Math.atan2(right - left, -(fwd - back))
      }

      // Camera follow
      const camTarget = new THREE.Vector3(playerGroup.position.x, playerGroup.position.y + 3, playerGroup.position.z + 6)
      camera.position.lerp(camTarget, 0.1)
      camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1, playerGroup.position.z)

      // Proximity audio — fade in/out based on distance
      let closestPlaying: string | null = null
      let closestDist = Infinity
      frameMeshes.forEach(fm => {
        const dist = playerGroup.position.distanceTo(fm.group.position)
        const audio = audioRefsMap.current.get(fm.track.id)
        if (audio) {
          if (dist < 4) {
            const targetVol = Math.max(0, 1 - dist / 4) * 0.6
            audio.volume = targetVol
            if (audio.paused && targetVol > 0.1) {
              audio.play().catch(() => {})
            }
            if (dist < closestDist) {
              closestDist = dist
              closestPlaying = fm.track.title || null
            }
          } else {
            audio.volume = 0
            if (!audio.paused) audio.pause()
          }
        }
      })
      if (closestPlaying !== nowPlaying) setNowPlaying(closestPlaying)

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(fitTimer)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('click', onClick)
      renderer.domElement.removeEventListener('touchend', onClick as any)
      // Stop all audio
      audioRefsMap.current.forEach(a => { a.pause(); a.src = '' })
      audioRefsMap.current.clear()
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
  }, [tracks, theme, loading, nowPlaying])

  // Auto-focus container for keyboard events
  useEffect(() => {
    if (containerRef.current) containerRef.current.focus()
  }, [loading])

  return (
    <div className="relative w-full h-full" tabIndex={0} onFocus={() => containerRef.current?.focus()}>
      <div ref={containerRef} className="absolute inset-0" tabIndex={0} style={{ cursor: 'grab', outline: 'none' }} onClick={() => containerRef.current?.focus()} />

      {/* Mobile touch controls — D-pad overlay */}
      <div className="absolute bottom-16 left-3 z-10 sm:hidden flex flex-col items-center gap-1">
        <button onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }))} onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }))} className="w-10 h-10 rounded bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white text-lg active:bg-white/20">↑</button>
        <div className="flex gap-1">
          <button onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))} onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }))} className="w-10 h-10 rounded bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white text-lg active:bg-white/20">←</button>
          <button onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))} onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 's' }))} className="w-10 h-10 rounded bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white text-lg active:bg-white/20">↓</button>
          <button onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }))} onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }))} className="w-10 h-10 rounded bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white text-lg active:bg-white/20">→</button>
        </div>
      </div>

      {/* HUD */}
      <div className="absolute top-3 left-3 pointer-events-none space-y-1 max-w-[60vw]">
        <div className="px-2 py-1 rounded bg-black/70 backdrop-blur border border-yellow-500/30 text-[9px] font-mono text-yellow-400 truncate">
          🖼 GALLERY · @{ownerHandle} · {THEME_CONFIG[theme].name}
        </div>
        <div className="px-2 py-1 rounded bg-black/60 backdrop-blur border border-white/10 text-[8px] font-mono text-gray-400">
          {stats.frames} frames · {stats.fps} fps · {stats.position}
        </div>
        {nowPlaying && (
          <div className="px-2 py-1 rounded bg-black/80 backdrop-blur border border-cyan-500/40 text-[9px] font-mono text-cyan-300 animate-pulse">
            ♪ {nowPlaying}
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-3 pointer-events-none">
        <div className="px-2 py-1 rounded bg-black/60 backdrop-blur border border-white/10 text-[8px] font-mono text-gray-500">
          WASD walk · click frame for details · approach to hear audio
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center space-y-2">
            <div className="text-yellow-400 font-mono text-sm animate-pulse">LOADING GALLERY...</div>
            <div className="text-gray-600 font-mono text-[10px]">Hanging frames on the walls</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && tracks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <div className="text-center space-y-2 max-w-md p-6">
            <div className="text-yellow-400 font-mono text-sm">EMPTY GALLERY</div>
            <div className="text-gray-500 font-mono text-[10px]">@{ownerHandle} hasn't uploaded any tracks yet</div>
          </div>
        </div>
      )}

      {/* Frame detail modal */}
      {selectedTrack && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedTrack(null)}>
          <div className="w-full max-w-md bg-[#0a0f1f] border border-yellow-500/30 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-500/20 bg-black/40">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-mono font-bold text-yellow-400">FRAME DETAIL</span>
              </div>
              <button onClick={() => setSelectedTrack(null)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {/* Artwork + inline player overlay */}
            <div className="aspect-square bg-black relative group">
              {selectedTrack.artworkUrl ? (
                <img src={selectedTrack.artworkUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-yellow-900/30 to-purple-900/30 flex items-center justify-center">
                  <Music className="w-12 h-12 text-yellow-500/30" />
                </div>
              )}
              {/* Inline play button overlay */}
              {(selectedTrack.playbackUrl || selectedTrack.audioUrl) && (
                <button
                  onClick={() => {
                    const url = selectedTrack.playbackUrl || selectedTrack.audioUrl
                    if (!url) return
                    // Toggle play/pause for this track
                    const existing = audioRefsMap.current.get(selectedTrack.id)
                    if (existing && !existing.paused) {
                      existing.pause()
                      setNowPlaying(null)
                    } else {
                      // Stop all other audio first
                      audioRefsMap.current.forEach(a => { a.pause(); a.currentTime = 0 })
                      if (existing) {
                        existing.play().catch(() => {})
                      } else {
                        const audio = new Audio(url)
                        audio.crossOrigin = 'anonymous'
                        audioRefsMap.current.set(selectedTrack.id, audio)
                        audio.play().catch(() => {})
                        audio.onended = () => setNowPlaying(null)
                      }
                      setNowPlaying(selectedTrack.id)
                    }
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="w-16 h-16 rounded-full bg-black/70 border-2 border-cyan-400 flex items-center justify-center">
                    {nowPlaying === selectedTrack.id ? <Pause className="w-7 h-7 text-cyan-400" /> : <Play className="w-7 h-7 text-cyan-400 ml-1" />}
                  </div>
                </button>
              )}
              {/* Now playing indicator */}
              {nowPlaying === selectedTrack.id && (
                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 px-2 py-1 rounded bg-black/70 backdrop-blur">
                  <Volume2 className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <div className="flex-1 h-1 bg-white/10 rounded overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded animate-pulse" style={{ width: '60%' }} />
                  </div>
                  <span className="text-[8px] font-mono text-cyan-400">PLAYING</span>
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <h3 className="text-lg font-mono font-bold text-white">{selectedTrack.title}</h3>
              <p className="text-sm font-mono text-gray-400">{selectedTrack.artist || ownerHandle}</p>
              <div className="flex items-center gap-2 text-[10px] font-mono flex-wrap">
                {selectedTrack.isNFT && <span className="text-purple-400 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">NFT</span>}
                {selectedTrack.editionSize && selectedTrack.editionSize > 1 && <span className="text-yellow-400 px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20">1/{selectedTrack.editionSize}</span>}
                {selectedTrack.ipfsHash && <span className="text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">IPFS</span>}
                {(selectedTrack.playbackUrl || selectedTrack.audioUrl) && <span className="text-green-400 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20">▶ audio</span>}
                {!(selectedTrack.playbackUrl || selectedTrack.audioUrl) && <span className="text-red-400 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">no audio</span>}
              </div>
              {/* Track details — stays in this card, never redirects */}
              <div className="p-2 rounded bg-black/40 border border-white/5 text-[9px] font-mono text-gray-500 space-y-1">
                <div className="flex justify-between"><span>Track ID</span><span className="text-gray-400">{selectedTrack.id.slice(0, 12)}...</span></div>
                {selectedTrack.artist && <div className="flex justify-between"><span>Artist</span><span className="text-cyan-400">@{selectedTrack.artist}</span></div>}
                <div className="flex justify-between"><span>Audio</span><span className="text-gray-400 truncate max-w-[180px]">{selectedTrack.playbackUrl || selectedTrack.audioUrl || 'none'}</span></div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {/* Play inline — no redirect */}
                <button
                  onClick={() => {
                    const url = selectedTrack.playbackUrl || selectedTrack.audioUrl
                    if (!url) { toast.error('No audio available'); return }
                    audioRefsMap.current.forEach(a => { a.pause(); a.currentTime = 0 })
                    const audio = new Audio(url)
                    audio.crossOrigin = 'anonymous'
                    audioRefsMap.current.set(selectedTrack.id, audio)
                    audio.play().catch(() => toast.error('Playback failed'))
                    setNowPlaying(selectedTrack.id)
                    audio.onended = () => setNowPlaying(null)
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono hover:bg-cyan-500/30 transition"
                >
                  {nowPlaying === selectedTrack.id ? <><Pause className="w-3 h-3" /> Now Playing</> : <><Play className="w-3 h-3" /> Play Track</>}
                </button>
                {/* Save to archive */}
                <button
                  onClick={() => {
                    fetch('/api/feed/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bookmark', trackId: selectedTrack.id }) }).catch(() => {})
                    toast.success('Saved to your archive!')
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-mono hover:bg-amber-500/30 transition"
                >
                  <Heart className="w-3 h-3" /> Save
                </button>
                {/* Share — copy link */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/track/${selectedTrack.id}`)
                    toast.success('Link copied!')
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-white/5 border border-white/10 text-gray-400 text-[10px] font-mono hover:bg-white/10 transition"
                >
                  <Copy className="w-3 h-3" /> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
