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
import { CharacterDesigner, getStoredCharacter, type CharacterConfig } from './CharacterDesigner'

interface Resident {
  id: string
  displayName: string
  userHandle?: string
  profilePicture?: string
  position?: { x: number; z: number }
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
  // Listen for character updates from designer
  useEffect(() => {
    const handler = (e: any) => setCharacter(e.detail)
    window.addEventListener('character-updated', handler)
    return () => window.removeEventListener('character-updated', handler)
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
        const users = (data.users || []).slice(0, 30).map((u: any, i: number) => ({
          id: u.id || u._id,
          displayName: u.displayName || u.userHandle || 'Resident',
          userHandle: u.userHandle,
          profilePicture: u.profilePicture,
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

    // ─── NODEVERSE LAND ─ visible tier grid + owned glow ─────
    const landGroup = new THREE.Group()
    const ownedMap = new Map<string, any>()
    ownedSquares.forEach(sq => ownedMap.set(`${sq.x},${sq.z}`, sq))

    // Show tier colors for ALL squares within ±25 of player (performance — render only nearby)
    // Origin=gold, Inner=purple, Mid=cyan, Outer=gray-dim
    const RENDER_RADIUS = 25 // visible squares around origin (50×50 = 2500 tiles)
    for (let x = -RENDER_RADIUS; x <= RENDER_RADIUS; x++) {
      for (let z = -RENDER_RADIUS; z <= RENDER_RADIUS; z++) {
        const dist = Math.sqrt(x * x + z * z)
        const owned = ownedMap.get(`${x},${z}`)

        let tileColor: number
        let tileOpacity: number
        if (owned) {
          tileColor = new THREE.Color(owned.ownerColor || '#22d3ee').getHex()
          tileOpacity = 0.5
        } else if (dist <= 5) {
          tileColor = 0xfacc15  // origin gold
          tileOpacity = 0.18
        } else if (dist <= 20) {
          tileColor = 0xa855f7  // inner purple
          tileOpacity = 0.10
        } else if (dist <= 40) {
          tileColor = 0x22d3ee  // mid cyan
          tileOpacity = 0.06
        } else {
          tileColor = 0x666666  // outer dim
          tileOpacity = 0.04
        }

        const tileGeo = new THREE.PlaneGeometry(0.95, 0.95)
        const tileMat = new THREE.MeshBasicMaterial({
          color: tileColor,
          transparent: true,
          opacity: tileOpacity,
          side: THREE.DoubleSide,
        })
        const tile = new THREE.Mesh(tileGeo, tileMat)
        tile.position.set(x, 0.05, z)
        tile.rotation.x = -Math.PI / 2
        ;(tile as any).userData = owned ? { ownedSquare: owned } : { availableSquare: { x, z, tier: dist <= 5 ? 'origin' : dist <= 20 ? 'inner' : dist <= 40 ? 'mid' : 'outer', price: dist <= 5 ? 1000 : dist <= 20 ? 100 : dist <= 40 ? 25 : 5 } }
        landGroup.add(tile)
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
    const isHuman = character.type === 'human' && character.humanGlbUrl

    if (isHuman) {
      // HUMAN — load Ready Player Me GLB model
      const loader = new GLTFLoader()
      loader.load(
        character.humanGlbUrl!,
        (gltf) => {
          const model = gltf.scene
          // RPM avatars are full-size (~1.7m). Scale to fit our world (slightly bigger feel).
          model.scale.setScalar(1 * character.height)
          model.position.y = 0
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
      const head = new THREE.Mesh(headGeo, playerMat.clone())
      head.position.y = 1.5 + (character.height - 1) * 1
      head.castShadow = true
      playerGroup.add(head)

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
    ctx.fillStyle = isHuman ? '#a855f7' : character.bodyColor
    ctx.font = 'bold 28px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(displayName, 128, 42)
    const labelTex = new THREE.CanvasTexture(labelCanvas)
    const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex }))
    labelSprite.scale.set(2, 0.5, 1)
    labelSprite.position.y = isHuman ? 2.0 * character.height + 0.3 : 2.4 + (character.height - 1) * 1
    playerGroup.add(labelSprite)

    scene.add(playerGroup)

    // ─── Other Residents (placeholder capsules) ──────────────
    const residentMeshes: Array<{ group: THREE.Group; data: Resident }> = []
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    residents.forEach(r => {
      const group = new THREE.Group()
      const geo = new THREE.CapsuleGeometry(0.4, 1, 4, 8)
      const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, metalness: 0.4, roughness: 0.4 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.y = 1
      mesh.castShadow = true
      ;(mesh as any).userData = { resident: r }
      group.add(mesh)

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

      // Portal ring under each resident
      const ringGeo = new THREE.RingGeometry(0.7, 0.9, 32)
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
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

    // ─── Movement (WASD + Arrow keys) ────────────────────────
    const keys: Record<string, boolean> = {}
    const onKeyDown = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true }
    const onKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // ─── Mouse / Touch — click resident to portal ────────────
    const onClick = (event: MouseEvent | TouchEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      let clientX: number, clientY: number
      if ('touches' in event) {
        if (!event.touches[0]) return
        clientX = event.touches[0].clientX
        clientY = event.touches[0].clientY
      } else {
        clientX = event.clientX
        clientY = event.clientY
      }
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      // First: residents/galleries
      const residentHits = raycaster.intersectObjects(residentMeshes.map(rm => rm.group), true)
      if (residentHits.length > 0) {
        const hit = residentHits[0].object
        const data = (hit.userData?.resident || hit.parent?.children?.find((c: any) => c.userData?.resident)?.userData?.resident) as Resident | undefined
        const isGallery = hit.userData?.isGallery || hit.parent?.children?.find((c: any) => c.userData?.isGallery && c === hit)?.userData?.isGallery
        if (data?.userHandle || data?.id) {
          if (isGallery) {
            router.push(`/dex/gallery3d?handle=${data.userHandle || data.id}`)
          } else {
            router.push(`/dex/users/${data.userHandle || data.id}`)
          }
          return
        }
      }
      // Second: land tiles (visible grid)
      const landHits = raycaster.intersectObjects(landGroup.children, true)
      if (landHits.length > 0) {
        const tile = landHits[0].object
        const owned = tile.userData?.ownedSquare
        const available = tile.userData?.availableSquare
        if (owned) {
          alert(`OWNED by @${owned.ownerHandle}\nPrice paid: ${owned.price} OGUN\nTier: ${owned.tier}`)
          return
        }
        if (available) {
          setPurchaseModal(available)
          return
        }
      }
    }
    renderer.domElement.addEventListener('click', onClick)
    renderer.domElement.addEventListener('touchend', onClick as any)

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

      // Movement
      const forward = (keys['w'] || keys['arrowup']) ? 1 : 0
      const back = (keys['s'] || keys['arrowdown']) ? 1 : 0
      const left = (keys['a'] || keys['arrowleft']) ? 1 : 0
      const right = (keys['d'] || keys['arrowright']) ? 1 : 0
      playerGroup.position.z -= (forward - back) * SPEED
      playerGroup.position.x += (right - left) * SPEED
      // Rotate player to face direction
      if (forward || back || left || right) {
        const angle = Math.atan2(right - left, -(forward - back))
        playerGroup.rotation.y = angle
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
      renderer.domElement.removeEventListener('touchend', onClick as any)
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
  }, [residents, myHandle, router, character, ownedSquares])

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
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 backdrop-blur border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-500/10 transition flex items-center justify-center text-cyan-400 font-mono font-bold text-sm z-20"
        title="Show controls"
      >
        i
      </button>

      {/* Controls overlay — drops DOWN from (i) pill, always readable */}
      {showInfo && (
        <div className="absolute top-14 right-3 max-w-[280px] z-10">
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
              <div className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-cyan-400 flex-shrink-0">CLICK</span>
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
            <MapPin className="w-3 h-3" /> NODEVERSE LAND · {landStats.totalOwned}/10000 owned · {landStats.totalRevenue.toLocaleString()} OGUN circulated
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

      {/* WORLD MAP — top-right mini-map showing whole Nodeverse */}
      <WorldMiniMap
        playerPos={playerPos}
        ownedSquares={ownedSquares}
        residents={residents}
        onClickFullMap={() => router.push('/dex/land')}
      />

      {/* Customize Avatar button — bottom right (NBA 2K style) */}
      <button
        onClick={() => setShowDesigner(true)}
        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/20 backdrop-blur border border-purple-500/40 hover:bg-purple-500/30 hover:border-purple-400 transition text-[10px] font-mono font-bold text-purple-300 z-20"
        title="Customize your character"
      >
        <User className="w-3.5 h-3.5" />
        CUSTOMIZE
      </button>

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
// Top-down 100×100 world view in top-right corner of Explore 3D.
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
    const scale = SIZE / 110 // ±55 visible (slight padding past 50)

    // Tier rings (concentric circles)
    ctx.strokeStyle = 'rgba(250,204,21,0.4)' // origin (gold)
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(cx, cy, 5 * scale, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = 'rgba(168,85,247,0.3)' // inner (purple)
    ctx.beginPath(); ctx.arc(cx, cy, 20 * scale, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = 'rgba(34,211,238,0.25)' // mid (cyan)
    ctx.beginPath(); ctx.arc(cx, cy, 40 * scale, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = 'rgba(102,102,102,0.2)' // outer (gray)
    ctx.strokeRect(cx - 50 * scale, cy - 50 * scale, 100 * scale, 100 * scale)

    // Origin crosshair
    ctx.strokeStyle = 'rgba(34,211,238,0.5)'
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4); ctx.stroke()

    // Owned squares (color dots)
    ownedSquares.forEach(sq => {
      ctx.fillStyle = sq.ownerColor || '#22d3ee'
      ctx.fillRect(cx + sq.x * scale - 1, cy + sq.z * scale - 1, 2, 2)
    })

    // Residents (small purple dots)
    residents.forEach(r => {
      if (!r.position) return
      ctx.fillStyle = 'rgba(168,85,247,0.7)'
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
    <div className="absolute top-3 right-14 z-20" style={{ width: SIZE }}>
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
          <span className="text-cyan-500">100×100 world</span>
        </div>
      </div>
    </div>
  )
}
