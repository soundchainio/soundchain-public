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

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useRouter } from 'next/router'

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

    // ─── Scene Setup ─────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x030308)
    scene.fog = new THREE.Fog(0x030308, 30, 100)

    // Camera (third-person follow)
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 200)
    camera.position.set(0, 4, 8)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // ─── Lighting ────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x4040ff, 0.4)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0x22d3ee, 0.8)
    dir.position.set(10, 20, 10)
    dir.castShadow = true
    scene.add(dir)
    const purpleLight = new THREE.PointLight(0xa855f7, 1, 30)
    purpleLight.position.set(0, 8, 0)
    scene.add(purpleLight)

    // ─── Grid Floor (cyberpunk) ──────────────────────────────
    const gridHelper = new THREE.GridHelper(80, 40, 0x22d3ee, 0x1a4a5a)
    ;(gridHelper.material as THREE.Material).transparent = true
    ;(gridHelper.material as THREE.Material).opacity = 0.4
    scene.add(gridHelper)

    // Floor plane (catches shadows)
    const floorGeo = new THREE.PlaneGeometry(80, 80)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x050510, metalness: 0.8, roughness: 0.4 })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    // Origin marker (you spawn here)
    const originGeo = new THREE.RingGeometry(1, 1.2, 32)
    const originMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
    const origin = new THREE.Mesh(originGeo, originMat)
    origin.rotation.x = -Math.PI / 2
    origin.position.y = 0.01
    scene.add(origin)

    // ─── Player Avatar (capsule placeholder) ─────────────────
    const playerGroup = new THREE.Group()
    const playerGeo = new THREE.CapsuleGeometry(0.4, 1, 4, 8)
    const playerMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.3, metalness: 0.5, roughness: 0.3 })
    const playerMesh = new THREE.Mesh(playerGeo, playerMat)
    playerMesh.position.y = 1
    playerMesh.castShadow = true
    playerGroup.add(playerMesh)

    // Player name label (sprite)
    const labelCanvas = document.createElement('canvas')
    labelCanvas.width = 256
    labelCanvas.height = 64
    const ctx = labelCanvas.getContext('2d')!
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(0, 0, 256, 64)
    ctx.fillStyle = '#22d3ee'
    ctx.font = 'bold 28px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(myHandle || 'YOU', 128, 42)
    const labelTex = new THREE.CanvasTexture(labelCanvas)
    const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex }))
    labelSprite.scale.set(2, 0.5, 1)
    labelSprite.position.y = 2.2
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
      const hits = raycaster.intersectObjects(residentMeshes.map(rm => rm.group), true)
      if (hits.length > 0) {
        const hit = hits[0].object
        const data = (hit.userData?.resident || hit.parent?.children?.find(c => (c as any).userData?.resident)?.userData?.resident) as Resident | undefined
        if (data?.userHandle || data?.id) {
          // PORTAL through to their personal grid
          router.push(`/dex/users/${data.userHandle || data.id}`)
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
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', onResize)

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
  }, [residents, myHandle, router])

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

      {/* Controls hint */}
      <div className="absolute bottom-3 left-3 pointer-events-none">
        <div className="px-2 py-1 rounded bg-black/60 backdrop-blur border border-white/10 text-[8px] font-mono text-gray-500">
          WASD / arrows to walk · click resident to portal in
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredResident && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-12 pointer-events-none">
          <div className="px-3 py-1.5 rounded-lg bg-cyan-500/20 backdrop-blur border border-cyan-500/40 text-[10px] font-mono text-cyan-300">
            ► PORTAL TO {hoveredResident.displayName}
          </div>
        </div>
      )}
    </div>
  )
}
