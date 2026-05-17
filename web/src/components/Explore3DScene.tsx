/**
 * Explore3DScene — The Hybrid Grid walkable world
 *
 * Three.js scene with:
 * - WASD/Arrow keys movement (Tier 1 browser)
 * - Touch joystick for mobile
 * - Ready Player Me avatar (or fallback capsule)
 * - Procedural grid floor (cyberpunk vibe)
 * - Other resident avatars from /api/explore/users-merged
 * - Click avatar → portal to their /dex/users/{handle}
 *
 * INTERNODES on the INTERNETS — PORTALNODES = clickable residents.
 * Same world, different render quality per device tier.
 *
 * IMPORTANT: Must be loaded via dynamic import with ssr:false (RadioScene4D pattern)
 * to avoid TDZ in webpack bundle.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useRouter } from 'next/router'
import { User, MapPin, Coins, X, Lock, Check } from 'lucide-react'
import { CharacterDesigner, getStoredCharacter, loadRemoteCharacter, saveCharacter, type CharacterConfig } from './CharacterDesigner'
import { buildFaceGroup, buildOutfitGroup, buildHeadMaterial, computeAgentAnchors } from 'lib/nodeverse/characterMesh'
import {
  BUILDABLE_CATALOG,
  BUILDABLE_CATEGORIES,
  buildablesByCategory,
  buildBuildableMesh,
  getBuildable,
  type BuildableCategory,
  type BuildableItem,
  type PlacedBuildable,
} from 'lib/nodeverse/buildables'
import FrameBindModal from './FrameBindModal'
import GameHostModal, { type GameSession } from './GameHostModal'

interface Resident {
  id: string
  displayName: string
  userHandle?: string
  profilePicture?: string
  position?: { x: number; z: number }
  nodeverseCharacter?: CharacterConfig | null
}

interface Explore3DSceneProps {
  myHandle?: string
  myAvatar?: string
}

export default function Explore3DScene({ myHandle, myAvatar }: Explore3DSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [residents, setResidents] = useState<Resident[]>([])
  const [hoveredResident, setHoveredResident] = useState<Resident | null>(null)
  const [stats, setStats] = useState({ fps: 0, residents: 0, position: 'x:0 z:0' })
  const [showInfo, setShowInfo] = useState(true)
  const [showDesigner, setShowDesigner] = useState(false)
  const [character, setCharacter] = useState<CharacterConfig>(() => getStoredCharacter())
  // ─── Nodeverse Land state ────────────────────────────────
  const [ownedSquares, setOwnedSquares] = useState<Array<{ x: number; z: number; ownerHandle: string; ownerColor: string; price: number; tier: string; label?: string }>>([])
  const [landStats, setLandStats] = useState<{ totalOwned: number; totalRevenue: number } | null>(null)
  const [hoveredSquare, setHoveredSquare] = useState<{ x: number; z: number; price: number; tier: string; owned?: any } | null>(null)
  const [purchaseModal, setPurchaseModal] = useState<{ x: number; z: number; price: number; tier: string } | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  // Player position state for mini-map
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 0 })
  // Mobile action refs — buttons toggle these, animate loop reads them
  const runRef = useRef(false)
  const jumpRef = useRef(false)
  // ─── BUILD MODE (Phase 2) — place walls, sofas, NFT frames, vehicles ─────
  const [editMode, setEditMode] = useState(false)
  const [placedBuildables, setPlacedBuildables] = useState<PlacedBuildable[]>([])
  const [showPalette, setShowPalette] = useState(false)
  const [paletteCategory, setPaletteCategory] = useState<BuildableCategory>('furniture')
  const [pendingBuildable, setPendingBuildable] = useState<BuildableItem | null>(null)
  const [pendingColor, setPendingColor] = useState<string | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<PlacedBuildable | null>(null)
  const [bindFrameCandidate, setBindFrameCandidate] = useState<PlacedBuildable | null>(null)
  const [drivingVehicle, setDrivingVehicle] = useState<PlacedBuildable | null>(null)
  const [gameSessions, setGameSessions] = useState<GameSession[]>([])
  const [gameModalOpen, setGameModalOpen] = useState(false)
  // Refs used by raycast handlers so they can read latest state without re-subscribing.
  const editModeRef = useRef(editMode); editModeRef.current = editMode
  const pendingRef = useRef<BuildableItem | null>(pendingBuildable); pendingRef.current = pendingBuildable
  const pendingColorRef = useRef<string | null>(pendingColor); pendingColorRef.current = pendingColor
  // Phase 4 — current vehicle being ridden. Ref lets animate loop read it without re-subscribing.
  const drivingRef = useRef<{ group: any; data: PlacedBuildable } | null>(null)
  // Frame-in-place audio playback — SCID/audio-post frames play on click instead of routing away.
  // Ref survives re-renders so a tap can stop the previous audio before starting a new one.
  const frameAudioRef = useRef<{ el: HTMLAudioElement; buildableId: string } | null>(null)
  const [playingFrameId, setPlayingFrameId] = useState<string | null>(null)
  useEffect(() => () => {
    // Unmount cleanup — stop any in-frame audio when leaving the scene
    if (frameAudioRef.current) { try { frameAudioRef.current.el.pause() } catch {} ; frameAudioRef.current = null }
  }, [])
  const fetchLand = useCallback(() => {
    fetch('/api/nodeverse/squares')
      .then(r => r.json())
      .then(data => {
        setOwnedSquares(data.squares || [])
        setLandStats(data.stats || null)
      })
      .catch(() => {})
  }, [])
  useEffect(() => { fetchLand() }, [fetchLand])

  // Buildables in render range (±3 parcels from origin, matching scene render loop)
  const fetchBuildables = useCallback(() => {
    const qs = new URLSearchParams({ minParcelX: '-3', maxParcelX: '3', minParcelZ: '-3', maxParcelZ: '3' })
    fetch(`/api/nodeverse/buildables?${qs}`)
      .then(r => r.json())
      .then(data => setPlacedBuildables(data.buildables || []))
      .catch(() => {})
  }, [])
  useEffect(() => { fetchBuildables() }, [fetchBuildables])

  // Phase 5 — live game sessions (refresh every 30s so beacons + the HUD pill stay current).
  const fetchGameSessions = useCallback(() => {
    fetch('/api/nodeverse/game-sessions')
      .then(r => r.json())
      .then(data => setGameSessions(data.sessions || []))
      .catch(() => {})
  }, [])
  useEffect(() => {
    fetchGameSessions()
    const t = setInterval(fetchGameSessions, 30000)
    return () => clearInterval(t)
  }, [fetchGameSessions])

  // Place a buildable at a tapped world position. Caller has already verified
  // the tap hit the ground (raycast). parcelX/Z derive from world position.
  const placeBuildableAt = useCallback(async (worldX: number, worldZ: number) => {
    const item = pendingRef.current
    if (!item) return
    const color = pendingColorRef.current
    const PARCEL_SIZE = 16
    const parcelX = Math.round(worldX / PARCEL_SIZE)
    const parcelZ = Math.round(worldZ / PARCEL_SIZE)
    const localX = worldX - parcelX * PARCEL_SIZE
    const localZ = worldZ - parcelZ * PARCEL_SIZE
    try {
      const res = await fetch('/api/nodeverse/buildables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          buildableId: item.id,
          parcelX,
          parcelZ,
          localX,
          localY: 0,
          localZ,
          rotY: 0,
          color,
        }),
      })
      if (res.ok) {
        fetchBuildables()
        // Keep pending item selected so user can rapid-place
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Place failed — do you own this parcel?')
      }
    } catch (e: any) {
      alert(e?.message || 'Place failed')
    }
  }, [fetchBuildables])

  const deleteBuildable = useCallback(async (b: PlacedBuildable) => {
    try {
      const res = await fetch(`/api/nodeverse/buildables?id=${encodeURIComponent(b.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) fetchBuildables()
      else alert('Delete failed')
    } catch (e: any) {
      alert(e?.message || 'Delete failed')
    } finally {
      setDeleteCandidate(null)
    }
  }, [fetchBuildables])
  // Listen for character updates from designer
  useEffect(() => {
    const handler = (e: any) => setCharacter(e.detail)
    window.addEventListener('character-updated', handler)
    return () => window.removeEventListener('character-updated', handler)
  }, [])

  // On mount, if logged in, pull authoritative character from Mongo so
  // switching devices shows the same look. Guests (401) no-op and keep
  // whatever localStorage had. Remote wins when present.
  useEffect(() => {
    let cancelled = false
    loadRemoteCharacter().then(remote => {
      if (cancelled || !remote) return
      setCharacter(prev => ({ ...prev, ...remote }))
      try { saveCharacter({ ...remote }) } catch {}
    })
    return () => { cancelled = true }
  }, [])
  // Auto-hide info card after 8 seconds (user can re-open via i pill)
  useEffect(() => {
    if (!showInfo) return
    const t = setTimeout(() => setShowInfo(false), 8000)
    return () => clearTimeout(t)
  }, [showInfo])

  // Fetch residents to populate the grid
  useEffect(() => {
    fetch('/api/explore/users-merged?limit=50')
      .then(r => r.json())
      .then(data => {
        const source = data.nodes || data.users || []
        const users = source.slice(0, 30).map((u: any, i: number) => ({
          id: u.id || u._id,
          displayName: u.displayName || u.userHandle || 'Resident',
          userHandle: u.userHandle,
          profilePicture: u.profilePicture,
          nodeverseCharacter: u.nodeverseCharacter || null,
          // Spread residents in a circle pattern
          position: {
            x: Math.cos((i / 30) * Math.PI * 2) * (8 + (i % 3) * 4),
            z: Math.sin((i / 30) * Math.PI * 2) * (8 + (i % 3) * 4),
          },
        }))
        setResidents(users)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    // Guard against 0-dimension container (parent flex hasn't laid out yet)
    const w = container.clientWidth || window.innerWidth
    const h = container.clientHeight || window.innerHeight - 200

    // ─── Scene Setup ─────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0f1f)
    scene.fog = new THREE.Fog(0x0a0f1f, 50, 150)

    // Camera (third-person follow)
    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 200)
    camera.position.set(0, 4, 8)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // ─── Lighting (brightened — was too dark on mobile) ──────
    const ambient = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 1.2)
    dir.position.set(10, 20, 10)
    dir.castShadow = true
    scene.add(dir)
    // Cyan + purple atmosphere lights
    const cyanLight = new THREE.PointLight(0x22d3ee, 2, 50)
    cyanLight.position.set(-10, 10, 10)
    scene.add(cyanLight)
    const purpleLight = new THREE.PointLight(0xa855f7, 2, 50)
    purpleLight.position.set(10, 10, -10)
    scene.add(purpleLight)
    // Fill light from below for floor reflection
    const fillLight = new THREE.PointLight(0x4040ff, 1, 30)
    fillLight.position.set(0, 5, 0)
    scene.add(fillLight)

    // ─── Grid Floor (cyberpunk) ──────────────────────────────
    const gridHelper = new THREE.GridHelper(80, 40, 0x22d3ee, 0x2a5a7a)
    ;(gridHelper.material as THREE.Material).transparent = true
    ;(gridHelper.material as THREE.Material).opacity = 0.7
    scene.add(gridHelper)

    // Floor plane (catches shadows) — brighter, more reflective
    const floorGeo = new THREE.PlaneGeometry(100, 100)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a2540, metalness: 0.6, roughness: 0.3 })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    // ─── NODEVERSE PARCELS ─ Decentraland-style 16x16 land ──
    // Each PARCEL is 16 units. World grid: 50×50 = 2500 parcels.
    // You stand INSIDE a parcel — you don't buy tiles within it.
    // To buy a parcel, use the mini-map / Land Atlas (zoom out view).
    const PARCEL_SIZE = 16
    const landGroup = new THREE.Group()
    const ownedMap = new Map<string, any>()
    ownedSquares.forEach(sq => ownedMap.set(`${sq.x},${sq.z}`, sq))

    // Render parcels within ±48 units of origin (~6×6 visible parcels)
    const RENDER_PARCELS = 3 // 6×6 = 36 visible parcels
    for (let px = -RENDER_PARCELS; px <= RENDER_PARCELS; px++) {
      for (let pz = -RENDER_PARCELS; pz <= RENDER_PARCELS; pz++) {
        const dist = Math.sqrt(px * px + pz * pz)
        const owned = ownedMap.get(`${px},${pz}`)

        let parcelColor: number
        let edgeOpacity: number
        if (owned) {
          parcelColor = new THREE.Color(owned.ownerColor || '#22d3ee').getHex()
          edgeOpacity = 0.7
        } else if (dist <= 1) {
          parcelColor = 0xfacc15  // origin gold
          edgeOpacity = 0.4
        } else if (dist <= 3) {
          parcelColor = 0xa855f7  // inner purple
          edgeOpacity = 0.3
        } else {
          parcelColor = 0x22d3ee  // mid cyan
          edgeOpacity = 0.2
        }

        // PARCEL BOUNDARY — only borders, no fill (you walk inside parcels)
        const parcelEdgeMat = new THREE.LineBasicMaterial({ color: parcelColor, transparent: true, opacity: edgeOpacity })
        const points = [
          new THREE.Vector3(px * PARCEL_SIZE - PARCEL_SIZE / 2, 0.1, pz * PARCEL_SIZE - PARCEL_SIZE / 2),
          new THREE.Vector3(px * PARCEL_SIZE + PARCEL_SIZE / 2, 0.1, pz * PARCEL_SIZE - PARCEL_SIZE / 2),
          new THREE.Vector3(px * PARCEL_SIZE + PARCEL_SIZE / 2, 0.1, pz * PARCEL_SIZE + PARCEL_SIZE / 2),
          new THREE.Vector3(px * PARCEL_SIZE - PARCEL_SIZE / 2, 0.1, pz * PARCEL_SIZE + PARCEL_SIZE / 2),
          new THREE.Vector3(px * PARCEL_SIZE - PARCEL_SIZE / 2, 0.1, pz * PARCEL_SIZE - PARCEL_SIZE / 2),
        ]
        const parcelEdgeGeo = new THREE.BufferGeometry().setFromPoints(points)
        const parcelEdge = new THREE.Line(parcelEdgeGeo, parcelEdgeMat)
        landGroup.add(parcelEdge)

        // Owned parcels: subtle floor tint
        if (owned) {
          const fillGeo = new THREE.PlaneGeometry(PARCEL_SIZE * 0.95, PARCEL_SIZE * 0.95)
          const fillMat = new THREE.MeshBasicMaterial({ color: parcelColor, transparent: true, opacity: 0.08, side: THREE.DoubleSide })
          const fill = new THREE.Mesh(fillGeo, fillMat)
          fill.position.set(px * PARCEL_SIZE, 0.06, pz * PARCEL_SIZE)
          fill.rotation.x = -Math.PI / 2
          landGroup.add(fill)
        }
      }
    }
    scene.add(landGroup)

    // Origin marker (you spawn here)
    const originGeo = new THREE.RingGeometry(1, 1.2, 32)
    const originMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
    const origin = new THREE.Mesh(originGeo, originMat)
    origin.rotation.x = -Math.PI / 2
    origin.position.y = 0.01
    scene.add(origin)

    // ─── Player Avatar — Humanoid GLB or Agent Pill ──────────
    const playerGroup = new THREE.Group()
    // human (RPM) + opensource (CC0/MIT) + ai (TripoSR Phase 16.3) all load a GLB.
    // For type='ai' the URL lives on aiGlbUrl; the Save-as-Avatar flow also
    // copies it into humanGlbUrl so legacy paths keep working unchanged.
    const glbUrl =
      character.type === 'ai'
        ? (character as any).aiGlbUrl || character.humanGlbUrl
        : character.humanGlbUrl
    const isGlbAvatar = (character.type === 'human' || character.type === 'opensource' || character.type === 'ai') && glbUrl

    if (isGlbAvatar) {
      // GLB AVATAR — RPM, open-source CC0/MIT humanoid, or AI-generated TripoSR mesh
      const loader = new GLTFLoader()
      loader.load(
        glbUrl!,
        (gltf) => {
          const model = gltf.scene
          // Open-source models vary wildly in scale (Horse=0.015, Duck=0.5, Soldier=1.0).
          // Use humanScale if provided (from open-source library), else default to 1.
          const baseScale = character.humanScale ?? 1
          model.scale.setScalar(baseScale * character.height)
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
          console.error('[Explore3D] GLB load failed, falling back to pill:', err)
          // Fallback to capsule
          const fallbackMat = new THREE.MeshStandardMaterial({ color: character.bodyColor, emissive: character.glowColor, emissiveIntensity: character.glowIntensity })
          const fallback = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1, 4, 8), fallbackMat)
          fallback.position.y = 1
          fallback.castShadow = true
          playerGroup.add(fallback)
        }
      )
    } else {
      // AGENT — pill capsule + head (current design)
      const bodyColorObj = new THREE.Color(character.bodyColor)
      const glowColorObj = new THREE.Color(character.glowColor)
      const playerMat = new THREE.MeshStandardMaterial({
        color: bodyColorObj,
        emissive: glowColorObj,
        emissiveIntensity: character.glowIntensity,
        metalness: 0.5,
        roughness: 0.3,
      })

      const playerGeo = new THREE.CapsuleGeometry(0.4, 1 * character.height, 4, 8)
      const playerMesh = new THREE.Mesh(playerGeo, playerMat)
      playerMesh.position.y = 0.7 + (character.height - 1) * 0.5
      playerMesh.castShadow = true
      playerGroup.add(playerMesh)

      let headGeo: THREE.BufferGeometry
      switch (character.headShape) {
        case 'sphere': headGeo = new THREE.SphereGeometry(0.3, 24, 24); break
        case 'cube': headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5); break
        case 'cone': headGeo = new THREE.ConeGeometry(0.3, 0.6, 24); break
        case 'capsule':
        default: headGeo = new THREE.CapsuleGeometry(0.25, 0.2, 8, 16); break
      }
      const head = new THREE.Mesh(headGeo, buildHeadMaterial(character.face?.skinTone, character.bodyColor, character.glowColor, character.glowIntensity))
      head.position.y = 1.5 + (character.height - 1) * 1
      head.castShadow = true
      playerGroup.add(head)

      // Face features follow the player into the world
      playerGroup.add(buildFaceGroup(character.face, head.position.y))

      // Outfit — hat, sunglasses, hoodie, pants, shoes all render here
      playerGroup.add(buildOutfitGroup(character.outfit, character.outfitColors, computeAgentAnchors(character.height)))

      if (character.accessory !== 'none') {
        const accMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.1 })
        let accMesh: THREE.Mesh | null = null
        if (character.accessory === 'crown') {
          accMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.15, 8), accMat)
          accMesh.position.y = head.position.y + 0.35
        } else if (character.accessory === 'halo') {
          accMesh = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 16, 32), accMat)
          accMesh.position.y = head.position.y + 0.45
          accMesh.rotation.x = Math.PI / 2
        } else if (character.accessory === 'antenna') {
          accMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5), accMat)
          accMesh.position.y = head.position.y + 0.45
        } else if (character.accessory === 'visor') {
          accMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x22d3ee, emissiveIntensity: 0.3, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.85 }))
          accMesh.position.y = head.position.y + 0.05
          accMesh.position.z = 0.05
        }
        if (accMesh) playerGroup.add(accMesh)
      }
    }

    // Player name label (sprite) — works for both humans and agents
    const displayName = character.name || myHandle || 'YOU'
    const labelCanvas = document.createElement('canvas')
    labelCanvas.width = 256
    labelCanvas.height = 64
    const ctx = labelCanvas.getContext('2d')!
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(0, 0, 256, 64)
    ctx.fillStyle = isGlbAvatar ? '#a855f7' : character.bodyColor
    ctx.font = 'bold 28px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(displayName, 128, 42)
    const labelTex = new THREE.CanvasTexture(labelCanvas)
    const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex }))
    labelSprite.scale.set(2, 0.5, 1)
    labelSprite.position.y = isGlbAvatar ? 2.0 * character.height + 0.3 : 2.4 + (character.height - 1) * 1
    playerGroup.add(labelSprite)

    scene.add(playerGroup)

    // ─── Other Residents (placeholder capsules) ──────────────
    const residentMeshes: Array<{ group: THREE.Group; data: Resident }> = []
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    residents.forEach(r => {
      const group = new THREE.Group()

      // Full character: use resident's saved nodeverseCharacter if present,
      // else fall back to a deterministic capsule (stable color per user via id hash).
      const ch = r.nodeverseCharacter
      const bodyColor = ch?.bodyColor || (() => {
        // Deterministic color from user id so same user gets same fallback look
        let h = 0
        for (let i = 0; i < r.id.length; i++) h = (h * 31 + r.id.charCodeAt(i)) >>> 0
        return `hsl(${h % 360}, 70%, 55%)`
      })()
      const glowColor = ch?.glowColor || bodyColor
      const glowIntensity = ch?.glowIntensity ?? 0.3
      const height = ch?.height ?? 1.0
      const headShape = ch?.headShape || 'capsule'

      // Body capsule (scaled by height)
      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(bodyColor),
        emissive: new THREE.Color(glowColor),
        emissiveIntensity: glowIntensity * 0.4,
        metalness: 0.4,
        roughness: 0.5,
      })
      const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.9 * height, 4, 12)
      const body = new THREE.Mesh(bodyGeo, bodyMat)
      body.position.y = 0.8 + (height - 1) * 0.4
      body.castShadow = true
      ;(body as any).userData = { resident: r }
      group.add(body)

      // Head with optional skin tone
      let headGeo: THREE.BufferGeometry
      switch (headShape) {
        case 'sphere': headGeo = new THREE.SphereGeometry(0.28, 16, 16); break
        case 'cube': headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42); break
        case 'cone': headGeo = new THREE.ConeGeometry(0.28, 0.5, 12); break
        case 'capsule':
        default: headGeo = new THREE.CapsuleGeometry(0.25, 0.2, 8, 16); break
      }
      const head = new THREE.Mesh(headGeo, buildHeadMaterial(ch?.face?.skinTone, bodyColor, glowColor, glowIntensity))
      head.position.y = 1.5 + (height - 1) * 1
      head.castShadow = true
      ;(head as any).userData = { resident: r }
      group.add(head)

      // Face features (eyes, mouth, beard, paint) — identical to local player
      group.add(buildFaceGroup(ch?.face, head.position.y))

      // Outfit (hat, sunglasses, hoodie, pants, shoes)
      group.add(buildOutfitGroup(ch?.outfit, ch?.outfitColors, computeAgentAnchors(height)))

      // Accessory for parity with local player (crown/halo/antenna/visor)
      if (ch?.accessory && ch.accessory !== 'none') {
        const accMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.1 })
        let accMesh: THREE.Mesh | null = null
        const headTopY = head.position.y + 0.22
        switch (ch.accessory) {
          case 'crown': {
            accMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.12, 8, 1, true), accMat)
            accMesh.position.y = headTopY + 0.06
            break
          }
          case 'halo': {
            accMesh = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 24), accMat)
            accMesh.rotation.x = Math.PI / 2
            accMesh.position.y = headTopY + 0.12
            break
          }
          case 'antenna': {
            accMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 8), accMat)
            accMesh.position.y = headTopY + 0.17
            break
          }
          case 'visor': {
            accMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.04), accMat)
            accMesh.position.set(0, head.position.y + 0.04, 0.22)
            break
          }
        }
        if (accMesh) { accMesh.castShadow = true; group.add(accMesh) }
      }

      // Keep top-level ref for picking fallback
      ;(group as any).userData = { resident: r }

      // Label
      const lblCanvas = document.createElement('canvas')
      lblCanvas.width = 256; lblCanvas.height = 64
      const lctx = lblCanvas.getContext('2d')!
      lctx.fillStyle = 'rgba(0,0,0,0.7)'
      lctx.fillRect(0, 0, 256, 64)
      lctx.fillStyle = '#ffffff'
      lctx.font = 'bold 22px monospace'
      lctx.textAlign = 'center'
      lctx.fillText(r.displayName.slice(0, 18), 128, 38)
      const lblTex = new THREE.CanvasTexture(lblCanvas)
      const lblSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: lblTex }))
      lblSprite.scale.set(2, 0.5, 1)
      lblSprite.position.y = 2.2
      group.add(lblSprite)

      // Portal ring under each resident (tinted to body color)
      const ringGeo = new THREE.RingGeometry(0.7, 0.9, 32)
      const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(bodyColor), transparent: true, opacity: 0.4, side: THREE.DoubleSide })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.02
      group.add(ring)

      // GALLERY ARCHWAY — glowing torus behind resident
      const archwayMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xfacc15,
        emissiveIntensity: 0.6,
        metalness: 0.8,
        roughness: 0.2,
      })
      const archwayGeo = new THREE.TorusGeometry(1.4, 0.08, 12, 32, Math.PI)
      const archway = new THREE.Mesh(archwayGeo, archwayMat)
      archway.position.set(0, 1.4, -1.5)
      archway.rotation.z = 0
      ;(archway as any).userData = { resident: r, isGallery: true }
      group.add(archway)

      // "GALLERY" label sprite above archway
      const galleryLabelCanvas = document.createElement('canvas')
      galleryLabelCanvas.width = 256
      galleryLabelCanvas.height = 64
      const glctx = galleryLabelCanvas.getContext('2d')!
      glctx.fillStyle = 'rgba(0,0,0,0.8)'
      glctx.fillRect(0, 0, 256, 64)
      glctx.strokeStyle = '#facc15'
      glctx.lineWidth = 2
      glctx.strokeRect(2, 2, 252, 60)
      glctx.fillStyle = '#facc15'
      glctx.font = 'bold 22px monospace'
      glctx.textAlign = 'center'
      glctx.fillText('► GALLERY', 128, 38)
      const galleryLabelTex = new THREE.CanvasTexture(galleryLabelCanvas)
      const galleryLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: galleryLabelTex }))
      galleryLabel.scale.set(1.5, 0.4, 1)
      galleryLabel.position.set(0, 3, -1.5)
      ;(galleryLabel as any).userData = { resident: r, isGallery: true }
      group.add(galleryLabel)

      group.position.set(r.position?.x || 0, 0, r.position?.z || 0)
      scene.add(group)
      residentMeshes.push({ group, data: r })
    })

    // ─── PLACED BUILDABLES (Phase 2 — walls, floors, furniture, frames, vehicles) ──
    const PARCEL_SIZE_BUILD = 16
    const buildableMeshes: Array<{ group: THREE.Group; data: PlacedBuildable }> = []
    placedBuildables.forEach(pb => {
      const item = getBuildable(pb.buildableId)
      if (!item) return
      // Load texture asynchronously for frame buildables with bound assets
      let texture: THREE.Texture | null = null
      if (pb.boundAssetImageUrl && item.category === 'frame') {
        const loader = new THREE.TextureLoader()
        loader.setCrossOrigin('anonymous')
        texture = loader.load(pb.boundAssetImageUrl, undefined, undefined, () => { /* silent on fail */ })
      }
      const mesh = buildBuildableMesh(item, pb.color || undefined, pb.scale ?? 1, texture)
      mesh.position.set(
        pb.parcelX * PARCEL_SIZE_BUILD + pb.localX,
        pb.localY || 0,
        pb.parcelZ * PARCEL_SIZE_BUILD + pb.localZ,
      )
      mesh.rotation.y = pb.rotY || 0
      mesh.traverse((obj: any) => { obj.userData = { buildable: pb } })
      scene.add(mesh)
      buildableMeshes.push({ group: mesh, data: pb })
    })

    // ─── Movement (WASD + Arrow keys) ────────────────────────
    const keys: Record<string, boolean> = {}
    const onKeyDown = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true }
    const onKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // ─── Click resident to portal (shared by mouse + tap) ────
    // In edit mode: tap ground with pending item = place; tap existing buildable = select for delete/bind.
    const tryPortal = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)

      if (editModeRef.current) {
        // Check if user tapped an existing buildable (any parcel — select = open actions)
        const bHits = raycaster.intersectObjects(buildableMeshes.map(b => b.group), true)
        if (bHits.length > 0) {
          const hit: any = bHits[0].object
          let pb = hit.userData?.buildable as PlacedBuildable | undefined
          if (!pb && hit.parent) pb = hit.parent.userData?.buildable as PlacedBuildable | undefined
          if (pb) {
            const item = getBuildable(pb.buildableId)
            if (item?.category === 'frame') setBindFrameCandidate(pb)
            else setDeleteCandidate(pb)
            return
          }
        }
        // Place pending item on ground
        if (pendingRef.current) {
          const groundHits = raycaster.intersectObject(floor, false)
          if (groundHits.length > 0) {
            const p = groundHits[0].point
            placeBuildableAt(p.x, p.z)
          }
          return
        }
        // Edit mode with no pending item + no buildable hit → noop
        return
      }

      // Normal mode: portal into residents / galleries
      const residentHits = raycaster.intersectObjects(residentMeshes.map(rm => rm.group), true)
      if (residentHits.length > 0) {
        const hit = residentHits[0].object
        const data = (hit.userData?.resident || hit.parent?.children?.find((c: any) => c.userData?.resident)?.userData?.resident) as Resident | undefined
        const isGallery = hit.userData?.isGallery || hit.parent?.children?.find((c: any) => c.userData?.isGallery && c === hit)?.userData?.isGallery
        if (data?.userHandle || data?.id) {
          if (isGallery) {
            router.push(`/gallery3d?handle=${data.userHandle || data.id}`)
          } else {
            router.push(`/users/${data.userHandle || data.id}`)
          }
        }
        return
      }
      // Non-edit tap on buildable — frames open their asset, vehicles toggle mount.
      const bHits = raycaster.intersectObjects(buildableMeshes.map(b => b.group), true)
      if (bHits.length > 0) {
        const hit: any = bHits[0].object
        let pb = hit.userData?.buildable as PlacedBuildable | undefined
        if (!pb && hit.parent) pb = hit.parent.userData?.buildable as PlacedBuildable | undefined
        if (pb) {
          const item = getBuildable(pb.buildableId)
          if (item?.category === 'frame' && pb.boundAssetId) {
            // Audio in frame — SCID (always audio) or audio-type post. Click plays/pauses
            // in place instead of routing away. Second click on a different frame stops
            // the previous audio and starts the new one.
            if (pb.boundAssetAudioUrl && (pb.boundAssetType === 'scid' || pb.boundAssetType === 'post')) {
              const current = frameAudioRef.current
              if (current && current.buildableId === pb.id) {
                // Same frame — toggle
                if (current.el.paused) { current.el.play().catch(() => {}); setPlayingFrameId(pb.id) }
                else { current.el.pause(); setPlayingFrameId(null) }
              } else {
                if (current) { try { current.el.pause() } catch {} }
                const el = new Audio(pb.boundAssetAudioUrl)
                el.crossOrigin = 'anonymous'
                el.onended = () => { setPlayingFrameId(null); frameAudioRef.current = null }
                el.play().catch(() => {})
                frameAudioRef.current = { el, buildableId: pb.id }
                setPlayingFrameId(pb.id)
              }
            } else if (pb.boundAssetType === 'post') router.push(`/posts/${pb.boundAssetId}`)
            else if (pb.boundAssetType === 'scid') router.push(`/dex/track/${pb.boundAssetId}`)
            else if (pb.boundAssetType === 'nft') router.push(`/dex/nft/${pb.boundAssetId}`)
          } else if (item?.category === 'vehicle') {
            // Phase 4 — mount vehicle. Find the matching mesh by placement id,
            // teleport player onto it, then the animate loop locks the vehicle to the player.
            const entry = buildableMeshes.find(bm => bm.data.id === pb!.id)
            if (entry) {
              if (drivingRef.current?.data.id === pb.id) {
                drivingRef.current = null
                setDrivingVehicle(null)
              } else {
                playerGroup.position.set(entry.group.position.x, 0, entry.group.position.z)
                drivingRef.current = { group: entry.group, data: pb }
                setDrivingVehicle(pb)
              }
            }
          }
        }
      }
    }
    const onClick = (event: MouseEvent) => tryPortal(event.clientX, event.clientY)
    renderer.domElement.addEventListener('click', onClick)

    // ─── Touch joystick — drag anywhere to walk, tap to portal ─
    // Mobile Chrome has no keyboard, so canvas drag drives movement.
    // touchVec is consumed each frame in animate(); range -1..1.
    const touchVec = { x: 0, z: 0 }
    let touchStart: { x: number; y: number; t: number } | null = null
    const TAP_PX = 10        // drag distance below this = tap
    const TAP_MS = 250       // duration below this = tap
    const JOY_RADIUS = 60    // px drag for full-speed walk

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      touchStart = { x: t.clientX, y: t.clientY, t: performance.now() }
      touchVec.x = 0
      touchVec.z = 0
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!touchStart) return
      const t = e.touches[0]
      if (!t) return
      const dx = t.clientX - touchStart.x
      const dy = t.clientY - touchStart.y
      if (Math.hypot(dx, dy) > TAP_PX) {
        // Past tap threshold → joystick mode. Block page scroll.
        if (e.cancelable) e.preventDefault()
        touchVec.x = Math.max(-1, Math.min(1, dx / JOY_RADIUS))
        touchVec.z = Math.max(-1, Math.min(1, dy / JOY_RADIUS))
      }
    }
    const onTouchEnd = (e: TouchEvent) => {
      const start = touchStart
      touchStart = null
      touchVec.x = 0
      touchVec.z = 0
      if (!start) return
      const t = e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      const dt = performance.now() - start.t
      if (Math.hypot(dx, dy) < TAP_PX && dt < TAP_MS) {
        tryPortal(t.clientX, t.clientY)
      }
    }
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true })
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false })
    renderer.domElement.addEventListener('touchend', onTouchEnd)
    renderer.domElement.addEventListener('touchcancel', onTouchEnd)

    // Hover detection
    const onMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(residentMeshes.map(rm => rm.group), true)
      if (hits.length > 0) {
        const data = (hits[0].object.userData?.resident || hits[0].object.parent?.children?.find(c => (c as any).userData?.resident)?.userData?.resident) as Resident | undefined
        setHoveredResident(data || null)
        renderer.domElement.style.cursor = 'pointer'
      } else {
        setHoveredResident(null)
        renderer.domElement.style.cursor = 'grab'
      }
    }
    renderer.domElement.addEventListener('mousemove', onMouseMove)

    // ─── Resize ──────────────────────────────────────────────
    const onResize = () => {
      const cw = container.clientWidth || window.innerWidth
      const ch = container.clientHeight || window.innerHeight - 200
      camera.aspect = cw / ch
      camera.updateProjectionMatrix()
      renderer.setSize(cw, ch)
    }
    window.addEventListener('resize', onResize)
    // Re-fit after a tick to catch parent flex layout
    const fitTimer1 = setTimeout(onResize, 100)
    const fitTimer2 = setTimeout(onResize, 500)
    const fitTimer3 = setTimeout(onResize, 1500)

    // ─── Animation Loop ──────────────────────────────────────
    let lastFrame = performance.now()
    let frameCount = 0
    let fpsLastUpdate = lastFrame
    let rafId = 0
    const SPEED = 0.15
    const RUN_MULT = 2.2
    const GRAVITY = 22       // units/sec^2
    const JUMP_FORCE = 8.5   // initial upward velocity
    let vy = 0               // vertical velocity (jump physics)

    const animate = () => {
      rafId = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = (now - lastFrame) / 1000
      lastFrame = now
      frameCount++
      if (now - fpsLastUpdate > 1000) {
        const fps = Math.round((frameCount * 1000) / (now - fpsLastUpdate))
        setStats(s => ({
          ...s,
          fps,
          residents: residentMeshes.length,
          position: `x:${playerGroup.position.x.toFixed(1)} z:${playerGroup.position.z.toFixed(1)}`,
        }))
        // Also update mini-map player position (throttled to 1Hz)
        setPlayerPos({ x: playerGroup.position.x, z: playerGroup.position.z })
        frameCount = 0
        fpsLastUpdate = now
      }

      // Movement (keyboard + touch joystick)
      const forward = (keys['w'] || keys['arrowup']) ? 1 : 0
      const back = (keys['s'] || keys['arrowdown']) ? 1 : 0
      const left = (keys['a'] || keys['arrowleft']) ? 1 : 0
      const right = (keys['d'] || keys['arrowright']) ? 1 : 0
      // Sprint: Shift on desktop, mobile RUN button, or joystick at near-full extent
      const touchMag = Math.hypot(touchVec.x, touchVec.z)
      const isRunning = !!keys['shift'] || runRef.current || touchMag > 0.95
      // Phase 4 — if riding a vehicle, swap walk speed for the vehicle's driveSpeed (units/sec → per-frame).
      const driving = drivingRef.current
      const driveItem = driving ? getBuildable(driving.data.buildableId) : null
      const speed = driveItem?.driveSpeed
        ? (driveItem.driveSpeed / 60) * (isRunning ? 1.3 : 1)
        : SPEED * (isRunning ? RUN_MULT : 1)
      const dx = (right - left) + touchVec.x
      const dz = -(forward - back) + touchVec.z
      playerGroup.position.x += dx * speed
      playerGroup.position.z += dz * speed
      if (dx !== 0 || dz !== 0) {
        playerGroup.rotation.y = Math.atan2(dx, dz)
      }
      // Lock vehicle mesh to player so it rides along.
      if (driving) {
        driving.group.position.x = playerGroup.position.x
        driving.group.position.z = playerGroup.position.z
        driving.group.rotation.y = playerGroup.rotation.y
      }
      // Jump (Space / mobile JUMP button) — only when grounded
      const grounded = playerGroup.position.y <= 0.001 && vy <= 0
      if ((keys[' '] || jumpRef.current) && grounded) {
        vy = JUMP_FORCE
        jumpRef.current = false
      }
      vy -= GRAVITY * dt
      playerGroup.position.y += vy * dt
      if (playerGroup.position.y < 0) {
        playerGroup.position.y = 0
        vy = 0
      }

      // Camera follow (third-person)
      const camTarget = new THREE.Vector3(playerGroup.position.x, playerGroup.position.y + 4, playerGroup.position.z + 8)
      camera.position.lerp(camTarget, 0.1)
      camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1, playerGroup.position.z)

      // Pulse origin ring
      origin.scale.setScalar(1 + Math.sin(now * 0.003) * 0.1)

      // Rotate resident portal rings
      residentMeshes.forEach(rm => {
        const ring = rm.group.children[2] as THREE.Mesh
        if (ring) ring.rotation.z += 0.01
      })

      renderer.render(scene, camera)
    }
    animate()

    // ─── Cleanup ─────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(fitTimer1)
      clearTimeout(fitTimer2)
      clearTimeout(fitTimer3)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('click', onClick)
      renderer.domElement.removeEventListener('touchstart', onTouchStart)
      renderer.domElement.removeEventListener('touchmove', onTouchMove)
      renderer.domElement.removeEventListener('touchend', onTouchEnd)
      renderer.domElement.removeEventListener('touchcancel', onTouchEnd)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
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
  }, [residents, myHandle, router, character, ownedSquares, placedBuildables, placeBuildableAt])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" style={{ cursor: 'grab' }} />

      {/* HUD overlay */}
      <div className="absolute top-3 left-3 pointer-events-none space-y-1">
        <div className="px-2 py-1 rounded bg-black/60 backdrop-blur border border-cyan-500/30 text-[9px] font-mono text-cyan-400">
          PORTALNODES · {stats.residents} residents · {stats.fps} fps
        </div>
        <div className="px-2 py-1 rounded bg-black/60 backdrop-blur border border-white/10 text-[8px] font-mono text-gray-400">
          {stats.position}
        </div>
      </div>

      {/* (i) info pill — TOP right (was bottom — got cut off by mobile browser bar) */}
      <button
        onClick={() => setShowInfo(s => !s)}
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 backdrop-blur border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-500/10 transition flex items-center justify-center text-cyan-400 font-mono font-bold text-sm z-30"
        title="Show controls"
      >
        i
      </button>

      {/* Controls overlay — drops DOWN from (i) pill, always readable */}
      {showInfo && (
        <div className="absolute top-14 right-3 max-w-[280px] z-30">
          <div className="rounded-lg bg-black/90 backdrop-blur border border-cyan-500/30 p-3 shadow-2xl shadow-cyan-500/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider">CONTROLS</span>
              <button onClick={() => setShowInfo(false)} className="text-gray-500 hover:text-white text-xs">×</button>
            </div>
            <div className="space-y-1.5 text-[9px] font-mono text-gray-300">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-cyan-400">W A S D</span>
                <span className="text-gray-500">or</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-cyan-400">↑ ↓ ← →</span>
                <span>walk</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-cyan-400">SHIFT</span>
                <span>run</span>
                <span className="text-gray-500">·</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-cyan-400">SPACE</span>
                <span>jump</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-cyan-400 flex-shrink-0">DRAG</span>
                <span>(mobile) hold &amp; drag to walk · joystick to edge = run</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-cyan-400 flex-shrink-0">TAP</span>
                <span>resident → PORTAL into their grid</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-cyan-400 flex-shrink-0">HOVER</span>
                <span>shows resident name</span>
              </div>
              <div className="pt-1.5 mt-1.5 border-t border-cyan-500/20 text-[8px] text-cyan-500/60">
                INTERNODES on the INTERNETS · PORTALNODES at work
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {hoveredResident && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-12 pointer-events-none">
          <div className="px-3 py-1.5 rounded-lg bg-cyan-500/20 backdrop-blur border border-cyan-500/40 text-[10px] font-mono text-cyan-300">
            ► PORTAL TO {hoveredResident.displayName}
          </div>
        </div>
      )}

      {/* Land stats badge — top center */}
      {landStats && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="px-3 py-1 rounded bg-black/70 backdrop-blur border border-yellow-500/30 text-[9px] font-mono text-yellow-400 flex items-center gap-2">
            <MapPin className="w-3 h-3" /> NODEVERSE · {landStats.totalOwned.toLocaleString()}/250,000 parcels owned · {landStats.totalRevenue.toLocaleString()} OGUN circulated
          </div>
        </div>
      )}

      {/* Purchase modal — buy a land square */}
      {purchaseModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPurchaseModal(null)}>
          <div className="w-full max-w-md bg-[#0a0f1f] border border-yellow-500/30 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-500/20 bg-black/40">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-mono font-bold text-yellow-400">CLAIM NODEVERSE LAND</span>
              </div>
              <button onClick={() => setPurchaseModal(null)} className="p-1 hover:bg-white/10 rounded text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-center py-3">
                <div className="text-[10px] font-mono text-gray-500 mb-1">COORDINATES</div>
                <div className="text-2xl font-mono font-bold text-cyan-400">
                  ({purchaseModal.x}, {purchaseModal.z})
                </div>
                <div className="text-[9px] font-mono text-gray-600 mt-1">distance from origin: {Math.sqrt(purchaseModal.x ** 2 + purchaseModal.z ** 2).toFixed(1)} units</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded border border-white/5 bg-black/40">
                  <div className="text-[8px] font-mono text-gray-600 uppercase">Tier</div>
                  <div className={`text-sm font-mono font-bold ${purchaseModal.tier === 'origin' ? 'text-yellow-400' : purchaseModal.tier === 'inner' ? 'text-purple-400' : purchaseModal.tier === 'mid' ? 'text-cyan-400' : 'text-gray-400'}`}>
                    {purchaseModal.tier.toUpperCase()}
                  </div>
                </div>
                <div className="p-3 rounded border border-yellow-500/20 bg-yellow-500/5">
                  <div className="text-[8px] font-mono text-gray-600 uppercase">Price</div>
                  <div className="text-sm font-mono font-bold text-yellow-400 flex items-center gap-1">
                    <Coins className="w-3 h-3" /> {purchaseModal.price} OGUN
                  </div>
                </div>
              </div>
              <div className="text-[9px] font-mono text-gray-600 leading-relaxed pt-2 border-t border-white/5">
                Square is forever yours. Build a gallery, host events, rent to others.
                <br />
                Platform fee: <span className="text-yellow-500">{Math.ceil(purchaseModal.price * 0.0005)} OGUN (0.05%)</span> to SoundChain treasury.
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button onClick={() => setPurchaseModal(null)} className="flex-1 py-2 rounded text-[10px] font-mono text-gray-400 border border-white/10 hover:bg-white/5">
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setPurchasing(true)
                    try {
                      const res = await fetch('/api/nodeverse/squares', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          x: purchaseModal.x,
                          z: purchaseModal.z,
                          ownerHandle: myHandle || 'anon',
                          ownerColor: character.bodyColor,
                        }),
                      })
                      if (res.ok) {
                        setPurchaseModal(null)
                        fetchLand() // refresh owned squares
                      } else {
                        const err = await res.json()
                        alert(err.error || 'Purchase failed')
                      }
                    } finally { setPurchasing(false) }
                  }}
                  disabled={purchasing}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-[10px] font-mono font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 transition disabled:opacity-50"
                >
                  {purchasing ? 'CLAIMING...' : <><Lock className="w-3 h-3" /> CLAIM FOR {purchaseModal.price} OGUN</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BUILD MODE HUD — toggle button (mid-right) */}
      <button
        onClick={() => {
          setEditMode(v => {
            const next = !v
            if (!next) { setPendingBuildable(null); setPendingColor(null); setShowPalette(false) }
            else setShowPalette(true)
            return next
          })
        }}
        className={`absolute top-14 left-3 z-30 px-3 py-1.5 rounded font-mono text-[10px] font-bold border backdrop-blur transition flex items-center gap-1.5 ${
          editMode
            ? 'bg-orange-500/30 text-orange-300 border-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.5)]'
            : 'bg-black/60 text-purple-300 border-purple-500/40 hover:bg-purple-500/10'
        }`}
      >
        🔨 {editMode ? 'BUILDING' : 'BUILD'}
      </button>

      {/* PHASE 5 — game host / spectate button. Context-aware:
          - If a session exists at the player's current parcel → SPECTATE (pink pulse)
          - If it's your parcel and no session → HOST GAME
          - Otherwise → subtle tooltip ("walk onto a live parcel") */}
      {(() => {
        const curParcelX = Math.round(playerPos.x / 16)
        const curParcelZ = Math.round(playerPos.z / 16)
        const sessionHere = gameSessions.find(s => s.parcelX === curParcelX && s.parcelZ === curParcelZ) || null
        const parcelIsMine = ownedSquares.some(sq => sq.x === curParcelX && sq.z === curParcelZ && sq.ownerHandle === myHandle)
        const canInteract = !!sessionHere || parcelIsMine
        const liveCount = gameSessions.length
        return (
          <button
            onClick={() => setGameModalOpen(true)}
            disabled={!canInteract}
            title={sessionHere ? 'Spectate live session' : parcelIsMine ? 'Host a game session on your parcel' : 'Walk onto your parcel or a live parcel'}
            className={`absolute top-14 left-24 z-30 px-3 py-1.5 rounded font-mono text-[10px] font-bold border backdrop-blur transition flex items-center gap-1.5 ${
              sessionHere
                ? 'bg-pink-500/30 text-pink-200 border-pink-400 shadow-[0_0_16px_rgba(236,72,153,0.6)] animate-pulse'
                : parcelIsMine
                  ? 'bg-black/60 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/10'
                  : 'bg-black/40 text-neutral-500 border-neutral-700 opacity-60 cursor-not-allowed'
            }`}
          >
            📺 {sessionHere ? 'SPECTATE' : parcelIsMine ? 'HOST GAME' : `LIVE (${liveCount})`}
          </button>
        )
      })()}

      {/* BUILD MODE — pending selection indicator (above palette) */}
      {editMode && pendingBuildable && (
        <div className="absolute top-24 left-3 z-30 px-3 py-1.5 rounded bg-orange-500/20 backdrop-blur border border-orange-400/50 text-[10px] font-mono text-orange-300 flex items-center gap-2">
          <span className="text-base">{pendingBuildable.emoji}</span>
          <span>TAP GROUND → place {pendingBuildable.name}</span>
          <button onClick={() => setPendingBuildable(null)} className="ml-2 text-gray-400 hover:text-white">×</button>
        </div>
      )}

      {/* BUILD PALETTE — bottom sheet on mobile, side panel on desktop */}
      {editMode && showPalette && (
        <div className="absolute bottom-20 left-0 right-0 z-30 pointer-events-auto">
          <div className="mx-3 rounded-lg bg-black/90 backdrop-blur border border-purple-500/40 shadow-2xl overflow-hidden max-h-[50vh]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-purple-500/20 bg-black/40">
              <span className="text-[10px] font-mono font-bold text-purple-300 tracking-wider">🔨 BUILD PALETTE</span>
              <button onClick={() => setShowPalette(false)} className="text-gray-400 hover:text-white text-xs p-1">×</button>
            </div>
            {/* Category tabs */}
            <div className="flex gap-1 px-2 py-2 border-b border-white/5 overflow-x-auto">
              {BUILDABLE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setPaletteCategory(cat)}
                  className={`px-2.5 py-1 rounded text-[9px] font-mono uppercase whitespace-nowrap transition ${
                    paletteCategory === cat
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-400/50'
                      : 'bg-white/[0.03] text-gray-500 border border-white/5 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {/* Item grid */}
            <div className="p-2 grid grid-cols-4 sm:grid-cols-6 gap-1.5 overflow-y-auto max-h-[28vh]">
              {buildablesByCategory(paletteCategory).map(item => (
                <button
                  key={item.id}
                  onClick={() => { setPendingBuildable(item); setPendingColor(null) }}
                  className={`flex flex-col items-center gap-0.5 p-2 rounded border transition ${
                    pendingBuildable?.id === item.id
                      ? 'bg-orange-500/30 border-orange-400 text-orange-300 scale-105'
                      : 'bg-black/40 border-white/5 text-gray-400 hover:text-white hover:border-purple-500/30'
                  }`}
                  title={item.name}
                >
                  <span className="text-xl leading-none">{item.emoji}</span>
                  <span className="text-[8px] font-mono uppercase truncate max-w-full">{item.name}</span>
                </button>
              ))}
            </div>
            {/* Color picker for pending item */}
            {pendingBuildable && (
              <div className="px-2 py-2 border-t border-white/5 bg-black/30">
                <div className="text-[8px] font-mono text-gray-500 uppercase mb-1">Color · {pendingBuildable.name}</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[pendingBuildable.defaultColor, '#22d3ee', '#a855f7', '#ec4899', '#22c55e', '#facc15', '#ef4444', '#ffffff', '#000000'].map(c => (
                    <button
                      key={c}
                      onClick={() => setPendingColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition ${pendingColor === c ? 'border-white scale-110' : 'border-white/20 hover:border-white/40'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={pendingColor || pendingBuildable.defaultColor}
                    onChange={e => setPendingColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border border-white/10"
                  />
                  <button
                    onClick={() => setPendingColor(null)}
                    className="text-[8px] font-mono text-gray-400 hover:text-white px-2 py-0.5 rounded border border-white/10"
                  >
                    default
                  </button>
                </div>
              </div>
            )}
            <div className="px-3 py-1.5 border-t border-purple-500/20 bg-black/40 text-[8px] font-mono text-purple-400/60">
              💡 Tap the ground on your parcel to place. Tap any placed item to delete or bind.
            </div>
          </div>
        </div>
      )}

      {/* BUILD MODE — delete confirm dialog */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setDeleteCandidate(null)}>
          <div className="w-full max-w-sm bg-[#0a0f1f] border border-red-500/40 rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-red-500/20 bg-black/40">
              <span className="text-xs font-mono font-bold text-red-400">REMOVE FROM PARCEL</span>
              <button onClick={() => setDeleteCandidate(null)} className="p-1 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-center">
                <div className="text-3xl mb-2">{getBuildable(deleteCandidate.buildableId)?.emoji || '📦'}</div>
                <div className="text-sm font-mono text-white">{getBuildable(deleteCandidate.buildableId)?.name || deleteCandidate.buildableId}</div>
                <div className="text-[9px] font-mono text-gray-500 mt-1">parcel ({deleteCandidate.parcelX}, {deleteCandidate.parcelZ})</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setDeleteCandidate(null)} className="flex-1 py-2 rounded text-[10px] font-mono text-gray-400 border border-white/10 hover:bg-white/5">
                  Cancel
                </button>
                <button
                  onClick={() => deleteBuildable(deleteCandidate)}
                  className="flex-1 py-2 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Now-playing pill — visible whenever an audio frame is playing */}
      {playingFrameId && (() => {
        const pb = placedBuildables.find(b => b.id === playingFrameId)
        if (!pb) return null
        return (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-3 py-2 rounded-full bg-black/80 backdrop-blur border border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
            <span className="text-[10px] font-mono text-cyan-300 font-bold tracking-wide">▶ {pb.boundAssetTitle || 'Now playing'}</span>
            <button
              onClick={() => {
                if (frameAudioRef.current) { try { frameAudioRef.current.el.pause() } catch {} ; frameAudioRef.current = null }
                setPlayingFrameId(null)
              }}
              className="ml-1 p-0.5 rounded hover:bg-white/10 text-gray-400"
              title="Stop"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })()}

      {/* BUILD MODE — frame bind modal (pick NFT/SCID/post to mount) */}
      {bindFrameCandidate && (
        <FrameBindModal
          candidate={bindFrameCandidate}
          buildableCategory={getBuildable(bindFrameCandidate.buildableId)?.category || 'frame'}
          buildableKind={bindFrameCandidate.buildableId}
          onClose={() => setBindFrameCandidate(null)}
          onBound={fetchBuildables}
          onDelete={() => {
            const pb = bindFrameCandidate
            setBindFrameCandidate(null)
            setDeleteCandidate(pb)
          }}
        />
      )}

      {/* PHASE 5 — game host / spectate modal */}
      {gameModalOpen && (() => {
        const curParcelX = Math.round(playerPos.x / 16)
        const curParcelZ = Math.round(playerPos.z / 16)
        const sessionHere = gameSessions.find(s => s.parcelX === curParcelX && s.parcelZ === curParcelZ) || null
        const parcelIsMine = ownedSquares.some(sq => sq.x === curParcelX && sq.z === curParcelZ && sq.ownerHandle === myHandle)
        return (
          <GameHostModal
            parcelX={curParcelX}
            parcelZ={curParcelZ}
            isOwner={parcelIsMine}
            existingSession={sessionHere}
            myHandle={myHandle}
            onClose={() => setGameModalOpen(false)}
            onChanged={fetchGameSessions}
          />
        )
      })()}

      {/* PHASE 4 — vehicle HUD (exit button persists new parked position) */}
      {drivingVehicle && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-black/80 backdrop-blur border border-cyan-500/50 rounded-full px-4 py-2 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
          <span className="text-2xl">{getBuildable(drivingVehicle.buildableId)?.emoji || '🚗'}</span>
          <span className="text-xs font-mono text-cyan-300">RIDING {getBuildable(drivingVehicle.buildableId)?.name.toUpperCase()}</span>
          <button
            onClick={() => {
              const d = drivingRef.current
              drivingRef.current = null
              setDrivingVehicle(null)
              if (!d) return
              // Persist vehicle's new parked position relative to its original parcel.
              const PARCEL_SIZE = 16
              const newLocalX = d.group.position.x - d.data.parcelX * PARCEL_SIZE
              const newLocalZ = d.group.position.z - d.data.parcelZ * PARCEL_SIZE
              if (Math.abs(newLocalX) > 8.4 || Math.abs(newLocalZ) > 8.4) {
                // Drove off-parcel — snap mesh back to origin locally; server keeps original position.
                d.group.position.x = d.data.parcelX * PARCEL_SIZE + d.data.localX
                d.group.position.z = d.data.parcelZ * PARCEL_SIZE + d.data.localZ
                return
              }
              fetch('/api/nodeverse/buildables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  id: d.data.id,
                  buildableId: d.data.buildableId,
                  parcelX: d.data.parcelX,
                  parcelZ: d.data.parcelZ,
                  localX: newLocalX,
                  localY: 0,
                  localZ: newLocalZ,
                  rotY: d.group.rotation.y,
                  color: d.data.color || undefined,
                  scale: d.data.scale ?? 1,
                }),
              }).then(() => fetchBuildables()).catch(() => {})
            }}
            className="ml-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
          >
            EXIT
          </button>
        </div>
      )}

      {/* WORLD MAP — top-right mini-map showing whole Nodeverse */}
      <WorldMiniMap
        playerPos={playerPos}
        ownedSquares={ownedSquares}
        residents={residents}
        onClickFullMap={() => router.push('/land')}
      />

      {/* Mobile action buttons — RUN / JUMP / CUSTOMIZE (bottom right stack) */}
      <div className="absolute bottom-3 right-3 flex items-end gap-2 z-20">
        {/* RUN — hold to sprint */}
        <button
          onTouchStart={() => { runRef.current = true }}
          onTouchEnd={() => { runRef.current = false }}
          onTouchCancel={() => { runRef.current = false }}
          onMouseDown={() => { runRef.current = true }}
          onMouseUp={() => { runRef.current = false }}
          onMouseLeave={() => { runRef.current = false }}
          className="md:hidden w-14 h-14 rounded-full bg-cyan-500/20 backdrop-blur border border-cyan-500/40 active:bg-cyan-500/40 active:border-cyan-300 transition text-[10px] font-mono font-bold text-cyan-300 flex items-center justify-center select-none"
          style={{ touchAction: 'none' }}
          title="Hold to run"
        >
          RUN
        </button>
        {/* JUMP — tap to jump */}
        <button
          onTouchStart={(e) => { e.preventDefault(); jumpRef.current = true }}
          onClick={() => { jumpRef.current = true }}
          className="md:hidden w-14 h-14 rounded-full bg-yellow-500/20 backdrop-blur border border-yellow-500/40 active:bg-yellow-500/40 active:border-yellow-300 transition text-[10px] font-mono font-bold text-yellow-300 flex items-center justify-center select-none"
          style={{ touchAction: 'none' }}
          title="Jump"
        >
          JUMP
        </button>
        {/* CUSTOMIZE — desktop + mobile */}
        <button
          onClick={() => setShowDesigner(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/20 backdrop-blur border border-purple-500/40 hover:bg-purple-500/30 hover:border-purple-400 transition text-[10px] font-mono font-bold text-purple-300"
          title="Customize your character"
        >
          <User className="w-3.5 h-3.5" />
          CUSTOMIZE
        </button>
      </div>

      {/* Character Designer Modal */}
      <CharacterDesigner
        open={showDesigner}
        onClose={() => setShowDesigner(false)}
        initialName={myHandle}
      />
    </div>
  )
}

// ─── World Mini-Map ─────────────────────────────────────────
// Top-down 500×500 world view in bottom-left corner of Explore 3D.
// Shows tier rings, owned squares, residents, your player position.
function WorldMiniMap({
  playerPos,
  ownedSquares,
  residents,
  onClickFullMap,
}: {
  playerPos: { x: number; z: number }
  ownedSquares: Array<{ x: number; z: number; ownerColor?: string }>
  residents: Array<{ position?: { x: number; z: number } }>
  onClickFullMap: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [expanded, setExpanded] = useState(false)
  const SIZE = expanded ? 280 : 140

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = SIZE * window.devicePixelRatio
    canvas.height = SIZE * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.clearRect(0, 0, SIZE, SIZE)

    // Background — slight darker than scene
    ctx.fillStyle = 'rgba(5,8,20,0.85)'
    ctx.fillRect(0, 0, SIZE, SIZE)

    const cx = SIZE / 2
    const cy = SIZE / 2
    // World is 500×500 parcels (±250). Show with padding.
    const WORLD = 250
    const scale = SIZE / (WORLD * 2.1)

    // Tier zones — SQUARES (Decentraland/Sandbox style, not circles)
    // Outer (full world)
    ctx.fillStyle = 'rgba(102,102,102,0.05)'
    ctx.fillRect(cx - WORLD * scale, cy - WORLD * scale, WORLD * 2 * scale, WORLD * 2 * scale)
    ctx.strokeStyle = 'rgba(102,102,102,0.2)'
    ctx.lineWidth = 1
    ctx.strokeRect(cx - WORLD * scale, cy - WORLD * scale, WORLD * 2 * scale, WORLD * 2 * scale)

    // Mid (within 100)
    ctx.fillStyle = 'rgba(34,211,238,0.06)'
    ctx.fillRect(cx - 100 * scale, cy - 100 * scale, 200 * scale, 200 * scale)
    ctx.strokeStyle = 'rgba(34,211,238,0.3)'
    ctx.strokeRect(cx - 100 * scale, cy - 100 * scale, 200 * scale, 200 * scale)

    // Inner (within 30)
    ctx.fillStyle = 'rgba(168,85,247,0.10)'
    ctx.fillRect(cx - 30 * scale, cy - 30 * scale, 60 * scale, 60 * scale)
    ctx.strokeStyle = 'rgba(168,85,247,0.4)'
    ctx.strokeRect(cx - 30 * scale, cy - 30 * scale, 60 * scale, 60 * scale)

    // Origin (5×5 premium center)
    ctx.fillStyle = 'rgba(250,204,21,0.25)'
    ctx.fillRect(cx - 5 * scale, cy - 5 * scale, 10 * scale, 10 * scale)
    ctx.strokeStyle = 'rgba(250,204,21,0.6)'
    ctx.strokeRect(cx - 5 * scale, cy - 5 * scale, 10 * scale, 10 * scale)

    // Origin crosshair
    ctx.strokeStyle = 'rgba(34,211,238,0.6)'
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4); ctx.stroke()

    // Owned parcels (color squares)
    ownedSquares.forEach(sq => {
      ctx.fillStyle = sq.ownerColor || '#22d3ee'
      const ps = Math.max(2, scale)
      ctx.fillRect(cx + sq.x * scale - ps / 2, cy + sq.z * scale - ps / 2, ps, ps)
    })

    // Residents (small purple dots)
    residents.forEach(r => {
      if (!r.position) return
      ctx.fillStyle = 'rgba(168,85,247,0.8)'
      ctx.beginPath(); ctx.arc(cx + r.position.x * scale, cy + r.position.z * scale, 1.5, 0, Math.PI * 2); ctx.fill()
    })

    // YOUR PLAYER (cyan dot with pulse ring)
    const px = cx + playerPos.x * scale
    const py = cy + playerPos.z * scale
    // Pulse ring
    ctx.strokeStyle = '#22d3ee'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.stroke()
    // Center dot
    ctx.fillStyle = '#22d3ee'
    ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill()

    // Border
    ctx.strokeStyle = 'rgba(34,211,238,0.4)'
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, SIZE - 1, SIZE - 1)
  }, [playerPos, ownedSquares, residents, SIZE])

  return (
    <div className="absolute bottom-3 left-3 z-20" style={{ width: SIZE }}>
      <div className="rounded border border-cyan-500/30 bg-black/70 backdrop-blur overflow-hidden shadow-2xl shadow-cyan-500/10">
        {/* Header */}
        <div className="px-2 py-1 flex items-center justify-between border-b border-cyan-500/20">
          <span className="text-[8px] font-mono font-bold text-cyan-400 tracking-wider">WORLD MAP</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(e => !e)} className="text-[8px] font-mono text-gray-500 hover:text-cyan-400 px-1">
              {expanded ? '▾' : '▴'}
            </button>
            <button onClick={onClickFullMap} className="text-[8px] font-mono text-gray-500 hover:text-yellow-400 px-1" title="Open full atlas">
              ⊞
            </button>
          </div>
        </div>
        <canvas ref={canvasRef} style={{ width: SIZE, height: SIZE, display: 'block' }} />
        <div className="px-2 py-0.5 border-t border-cyan-500/10 flex items-center justify-between text-[7px] font-mono text-gray-600">
          <span>x:{playerPos.x.toFixed(0)} z:{playerPos.z.toFixed(0)}</span>
          <span className="text-cyan-500">500×500 · 250K parcels</span>
        </div>
      </div>
    </div>
  )
}
