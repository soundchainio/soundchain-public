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

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useRouter } from 'next/router'
import { Music, X, Heart, Share2, Play, Pause, Volume2, Copy, Check, Paintbrush, Plus } from 'lucide-react'
import { toast } from 'react-toastify'
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES, filterByCategory, getPlacedFurniture, savePlacedFurniture, getFurnitureById, type PlacedFurniture, type FurnitureCategory } from 'lib/nodeverse/galleryFurniture'
import { AudioPlayer } from 'components/AudioPlayer'
import { getStoredCharacter, type CharacterConfig } from 'components/CharacterDesigner'

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
  theme?: 'modern' | 'cyberpunk' | 'vinyl' | 'vault' | 'city'
}

const THEME_CONFIG = {
  modern: { wall: 0xf5f5f5, floor: 0xe5e5e5, accent: 0x22d3ee, ambient: 0xffffff, name: 'MODERN' },
  cyberpunk: { wall: 0x1a1a3a, floor: 0x0a0a1a, accent: 0xa855f7, ambient: 0x4040ff, name: 'CYBERPUNK' },
  vinyl: { wall: 0x3a2a1a, floor: 0x2a1a0a, accent: 0xfacc15, ambient: 0xfacc15, name: 'VINYL STORE' },
  vault: { wall: 0x0a0a0a, floor: 0x050505, accent: 0xfacc15, ambient: 0x666666, name: 'NFT VAULT' },
  // Phase 16.12 — GTA / NBA2K-style city street. Brick storefronts on side
  // walls, alley gaps, billboards on building facades displaying user's NFTs.
  // Walk through the "block" like a player-one mode game.
  city: { wall: 0x3a2520, floor: 0x222428, accent: 0xfacc15, ambient: 0x5a4a3a, name: 'CITY STREETS' },
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

  // Furniture state — declared before the scene-building useEffect that reads placedFurniture
  const [showCustomize, setShowCustomize] = useState(false)
  const [furnitureCategory, setFurnitureCategory] = useState<FurnitureCategory | 'all'>('all')
  // Phase 16.13 — gamepad connection state (HUD indicator)
  const [gamepadConnected, setGamepadConnected] = useState(false)
  const gamepadConnectedRef = useRef(false)
  const [placedFurniture, setPlacedFurniture] = useState<PlacedFurniture[]>(() => getPlacedFurniture(ownerHandle))
  const [placingItem, setPlacingItem] = useState<string | null>(null)
  const [hideFurnitureCount, setHideFurnitureCount] = useState(false)
  const [inviting, setInviting] = useState(false)

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
    // City theme gets asphalt + painted street lines instead of polished floor
    const floorGeo = new THREE.PlaneGeometry(40, 40)
    let floorMat: THREE.MeshStandardMaterial
    if (theme === 'city') {
      floorMat = new THREE.MeshStandardMaterial({ color: themeCfg.floor, metalness: 0.05, roughness: 0.95 })
    } else {
      floorMat = new THREE.MeshStandardMaterial({ color: themeCfg.floor, metalness: 0.6, roughness: 0.3 })
    }
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    // Phase 16.12 — CITY THEME: street markings, brick storefronts, awnings,
    // alley gaps, billboards. Builds on top of the existing wall structure
    // so frames/tracks still work; just adds GTA/NBA2K-style city ambiance.
    if (theme === 'city') {
      // Dashed center line down the street
      for (let i = -18; i <= 18; i += 3) {
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(0.3, 1.8),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.15 })
        )
        dash.rotation.x = -Math.PI / 2
        dash.position.set(0, 0.01, i)
        scene.add(dash)
      }
      // Sidewalk strips along left/right walls
      const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.95 })
      ;[-16.5, 16.5].forEach((x) => {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 40), sidewalkMat)
        sw.position.set(x, 0.075, 0)
        sw.receiveShadow = true
        scene.add(sw)
      })
      // Procedural brick texture for the storefront walls
      const brickCanvas = document.createElement('canvas')
      brickCanvas.width = 256; brickCanvas.height = 256
      const bctx = brickCanvas.getContext('2d')!
      bctx.fillStyle = '#5a3a30'; bctx.fillRect(0, 0, 256, 256)
      bctx.strokeStyle = '#2a1810'; bctx.lineWidth = 2
      const brickH = 16
      const brickW = 36
      for (let row = 0; row < 256 / brickH; row++) {
        const xOff = (row % 2 === 0) ? 0 : brickW / 2
        for (let col = -1; col <= 256 / brickW; col++) {
          const x = col * brickW + xOff
          const y = row * brickH
          bctx.strokeRect(x, y, brickW, brickH)
          // mortar shading
          bctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.08})`
          bctx.fillRect(x + 1, y + 1, brickW - 2, brickH - 2)
        }
      }
      const brickTex = new THREE.CanvasTexture(brickCanvas)
      brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping
      brickTex.repeat.set(8, 2)
      const brickMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.85, metalness: 0.05 })
      // Storefront facades flat against side walls (brick texture overlay)
      ;[
        { x: -19.0, rot: Math.PI / 2 },
        { x: 19.0, rot: -Math.PI / 2 },
      ].forEach(({ x, rot }) => {
        const facade = new THREE.Mesh(new THREE.PlaneGeometry(40, 8), brickMat)
        facade.position.set(x, 4, 0)
        facade.rotation.y = rot
        scene.add(facade)
      })
      // Storefront awnings — bright colored stripes along the walls
      const awningColors = [0xdc2626, 0x16a34a, 0x2563eb, 0xfacc15, 0xa855f7]
      for (let i = 0; i < 6; i++) {
        const ax = -16 + i * 6.5
        const acol = awningColors[i % awningColors.length]
        const aMat = new THREE.MeshStandardMaterial({ color: acol, emissive: acol, emissiveIntensity: 0.1, roughness: 0.5 })
        ;[-18.5, 18.5].forEach((wx) => {
          const awning = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 1.5), aMat)
          awning.position.set(wx + (wx < 0 ? 1 : -1), 3.5, ax)
          awning.castShadow = true
          scene.add(awning)
          // Storefront door (dark rectangle below awning)
          const doorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.3, emissive: 0xfacc15, emissiveIntensity: 0.05 })
          const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.5), doorMat)
          door.position.set(wx + (wx < 0 ? 0.05 : -0.05), 1.5, ax)
          door.rotation.y = wx < 0 ? Math.PI / 2 : -Math.PI / 2
          scene.add(door)
          // Storefront window beside the door
          const winMat = new THREE.MeshStandardMaterial({ color: 0x88aabb, transparent: true, opacity: 0.45, metalness: 0.9, roughness: 0.1, emissive: 0xfacc15, emissiveIntensity: 0.08 })
          const win = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), winMat)
          win.position.set(wx + (wx < 0 ? 0.05 : -0.05), 1.8, ax + 1.6)
          win.rotation.y = wx < 0 ? Math.PI / 2 : -Math.PI / 2
          scene.add(win)
        })
      }
      // Phase 16.14 — BASKETBALL HALF-COURT at the far end of the street.
      // Painted asphalt + boundary lines + free-throw + three-point arc + hoop.
      // No physics yet (Phase 16.15) but it's a real visual landmark to walk
      // up to. Frank's vision: stumble across it during a gallery walk, see
      // the hoop, eventually pick up a game.
      const courtZ = -17  // back of street
      // Court boundary paint (cyan-grey concrete)
      const courtMat = new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.95 })
      const court = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), courtMat)
      court.rotation.x = -Math.PI / 2
      court.position.set(0, 0.02, courtZ)
      court.receiveShadow = true
      scene.add(court)
      // White boundary lines (4 thin rectangles framing the court)
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
      const mkLine = (w: number, h: number, x: number, z: number) => {
        const ln = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat)
        ln.rotation.x = -Math.PI / 2
        ln.position.set(x, 0.03, z)
        scene.add(ln)
      }
      mkLine(10, 0.08, 0, courtZ - 3)  // top
      mkLine(10, 0.08, 0, courtZ + 3)  // bottom
      mkLine(0.08, 6, -5, courtZ)      // left
      mkLine(0.08, 6, 5, courtZ)       // right
      // Free-throw line + key paint
      mkLine(4, 0.08, 0, courtZ - 0.5)
      const keyPaint = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 3),
        new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.4 }),
      )
      keyPaint.rotation.x = -Math.PI / 2
      keyPaint.position.set(0, 0.025, courtZ - 1.8)
      scene.add(keyPaint)
      // Three-point arc (segmented line)
      for (let a = -Math.PI * 0.4; a <= Math.PI * 0.4; a += 0.05) {
        const r = 4
        const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.08), lineMat)
        seg.rotation.x = -Math.PI / 2
        seg.rotation.z = a + Math.PI / 2
        seg.position.set(Math.sin(a) * r, 0.03, courtZ - 2.8 - Math.cos(a) * r)
        scene.add(seg)
      }
      // Hoop pole + backboard + rim
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 4, 12),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.4 }),
      )
      pole.position.set(0, 2, courtZ - 3.5)
      pole.castShadow = true
      scene.add(pole)
      const backboard = new THREE.Mesh(
        new THREE.BoxGeometry(2, 1.3, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 }),
      )
      backboard.position.set(0, 3.8, courtZ - 3.4)
      backboard.castShadow = true
      scene.add(backboard)
      // Backboard square (target box)
      const targetBox = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.45),
        new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0 }),
      )
      ;[
        [-0.3, 3.6], [0.3, 3.6], [-0.3, 4.05], [0.3, 4.05],
      ].forEach(() => {})
      // Just draw target square outline
      const sqOutline = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.6, 0.45)),
        new THREE.LineBasicMaterial({ color: 0xdc2626 }),
      )
      sqOutline.position.set(0, 3.7, courtZ - 3.35)
      scene.add(sqOutline)
      // Rim (orange ring)
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.04, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0xea580c, emissive: 0xea580c, emissiveIntensity: 0.2, metalness: 0.7, roughness: 0.3 }),
      )
      rim.position.set(0, 3.3, courtZ - 3.0)
      rim.rotation.x = Math.PI / 2
      rim.castShadow = true
      scene.add(rim)
      // Net (10 small cylinders hanging from rim — visual approximation)
      const netMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
      for (let ni = 0; ni < 12; ni++) {
        const a = (ni / 12) * Math.PI * 2
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.35, 4), netMat)
        seg.position.set(Math.cos(a) * 0.32, 3.13, courtZ - 3.0 + Math.sin(a) * 0.32)
        scene.add(seg)
      }
      // Court signage above the court — yellow "WELCOME TO THE COURT"
      const signCanvas = document.createElement('canvas')
      signCanvas.width = 1024; signCanvas.height = 128
      const sctx = signCanvas.getContext('2d')!
      sctx.fillStyle = '#000'; sctx.fillRect(0, 0, 1024, 128)
      sctx.strokeStyle = '#facc15'; sctx.lineWidth = 4; sctx.strokeRect(8, 8, 1008, 112)
      sctx.fillStyle = '#facc15'; sctx.font = 'bold 64px monospace'; sctx.textAlign = 'center'
      sctx.fillText('🏀 THE COURT · 16.14', 512, 80)
      const signTex = new THREE.CanvasTexture(signCanvas)
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 0.75),
        new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xfacc15, emissiveIntensity: 0.3, emissiveMap: signTex }),
      )
      sign.position.set(0, 5.0, courtZ - 3.6)
      scene.add(sign)

      // Streetlamps every 8 units on both sides
      for (let lz = -16; lz <= 16; lz += 8) {
        ;[-15, 15].forEach((lx) => {
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 5, 8),
            new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.4 })
          )
          pole.position.set(lx, 2.5, lz)
          pole.castShadow = true
          scene.add(pole)
          const arm = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.1, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
          )
          arm.position.set(lx + (lx > 0 ? -0.75 : 0.75), 5, lz)
          scene.add(arm)
          const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xfff7c2, emissive: 0xfff7c2, emissiveIntensity: 0.8 })
          )
          bulb.position.set(lx + (lx > 0 ? -1.5 : 1.5), 4.9, lz)
          scene.add(bulb)
          const lampLight = new THREE.PointLight(0xfff7c2, 0.7, 8)
          lampLight.position.copy(bulb.position)
          scene.add(lampLight)
        })
      }
    }

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

    // Phase 16.12 — CITY THEME BILLBOARDS. Mount large NFT-artwork billboards
    // high on the building facades (above the storefront level). Up to 6
    // billboards distributed across left/right walls. Each shows the artwork
    // of one of the user's tracks. As character walks past = ad strip /
    // GTA-style storefront branding.
    if (theme === 'city' && tracks.length > 0) {
      const billboardCount = Math.min(6, tracks.length)
      for (let bi = 0; bi < billboardCount; bi++) {
        const t = tracks[bi]
        if (!t.artworkUrl) continue
        const isLeft = bi % 2 === 0
        const x = isLeft ? -18.4 : 18.4
        // Distribute along z within sidewalk range
        const z = -14 + (Math.floor(bi / 2)) * 10
        // Billboard "frame" — dark backing
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.6, roughness: 0.4 })
        const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, 6.2), frameMat)
        frameMesh.position.set(x, 6, z)
        scene.add(frameMesh)
        // Artwork plane on top of the frame
        textureLoader.load(
          t.artworkUrl,
          (tex) => {
            const billMat = new THREE.MeshStandardMaterial({
              map: tex,
              emissive: 0xffffff,
              emissiveIntensity: 0.25,
              emissiveMap: tex,
            })
            const bill = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), billMat)
            bill.position.set(x + (isLeft ? 0.16 : -0.16), 6, z)
            bill.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2
            scene.add(bill)
            // Caption strip below billboard
            const labelCanvas = document.createElement('canvas')
            labelCanvas.width = 512; labelCanvas.height = 96
            const lctx = labelCanvas.getContext('2d')!
            lctx.fillStyle = '#0a0a0a'; lctx.fillRect(0, 0, 512, 96)
            lctx.fillStyle = '#facc15'; lctx.font = 'bold 36px monospace'; lctx.textAlign = 'center'
            lctx.fillText((t.title || 'TRACK').slice(0, 24).toUpperCase(), 256, 50)
            if (t.artist) {
              lctx.fillStyle = '#ffffff'; lctx.font = '20px monospace'
              lctx.fillText(`@ ${t.artist}`.slice(0, 32), 256, 78)
            }
            const labelTex = new THREE.CanvasTexture(labelCanvas)
            const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, emissive: 0xfacc15, emissiveIntensity: 0.3, emissiveMap: labelTex })
            const label = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.9), labelMat)
            label.position.set(x + (isLeft ? 0.16 : -0.16), 3.6, z)
            label.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2
            scene.add(label)
          },
          undefined,
          (err) => console.warn('[GalleryRoom3D] billboard texture failed:', err),
        )
        // Spotlight illuminating the billboard
        const spot = new THREE.SpotLight(0xffffff, 1.5, 12, Math.PI / 6, 0.4, 1)
        spot.position.set(x + (isLeft ? 3 : -3), 9, z)
        spot.target.position.set(x, 6, z)
        scene.add(spot)
        scene.add(spot.target)
      }
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

    // ─── Player avatar — saved character (GLB if available, capsule fallback) ──
    // Phase 16.11 — reads the same character config the user saves in
    // CharacterDesigner. If type is 'human'/'opensource'/'ai' and a humanGlbUrl
    // (or aiGlbUrl) is present, loads it; otherwise renders the legacy capsule.
    const playerGroup = new THREE.Group()
    playerGroup.position.set(0, 0, 5)
    scene.add(playerGroup)

    const character = getStoredCharacter()
    const glbUrl = character.type === 'ai'
      ? (character as any).aiGlbUrl || character.humanGlbUrl
      : character.humanGlbUrl
    const isGlbAvatar = (character.type === 'human' || character.type === 'opensource' || character.type === 'ai') && glbUrl

    if (isGlbAvatar) {
      const loader = new GLTFLoader()
      loader.load(
        glbUrl!,
        (gltf) => {
          const model = gltf.scene
          const baseScale = character.humanScale ?? 1
          const heightMul = character.height ?? 1
          model.scale.setScalar(baseScale * heightMul)
          model.position.y = character.humanYOffset ?? 0
          model.traverse((obj: any) => {
            if (obj.isMesh) {
              obj.castShadow = true
              obj.receiveShadow = true
            }
          })
          playerGroup.add(model)
        },
        undefined,
        (err) => {
          console.error('[GalleryRoom3D] character GLB load failed, falling back to capsule:', err)
          const fallbackGeo = new THREE.CapsuleGeometry(0.4, 1, 4, 8)
          const fallbackMat = new THREE.MeshStandardMaterial({ color: themeCfg.accent, emissive: themeCfg.accent, emissiveIntensity: 0.3, metalness: 0.5, roughness: 0.3 })
          const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat)
          fallbackMesh.position.y = 1
          fallbackMesh.castShadow = true
          playerGroup.add(fallbackMesh)
        }
      )
    } else {
      // Legacy capsule for AGENT type or no saved character
      const playerGeo = new THREE.CapsuleGeometry(0.4, 1, 4, 8)
      const playerMat = new THREE.MeshStandardMaterial({
        color: character.bodyColor || themeCfg.accent,
        emissive: character.glowColor || themeCfg.accent,
        emissiveIntensity: character.glowIntensity ?? 0.3,
        metalness: 0.5,
        roughness: 0.3,
      })
      const playerMesh = new THREE.Mesh(playerGeo, playerMat)
      playerMesh.position.y = 1
      playerMesh.castShadow = true
      playerGroup.add(playerMesh)
    }

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

    // ─── Placed Furniture (procedural Three.js geometry) ───────
    placedFurniture.forEach(pf => {
      const item = getFurnitureById(pf.itemId)
      if (!item) return
      const color = new THREE.Color(pf.color)
      const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.7 })

      let mesh: THREE.Mesh
      if (item.category === 'rugs') {
        // Flat plane for rugs
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(item.width, item.depth), mat)
        mesh.rotation.x = -Math.PI / 2
      } else if (item.category === 'plants') {
        // Cylinder trunk + sphere foliage
        const group = new THREE.Group()
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, item.height * 0.4, 8), new THREE.MeshStandardMaterial({ color: '#5c4033' }))
        trunk.position.y = item.height * 0.2
        group.add(trunk)
        const foliage = new THREE.Mesh(new THREE.SphereGeometry(item.width * 0.8, 12, 12), mat)
        foliage.position.y = item.height * 0.6
        group.add(foliage)
        // Pot
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.25, 8), new THREE.MeshStandardMaterial({ color: '#8b4513' }))
        pot.position.y = 0.125
        group.add(pot)
        group.position.set(pf.x, item.yOffset, pf.z)
        group.rotation.y = pf.rotation
        scene.add(group)
        return
      } else if (item.category === 'lighting' && item.id === 'neon-sign') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(item.width, item.height, item.depth),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 }))
      } else {
        // Default: box geometry
        mesh = new THREE.Mesh(new THREE.BoxGeometry(item.width, item.height, item.depth), mat)
      }
      mesh.position.set(pf.x, item.yOffset + item.height / 2, pf.z)
      mesh.rotation.y = pf.rotation
      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
    })

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

      // Movement (with bounds) — keyboard OR gamepad (Phase 16.13)
      const fwd = (keys['w'] || keys['arrowup']) ? 1 : 0
      const back = (keys['s'] || keys['arrowdown']) ? 1 : 0
      const left = (keys['a'] || keys['arrowleft']) ? 1 : 0
      const right = (keys['d'] || keys['arrowright']) ? 1 : 0
      // Gamepad input — left stick for movement, dpad as fallback.
      // navigator.getGamepads() returns null entries for disconnected slots;
      // poll the first connected pad. Deadzone 0.15 to ignore stick drift.
      let gpX = 0, gpY = 0
      try {
        const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : []
        for (let pi = 0; pi < pads.length; pi++) {
          const p = pads[pi]
          if (!p) continue
          const sx = p.axes[0] || 0
          const sy = p.axes[1] || 0
          if (Math.abs(sx) > 0.15) gpX = sx
          if (Math.abs(sy) > 0.15) gpY = sy
          // D-pad buttons 12-15 (up/down/left/right) as fallback
          if (p.buttons[12]?.pressed) gpY = -1
          if (p.buttons[13]?.pressed) gpY = 1
          if (p.buttons[14]?.pressed) gpX = -1
          if (p.buttons[15]?.pressed) gpX = 1
          if (gpX !== 0 || gpY !== 0) {
            if (!gamepadConnectedRef.current) {
              gamepadConnectedRef.current = true
              setGamepadConnected(true)
            }
            break
          }
        }
      } catch {}
      // Combine keyboard + gamepad; gamepad axes are analog (-1..1) so they
      // can express finer movement than binary keys.
      const moveX = (right - left) + gpX
      const moveZ = -(fwd - back) + gpY
      const mag = Math.min(1, Math.hypot(moveX, moveZ))
      const dirX = mag > 0.001 ? moveX / Math.hypot(moveX, moveZ) : 0
      const dirZ = mag > 0.001 ? moveZ / Math.hypot(moveX, moveZ) : 0
      playerGroup.position.x += dirX * SPEED * mag
      playerGroup.position.z += dirZ * SPEED * mag
      playerGroup.position.x = Math.max(-PLAYER_BOUNDS, Math.min(PLAYER_BOUNDS, playerGroup.position.x))
      playerGroup.position.z = Math.max(-PLAYER_BOUNDS, Math.min(PLAYER_BOUNDS, playerGroup.position.z))
      if (mag > 0.05) {
        playerGroup.rotation.y = Math.atan2(dirX, -dirZ)
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
  }, [tracks, theme, loading, nowPlaying, placedFurniture])

  const addFurniture = useCallback((itemId: string) => {
    const item = getFurnitureById(itemId)
    if (!item) return
    const newPlaced: PlacedFurniture = {
      itemId,
      x: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 10,
      rotation: 0,
      color: item.color,
    }
    const updated = [...placedFurniture, newPlaced]
    setPlacedFurniture(updated)
    savePlacedFurniture(ownerHandle, updated)
    toast.success(`${item.emoji} ${item.name} placed!`)
    setPlacingItem(null)
  }, [placedFurniture, ownerHandle])

  const removeFurniture = useCallback((index: number) => {
    const updated = placedFurniture.filter((_, i) => i !== index)
    setPlacedFurniture(updated)
    savePlacedFurniture(ownerHandle, updated)
    toast.success('Furniture removed')
  }, [placedFurniture, ownerHandle])

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
        {/* Phase 16.17 — gamepad connection indicator */}
        {gamepadConnected && (
          <div className="px-2 py-1 rounded bg-emerald-500/15 backdrop-blur border border-emerald-500/40 text-[9px] font-mono text-emerald-300">
            🎮 GAMEPAD CONNECTED · L-stick to move
          </div>
        )}
        {/* Phase 16.16 — city-mode address search (OSM Nominatim, free, no key) */}
        {theme === 'city' && (
          <form
            className="flex items-center gap-1 pointer-events-auto"
            onSubmit={async (e) => {
              e.preventDefault()
              const input = (e.currentTarget.elements.namedItem('q') as HTMLInputElement)
              const q = input?.value?.trim()
              if (!q) return
              try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, {
                  headers: { 'Accept': 'application/json' },
                })
                const data = await res.json()
                if (Array.isArray(data) && data[0]) {
                  toast.success(`📍 ${data[0].display_name.slice(0, 60)}`)
                  // Future: load 3D building tiles for these coords
                  console.log('[city-search]', data[0])
                } else {
                  toast.info('Address not found')
                }
              } catch (err: any) {
                toast.error(`Search failed: ${err?.message || 'network error'}`)
              }
            }}
          >
            <input
              name="q"
              placeholder="🌍 search city / address…"
              className="bg-black/70 backdrop-blur border border-yellow-500/30 rounded px-2 py-1 text-[10px] font-mono text-yellow-300 placeholder:text-yellow-500/40 outline-none focus:border-yellow-500/60 w-44"
            />
            <button type="submit" className="px-2 py-1 rounded bg-yellow-500/20 border border-yellow-500/40 text-[9px] font-mono text-yellow-300 hover:bg-yellow-500/30">GO</button>
          </form>
        )}
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-3 pointer-events-none hidden sm:block">
        <div className="px-2 py-1 rounded bg-black/60 backdrop-blur border border-white/10 text-[8px] font-mono text-gray-500">
          WASD or 🎮 left-stick walk · click frame for details · approach to hear audio
        </div>
      </div>

      {/* Bottom pills — SHARE + INVITE + CUSTOMIZE */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
        {/* SHARE — copy link or native share sheet on mobile */}
        <button
          onClick={() => {
            const url = `${window.location.origin}/gallery3d?handle=${ownerHandle}`
            // Use native share on mobile (iOS/Android), clipboard on desktop
            if (typeof navigator.share === 'function') {
              navigator.share({ title: `${ownerHandle}'s Gallery`, text: 'Come visit my Gallery on SoundChain!', url }).catch(() => {})
              toast.success('Share sheet opened!')
            } else {
              // Clipboard fallback with textarea trick (works on all browsers)
              const ta = document.createElement('textarea')
              ta.value = url
              ta.style.position = 'fixed'
              ta.style.opacity = '0'
              document.body.appendChild(ta)
              ta.select()
              document.execCommand('copy')
              document.body.removeChild(ta)
              toast.success('Gallery link copied!')
            }
          }}
          className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-[9px] font-mono font-bold hover:bg-cyan-500/30 transition backdrop-blur active:scale-95"
        >
          <Copy className="w-3 h-3" /> SHARE
        </button>
        {/* INVITE — post to Nodes feed */}
        <button
          onClick={async () => {
            if (inviting) return
            setInviting(true)
            const tid = toast.loading('Posting invite to feed…')
            try {
              const url = `${window.location.origin}/gallery3d?handle=${ownerHandle}`
              const r = await fetch('/api/feed/create', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  body: `🖼 Come visit my Gallery!\n\nWalk through, check out my collection, vibe to the music.\n\n👉 ${url}`,
                }),
              })
              if (r.ok) toast.update(tid, { render: 'Gallery invite posted to feed!', type: 'success', isLoading: false, autoClose: 3000 })
              else toast.update(tid, { render: 'Post failed — are you logged in?', type: 'error', isLoading: false, autoClose: 4000 })
            } catch {
              toast.update(tid, { render: 'Post failed — check connection', type: 'error', isLoading: false, autoClose: 4000 })
            } finally {
              setInviting(false)
            }
          }}
          disabled={inviting}
          className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-400 text-[9px] font-mono font-bold hover:bg-purple-500/30 transition backdrop-blur active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Share2 className="w-3 h-3" /> {inviting ? 'POSTING…' : 'INVITE'}
        </button>
        {/* CUSTOMIZE — furniture */}
        <button
          onClick={() => setShowCustomize(true)}
          className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-[9px] font-mono font-bold hover:bg-yellow-500/30 transition backdrop-blur active:scale-95"
        >
          <Paintbrush className="w-3 h-3" /> CUSTOMIZE
        </button>
      </div>

      {/* Furniture placement count — dismissable */}
      {placedFurniture.length > 0 && !hideFurnitureCount && (
        <div className="absolute bottom-14 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded bg-black/60 backdrop-blur border border-white/10 text-[8px] font-mono text-gray-400">
          {placedFurniture.length} items placed
          <button onClick={() => setHideFurnitureCount(true)} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* CUSTOMIZE MODAL — furniture catalog */}
      {showCustomize && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCustomize(false)}>
          <div className="w-full max-w-lg bg-[#0a0f1f] border border-yellow-500/30 rounded-t-xl sm:rounded-xl shadow-2xl overflow-hidden max-h-[70vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-500/20 bg-black/40 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Paintbrush className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-mono font-bold text-yellow-400">CUSTOMIZE GALLERY</span>
                <span className="text-[8px] font-mono text-gray-600">{placedFurniture.length} items</span>
              </div>
              <button onClick={() => setShowCustomize(false)} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4 text-gray-400" /></button>
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 bg-black/20 overflow-x-auto">
              {FURNITURE_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setFurnitureCategory(c.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono whitespace-nowrap transition ${furnitureCategory === c.id ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}
                >{c.emoji} {c.label}</button>
              ))}
            </div>

            {/* Furniture grid */}
            <div className="p-3 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[35vh] overflow-y-auto">
              {filterByCategory(furnitureCategory).map(item => (
                <button key={item.id} onClick={() => addFurniture(item.id)}
                  className="group flex flex-col items-center gap-1 p-3 rounded border border-white/10 hover:border-yellow-500/40 bg-white/[0.02] hover:bg-yellow-500/5 transition"
                >
                  <div className="text-3xl group-hover:scale-110 transition-transform">{item.emoji}</div>
                  <div className="text-[9px] font-mono text-white text-center truncate w-full">{item.name}</div>
                  <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: item.color }} />
                </button>
              ))}
            </div>

            {/* Placed items list — remove button */}
            {placedFurniture.length > 0 && (
              <div className="px-4 py-2 border-t border-white/5 max-h-[15vh] overflow-y-auto">
                <div className="text-[9px] font-mono text-gray-500 uppercase mb-1">Placed Items</div>
                <div className="space-y-1">
                  {placedFurniture.map((pf, i) => {
                    const item = getFurnitureById(pf.itemId)
                    return (
                      <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-black/40 border border-white/5">
                        <span className="text-[9px] font-mono text-gray-400">{item?.emoji} {item?.name}</span>
                        <button onClick={() => removeFurniture(i)} className="text-[8px] font-mono text-red-400 hover:text-red-300">remove</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="px-4 py-2 border-t border-white/5 bg-black/40 text-[8px] font-mono text-gray-600">
              Tap any item to place it randomly in your gallery. Furniture saves to your device.
            </div>
          </div>
        </div>
      )}

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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4" onClick={() => setSelectedTrack(null)}>
          <div className="w-full max-w-sm sm:max-w-md bg-[#0a0f1f] border border-yellow-500/30 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            {/* Header — sticky, always shows X chevron */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-yellow-500/20 bg-black/60 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-mono font-bold text-yellow-400">FRAME DETAIL</span>
              </div>
              <button onClick={() => setSelectedTrack(null)} className="p-1.5 hover:bg-white/10 rounded-full border border-white/10" aria-label="Close">
                <X className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            {/* Scrollable body — artwork + playbar + meta all live here, footer stays reachable */}
            <div className="flex-1 overflow-y-auto">
              {/* Artwork — shrunk on mobile so the card isn't a full-screen render */}
              <div className="h-40 sm:aspect-square sm:h-auto bg-black relative">
                {selectedTrack.artworkUrl ? (
                  <img src={selectedTrack.artworkUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-yellow-900/30 to-purple-900/30 flex items-center justify-center">
                    <Music className="w-12 h-12 text-yellow-500/30" />
                  </div>
                )}
              </div>
              {/* Inline canonical AudioPlayer — plays IN this card, not in the bottom sticky bar.
                  Stop all proximity-audio first so the scene loop doesn't fight this player. */}
              {(selectedTrack.playbackUrl || selectedTrack.audioUrl) && (
                <div
                  className="p-3 bg-black"
                  onClickCapture={() => {
                    audioRefsMap.current.forEach(a => { try { a.pause(); a.currentTime = 0 } catch {} })
                  }}
                >
                  <AudioPlayer
                    src={(selectedTrack.playbackUrl || selectedTrack.audioUrl) as string}
                    title={selectedTrack.title}
                    artist={selectedTrack.artist || ownerHandle}
                    art={selectedTrack.artworkUrl}
                    trackId={selectedTrack.id}
                  />
                </div>
              )}
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
                  {/* Save to archive */}
                  <button
                    onClick={() => {
                      fetch('/api/feed/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bookmark', trackId: selectedTrack.id }) }).catch(() => {})
                      toast.success('Saved to your archive!')
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-mono hover:bg-amber-500/30 transition"
                  >
                    <Heart className="w-3 h-3" /> Save
                  </button>
                  {/* Share — copy link */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/track/${selectedTrack.id}`)
                      toast.success('Link copied!')
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-white/5 border border-white/10 text-gray-400 text-[10px] font-mono hover:bg-white/10 transition"
                  >
                    <Copy className="w-3 h-3" /> Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
