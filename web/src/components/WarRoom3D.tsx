/**
 * WarRoom3D — Three.js isometric meeting room
 *
 * Renders a 3D conference room with:
 * - Round table in center
 * - Chairs around the table
 * - Simple block characters (Minecraft-style) seated
 * - Name tags floating above each character
 * - Green dot for online, ghost for offline
 * - Isometric camera (top-down 45 degrees)
 *
 * Uses Three.js (already in project via RadioScene4D).
 * Characters are simple box geometry with color-coded bodies.
 */

import React, { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'

interface Seat3D {
  id: string
  name: string
  role: string
  type: 'human' | 'agent'
  color: string
  online: boolean
  bubble?: string
}

interface WarRoom3DProps {
  seats: Seat3D[]
  width?: number
  height?: number
}

export function WarRoom3D({ seats, width = 700, height = 500 }: WarRoom3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!mountRef.current) return

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0f)
    scene.fog = new THREE.Fog(0x0a0a0f, 20, 40)
    sceneRef.current = scene

    // Camera — isometric-ish perspective
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 12, 10)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mountRef.current.innerHTML = ''
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lighting
    const ambient = new THREE.AmbientLight(0x334455, 0.6)
    scene.add(ambient)

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8)
    mainLight.position.set(5, 10, 5)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.set(1024, 1024)
    scene.add(mainLight)

    // Cyan accent light from below
    const accentLight = new THREE.PointLight(0x06b6d4, 0.4, 15)
    accentLight.position.set(0, -1, 0)
    scene.add(accentLight)

    // Purple accent from side
    const purpleLight = new THREE.PointLight(0xa855f7, 0.3, 15)
    purpleLight.position.set(-5, 3, -3)
    scene.add(purpleLight)

    // ─── FLOOR ────────────────────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(20, 20)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111118,
      roughness: 0.8,
      metalness: 0.2,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    // Grid lines on floor
    const gridHelper = new THREE.GridHelper(16, 16, 0x1a1a2e, 0x1a1a2e)
    gridHelper.position.y = 0.01
    scene.add(gridHelper)

    // ─── TABLE ────────────────────────────────────────────────
    // Table top (cylinder)
    const tableGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.15, 32)
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.4,
      metalness: 0.6,
    })
    const table = new THREE.Mesh(tableGeo, tableMat)
    table.position.y = 1.2
    table.castShadow = true
    table.receiveShadow = true
    scene.add(table)

    // Table leg
    const legGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 16)
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111122, metalness: 0.8, roughness: 0.3 })
    const leg = new THREE.Mesh(legGeo, legMat)
    leg.position.y = 0.6
    scene.add(leg)

    // Glowing ring on table edge
    const ringGeo = new THREE.TorusGeometry(2.5, 0.02, 8, 64)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.5 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 1.28
    scene.add(ring)

    // ─── CHARACTERS (seated around table) ──────────────────────
    const humans = seats.filter(s => s.type === 'human')
    const agents = seats.filter(s => s.type === 'agent')

    // Place humans closer to table, agents in outer ring
    const placeCharacter = (seat: Seat3D, angle: number, radius: number) => {
      const group = new THREE.Group()
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius

      const seatColor = new THREE.Color(seat.color)

      if (seat.online) {
        // ─── CHAIR ──────────────────────────────────────
        const chairSeatGeo = new THREE.BoxGeometry(0.5, 0.08, 0.5)
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.5, roughness: 0.5 })
        const chairSeat = new THREE.Mesh(chairSeatGeo, chairMat)
        chairSeat.position.set(x, 0.8, z)
        group.add(chairSeat)

        // Chair back
        const chairBackGeo = new THREE.BoxGeometry(0.5, 0.6, 0.08)
        const chairBack = new THREE.Mesh(chairBackGeo, chairMat)
        const backX = x - Math.cos(angle) * 0.25
        const backZ = z - Math.sin(angle) * 0.25
        chairBack.position.set(backX, 1.1, backZ)
        chairBack.lookAt(0, 1.1, 0)
        group.add(chairBack)

        // ─── BODY (box) ────────────────────────────────
        const bodyGeo = new THREE.BoxGeometry(0.4, 0.5, 0.3)
        const bodyMat = new THREE.MeshStandardMaterial({
          color: seatColor,
          roughness: 0.6,
          metalness: seat.type === 'agent' ? 0.8 : 0.2,
          transparent: seat.type === 'agent',
          opacity: seat.type === 'agent' ? 0.7 : 1.0,
        })
        const body = new THREE.Mesh(bodyGeo, bodyMat)
        body.position.set(x, 1.3, z)
        body.castShadow = true
        group.add(body)

        // ─── HEAD ──────────────────────────────────────
        const headGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3)
        const headColor = seat.type === 'agent' ? seatColor : new THREE.Color(0xddb89a)
        const headMat = new THREE.MeshStandardMaterial({
          color: headColor,
          roughness: 0.5,
          transparent: seat.type === 'agent',
          opacity: seat.type === 'agent' ? 0.8 : 1.0,
        })
        const head = new THREE.Mesh(headGeo, headMat)
        head.position.set(x, 1.75, z)
        head.castShadow = true
        group.add(head)

        // Agent glow ring
        if (seat.type === 'agent') {
          const glowGeo = new THREE.RingGeometry(0.35, 0.4, 16)
          const glowMat = new THREE.MeshBasicMaterial({
            color: seatColor,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
          })
          const glow = new THREE.Mesh(glowGeo, glowMat)
          glow.rotation.x = -Math.PI / 2
          glow.position.set(x, 0.02, z)
          group.add(glow)
        }

        // Online indicator (green sphere above head)
        const dotGeo = new THREE.SphereGeometry(0.06, 8, 8)
        const dotMat = new THREE.MeshBasicMaterial({ color: 0x22c55e })
        const dot = new THREE.Mesh(dotGeo, dotMat)
        dot.position.set(x + 0.2, 2.0, z)
        group.add(dot)

      } else {
        // Offline — ghost chair only, no character
        const ghostGeo = new THREE.BoxGeometry(0.5, 0.08, 0.5)
        const ghostMat = new THREE.MeshStandardMaterial({
          color: 0x222233,
          transparent: true,
          opacity: 0.2,
        })
        const ghost = new THREE.Mesh(ghostGeo, ghostMat)
        ghost.position.set(x, 0.8, z)
        group.add(ghost)
      }

      scene.add(group)
    }

    // Place humans (inner ring, radius 3.5)
    humans.forEach((seat, i) => {
      const angle = (i / humans.length) * Math.PI * 2 - Math.PI / 2
      placeCharacter(seat, angle, 3.5)
    })

    // Place agents (outer ring, radius 5.5)
    agents.forEach((seat, i) => {
      const angle = (i / agents.length) * Math.PI * 2
      placeCharacter(seat, angle, 5.5)
    })

    // ─── ANIMATION LOOP ───────────────────────────────────────
    let time = 0
    const animate = () => {
      time += 0.005

      // Slow camera orbit
      camera.position.x = Math.sin(time * 0.3) * 12
      camera.position.z = Math.cos(time * 0.3) * 10
      camera.position.y = 10 + Math.sin(time * 0.5) * 1
      camera.lookAt(0, 1, 0)

      // Pulse the cyan ring
      ring.material.opacity = 0.3 + Math.sin(time * 2) * 0.2

      // Pulse accent light
      accentLight.intensity = 0.3 + Math.sin(time * 3) * 0.15

      renderer.render(scene, camera)
      frameRef.current = requestAnimationFrame(animate)
    }
    animate()

    // Cleanup
    return () => {
      cancelAnimationFrame(frameRef.current)
      renderer.dispose()
      scene.clear()
    }
  }, [seats, width, height])

  return (
    <div
      ref={mountRef}
      className="rounded-xl overflow-hidden border border-cyan-500/10"
      style={{ width, height }}
    />
  )
}
