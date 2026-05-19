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
import { createPortal } from 'react-dom'
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
  theme?: 'modern' | 'cyberpunk' | 'vinyl' | 'vault' | 'city' | 'gym' | 'blacktop'
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
  // Phase 16.39 — SoundChain Shootaround. Two basketball-focused themes:
  // GYM = indoor open gym with wood floor, NBA-style markings, two hoops,
  //       bleachers, gym lights. Full-court basketball.
  // BLACKTOP = outdoor street court, asphalt + chain-link fence + graffiti,
  //            single hoop, urban vibe.
  gym:      { wall: 0xede2c8, floor: 0xc8a060, accent: 0xdc2626, ambient: 0xfff0e0, name: 'OPEN GYM' },
  blacktop: { wall: 0x1a1a1a, floor: 0x2a2a2a, accent: 0xfacc15, ambient: 0x6a5a4a, name: 'BLACKTOP' },
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
  // Phase 16.26 — city location state (street search result)
  const [cityLocation, setCityLocation] = useState<{ label: string; lat: number; lng: number } | null>(null)
  const cityLocationRef = useRef<{ label: string; lat: number; lng: number } | null>(null)
  // Scene ref so the cityLocation useEffect can paint the in-world sign
  // without rebuilding the whole 3D scene.
  const sceneRef = useRef<THREE.Scene | null>(null)
  // Phase 16.27 — basketball mechanic state
  const [hoopScore, setHoopScore] = useState({ makes: 0, attempts: 0, streak: 0 })
  const shootRef = useRef<(() => void) | null>(null)
  // Phase 16.29 — city search now opens as a full modal dialog so typing
  // isn't gated by any z-index / pointer-event conflicts with the canvas.
  const [citySearchOpen, setCitySearchOpen] = useState(false)
  const [citySearchValue, setCitySearchValue] = useState('')
  const [citySearchLoading, setCitySearchLoading] = useState(false)
  const citySearchInputRef = useRef<HTMLInputElement>(null)
  // Phase 16.32 — aggressive focus + iOS-keyboard-summon when modal opens
  useEffect(() => {
    if (!citySearchOpen) return
    // Restore body touchAction in case anything else set it to 'none' (e.g.
    // an earlier CharacterDesigner modal cleanup race). iOS Safari refuses
    // to show the keyboard when body has touchAction: none on it.
    const prevTouchAction = document.body.style.touchAction
    document.body.style.touchAction = 'auto'
    // Multiple focus attempts — first immediate, then after iOS finishes
    // the modal mount animation. autoFocus alone doesn't reliably open the
    // iOS soft keyboard for programmatically-opened modals.
    const tries = [10, 100, 300, 600].map((delay) =>
      setTimeout(() => {
        const el = citySearchInputRef.current
        if (el) {
          el.focus()
          // Trigger iOS keyboard via click on focused element
          try { el.click() } catch {}
        }
      }, delay),
    )
    return () => {
      tries.forEach(clearTimeout)
      document.body.style.touchAction = prevTouchAction
    }
  }, [citySearchOpen])
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

    // ─── Phase 16.39 — Basketball SFX synthesized via Web Audio API ──
    // Zero external files, no licensing, no bundle weight. Each sound is
    // an oscillator/noise burst shaped via envelope to match its role.
    // Lazy-init the AudioContext on first user gesture (Chrome autoplay
    // policy) — the SHOOT button or any keypress is enough.
    let audioCtx: AudioContext | null = null
    const ensureAudioCtx = (): AudioContext | null => {
      if (audioCtx) return audioCtx
      try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext
        if (!AC) return null
        audioCtx = new AC()
      } catch { audioCtx = null }
      return audioCtx
    }
    const playDribble = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(95, now)
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.08)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.22, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now); osc.stop(now + 0.1)
    }
    const playSwish = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return
      const now = ctx.currentTime
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.45), ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        const env = Math.pow(1 - i / data.length, 1.8)
        data[i] = (Math.random() * 2 - 1) * env
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buf
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = 2400
      filter.Q.value = 1.2
      const gain = ctx.createGain()
      gain.gain.value = 0.28
      noise.connect(filter).connect(gain).connect(ctx.destination)
      noise.start(now); noise.stop(now + 0.45)
    }
    const playRim = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(2200, now)
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.18)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now); osc.stop(now + 0.22)
    }
    const playBackboard = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.setValueAtTime(180, now)
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.14)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now); osc.stop(now + 0.18)
    }
    const playSqueak = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(1500 + Math.random() * 500, now)
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.1)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.07, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now); osc.stop(now + 0.13)
    }
    // Phase 16.44 — CROWD CHEER on shot makes. Layered noise burst shaped
    // like a roaring crowd: low rumble (sub 200Hz) + mid voice band (300-
    // 1200Hz) + high airy spray (3-5kHz) all under one envelope. ~1.2s
    // decay so it overlaps with the fan-jump animation.
    const playCheer = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return
      const now = ctx.currentTime
      const dur = 1.4
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        const t = i / data.length
        const env = Math.min(1, t * 8) * Math.pow(1 - t, 1.4)  // fast attack + decay
        data[i] = (Math.random() * 2 - 1) * env
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buf
      // Mid-band: voice formant
      const mid = ctx.createBiquadFilter()
      mid.type = 'bandpass'
      mid.frequency.value = 700
      mid.Q.value = 0.6
      const midGain = ctx.createGain()
      midGain.gain.value = 0.32
      // High: airy spray (whistles + scream tail)
      const hi = ctx.createBiquadFilter()
      hi.type = 'bandpass'
      hi.frequency.value = 3400
      hi.Q.value = 0.9
      const hiGain = ctx.createGain()
      hiGain.gain.value = 0.18
      // Low: rumble
      const lo = ctx.createBiquadFilter()
      lo.type = 'lowpass'
      lo.frequency.value = 180
      const loGain = ctx.createGain()
      loGain.gain.value = 0.22
      noise.connect(mid).connect(midGain).connect(ctx.destination)
      noise.connect(hi).connect(hiGain).connect(ctx.destination)
      noise.connect(lo).connect(loGain).connect(ctx.destination)
      noise.start(now); noise.stop(now + dur)
    }
    // Phase 16.44 — ambient CROWD MURMUR. Filtered pink-ish noise at very
    // low volume that loops while the gym scene is alive. Adds presence
    // without competing with shot SFX. Started on first user gesture.
    const startCrowdMurmur = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return null
      const dur = 8  // 8s looped buffer = no audible loop seam
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
      const data = buf.getChannelData(0)
      // Pink-noise approximation via Paul Kellett's filter
      let b0 = 0, b1 = 0, b2 = 0
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99765 * b0 + white * 0.0990460
        b1 = 0.96300 * b1 + white * 0.2965164
        b2 = 0.57000 * b2 + white * 1.0526913
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buf
      noise.loop = true
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 500
      bp.Q.value = 0.3
      const gain = ctx.createGain()
      gain.gain.value = 0.04  // VERY low — ambient bed only
      noise.connect(bp).connect(gain).connect(ctx.destination)
      noise.start()
      return { noise, gain }
    }

    // ─── Scene Setup ─────────────────────────────────────────
    const scene = new THREE.Scene()
    sceneRef.current = scene
    scene.background = new THREE.Color(themeCfg.floor).multiplyScalar(0.5)
    // City fog reaches MUCH farther for open-world feel; gallery rooms stay tight.
    scene.fog = theme === 'city'
      ? new THREE.Fog(0x1a0e08, 60, 220)
      : new THREE.Fog(themeCfg.floor, 30, 80)

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
    // Phase 16.25 — city theme gets a HUGE 200x200 asphalt floor (open world);
    // gallery themes keep the original 40x40 enclosed room floor.
    // Theme flags — hoisted so basketball + walls blocks can both use them
    const isOutdoor = theme === 'city' || theme === 'blacktop'
    const isGymCourt = theme === 'gym'
    const isBlacktopCourt = theme === 'blacktop'
    const isBasketballGallery = isGymCourt || isBlacktopCourt
    const floorSize = theme === 'city' ? 200 : (theme === 'gym' ? 60 : theme === 'blacktop' ? 50 : 40)
    const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize)
    let floorMat: THREE.MeshStandardMaterial
    if (theme === 'city') {
      floorMat = new THREE.MeshStandardMaterial({ color: themeCfg.floor, metalness: 0.05, roughness: 0.95 })
    } else if (theme === 'gym') {
      // Wood floor with plank grain via canvas texture
      const woodCanvas = document.createElement('canvas')
      woodCanvas.width = 512; woodCanvas.height = 512
      const wctx = woodCanvas.getContext('2d')!
      wctx.fillStyle = '#c8a060'; wctx.fillRect(0, 0, 512, 512)
      // Plank lines
      wctx.strokeStyle = '#8a6a3a'; wctx.lineWidth = 1
      for (let y = 0; y < 512; y += 32) {
        wctx.beginPath(); wctx.moveTo(0, y); wctx.lineTo(512, y); wctx.stroke()
      }
      // Grain variation
      for (let i = 0; i < 200; i++) {
        wctx.fillStyle = `rgba(120,80,40,${0.05 + Math.random() * 0.15})`
        wctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 80, 2)
      }
      const woodTex = new THREE.CanvasTexture(woodCanvas)
      woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping
      woodTex.repeat.set(6, 6)
      floorMat = new THREE.MeshStandardMaterial({ map: woodTex, metalness: 0.1, roughness: 0.6 })
    } else if (theme === 'blacktop') {
      floorMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, metalness: 0.02, roughness: 0.95 })
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
    if (isBasketballGallery) {
      // Phase 16.39 — SoundChain Shootaround basketball court setup.
      // Both gym (indoor) and blacktop (outdoor) get a real NBA-style court.
      // gym = full-court with 2 hoops + bleachers
      // blacktop = half-court with 1 hoop + chain-link fence
      const courtZ = 0           // center of court
      const courtSpan = isGymCourt ? 28 : 14   // full court vs half-court
      const courtWidth = 15

      // Court boundary paint
      const courtMat = new THREE.MeshStandardMaterial({
        color: isGymCourt ? 0xb8893c : 0x3a3f44,
        roughness: 0.5,
        metalness: 0.1,
      })
      const court = new THREE.Mesh(new THREE.PlaneGeometry(courtWidth, courtSpan), courtMat)
      court.rotation.x = -Math.PI / 2
      court.position.set(0, 0.02, courtZ)
      court.receiveShadow = true
      scene.add(court)
      // White boundary
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
      const mkLine = (w: number, h: number, x: number, z: number) => {
        const ln = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat)
        ln.rotation.x = -Math.PI / 2
        ln.position.set(x, 0.03, z)
        scene.add(ln)
      }
      mkLine(courtWidth, 0.1, 0, courtZ - courtSpan / 2)  // baseline
      mkLine(courtWidth, 0.1, 0, courtZ + courtSpan / 2)  // baseline
      mkLine(0.1, courtSpan, -courtWidth / 2, courtZ)     // sideline L
      mkLine(0.1, courtSpan, courtWidth / 2, courtZ)      // sideline R
      // Build hoops + key paint per court type
      const hoopPositions: Array<{ z: number; flip: boolean }> = []
      if (isGymCourt) {
        // Full court: half-court line + 2 keys + 2 hoops
        mkLine(courtWidth, 0.1, 0, courtZ)  // half-court line
        const center = new THREE.Mesh(new THREE.RingGeometry(1.7, 1.8, 32), lineMat)
        center.rotation.x = -Math.PI / 2
        center.position.set(0, 0.03, courtZ)
        scene.add(center)
        hoopPositions.push({ z: courtZ - courtSpan / 2 + 1.5, flip: false })
        hoopPositions.push({ z: courtZ + courtSpan / 2 - 1.5, flip: true })
      } else {
        hoopPositions.push({ z: courtZ - courtSpan / 2 + 1.5, flip: false })
      }

      const hoopList: Array<{ rimPos: THREE.Vector3 }> = []
      hoopPositions.forEach(({ z, flip }) => {
        const dir = flip ? -1 : 1
        const baseZ = z
        // Free-throw line + key
        mkLine(4, 0.1, 0, baseZ + 5.5 * dir)
        const keyPaint = new THREE.Mesh(
          new THREE.PlaneGeometry(4, 5),
          new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.4 }),
        )
        keyPaint.rotation.x = -Math.PI / 2
        keyPaint.position.set(0, 0.025, baseZ + 2.8 * dir)
        scene.add(keyPaint)
        // Three-point line — basket-centered arc + corner-3 straight segments
        // NBA: 23.75ft (7.24m) radius from basket center. In our 15u-wide
        // court scale, ~6.5u radius keeps the arc inside the sidelines, and
        // corner-3 lines run straight from baseline to where the arc begins
        // (mirrors how NBA courts handle the sideline cutoff).
        const arc3R = 6.5
        const basketZ = baseZ - 0.3 * dir
        // Corner-3 straight lines (parallel to sideline, at x = ±arc3R)
        const corner3StartZ = baseZ - 1.5 * dir  // at baseline
        const corner3EndZ = basketZ              // where arc starts
        const corner3MidZ = (corner3StartZ + corner3EndZ) / 2
        const corner3Len = Math.abs(corner3EndZ - corner3StartZ)
        for (const xSign of [-1, 1]) {
          const corner3Line = new THREE.Mesh(
            new THREE.PlaneGeometry(0.1, corner3Len),
            lineMat,
          )
          corner3Line.rotation.x = -Math.PI / 2
          corner3Line.position.set(xSign * arc3R, 0.03, corner3MidZ)
          scene.add(corner3Line)
        }
        // Arc — dashed segments from one corner-3 end around to the other
        for (let a = -Math.PI / 2 + 0.05; a <= Math.PI / 2 - 0.05; a += 0.05) {
          const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.08), lineMat)
          seg.rotation.x = -Math.PI / 2
          seg.rotation.z = a + Math.PI / 2
          seg.position.set(Math.sin(a) * arc3R, 0.03, basketZ + Math.cos(a) * arc3R * dir)
          scene.add(seg)
        }
        // Hoop pole + backboard + rim
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.15, 4, 12),
          new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.4 }),
        )
        pole.position.set(0, 2, baseZ - 0.8 * dir)
        pole.castShadow = true
        scene.add(pole)
        const backboard = new THREE.Mesh(
          new THREE.BoxGeometry(2, 1.3, 0.1),
          new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 }),
        )
        backboard.position.set(0, 3.8, baseZ - 0.7 * dir)
        backboard.castShadow = true
        scene.add(backboard)
        const sqOutline = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.6, 0.45)),
          new THREE.LineBasicMaterial({ color: 0xdc2626 }),
        )
        sqOutline.position.set(0, 3.7, baseZ - 0.65 * dir)
        scene.add(sqOutline)
        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(0.35, 0.04, 8, 24),
          new THREE.MeshStandardMaterial({ color: 0xea580c, emissive: 0xea580c, emissiveIntensity: 0.2, metalness: 0.7, roughness: 0.3 }),
        )
        const rimPos = new THREE.Vector3(0, 3.3, baseZ - 0.3 * dir)
        rim.position.copy(rimPos)
        rim.rotation.x = Math.PI / 2
        rim.castShadow = true
        scene.add(rim)
        hoopList.push({ rimPos })
        // Net (12 segments)
        const netMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
        for (let ni = 0; ni < 12; ni++) {
          const a = (ni / 12) * Math.PI * 2
          const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.35, 4), netMat)
          seg.position.set(Math.cos(a) * 0.32, 3.13, rimPos.z + Math.sin(a) * 0.32)
          scene.add(seg)
        }
      })
      // Store ALL hoop positions in scene.userData so basketball mechanic
      // can target the NEAREST one (full court has 2 hoops).
      ;(scene.userData as any).hoops = hoopList

      // Blacktop-specific: chain-link fence around court
      if (isBlacktopCourt) {
        const fenceMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.6, roughness: 0.5, transparent: true, opacity: 0.55, wireframe: true })
        const fenceH = 4.5
        const fenceGeo = new THREE.PlaneGeometry(courtWidth + 2, fenceH, 24, 6)
        ;[{ z: courtZ + courtSpan / 2 + 1, rot: 0 }, { z: courtZ - courtSpan / 2 - 1, rot: 0 }].forEach(({ z, rot }) => {
          const fence = new THREE.Mesh(fenceGeo, fenceMat)
          fence.position.set(0, fenceH / 2, z)
          fence.rotation.y = rot
          scene.add(fence)
        })
        ;[-courtWidth / 2 - 1, courtWidth / 2 + 1].forEach((x) => {
          const sideFenceGeo = new THREE.PlaneGeometry(courtSpan + 2, fenceH, 24, 6)
          const fence = new THREE.Mesh(sideFenceGeo, fenceMat)
          fence.position.set(x, fenceH / 2, courtZ)
          fence.rotation.y = Math.PI / 2
          scene.add(fence)
        })
        // Streetlight
        const lampPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x222222 }),
        )
        lampPole.position.set(courtWidth / 2 + 2, 4, courtZ - 3)
        scene.add(lampPole)
        const lampBulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0xfff7c2, emissive: 0xfff7c2, emissiveIntensity: 0.8 }),
        )
        lampBulb.position.set(courtWidth / 2 + 1.5, 7.5, courtZ - 3)
        scene.add(lampBulb)
        const courtLight = new THREE.PointLight(0xfff7c2, 1.2, 30)
        courtLight.position.copy(lampBulb.position)
        scene.add(courtLight)
      }

      // Gym-specific: bleachers along both long sides
      if (isGymCourt) {
        const bleacherMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.7 })
        ;[-courtWidth / 2 - 3, courtWidth / 2 + 3].forEach((x) => {
          for (let row = 0; row < 4; row++) {
            const bench = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, courtSpan), bleacherMat)
            bench.position.set(x + (x > 0 ? row * 1.5 : -row * 1.5), 0.4 + row * 0.7, 0)
            bench.castShadow = true
            scene.add(bench)
          }
        })

        // Phase 16.44 — FANS IN THE STANDS. InstancedMesh for torso + head
        // gives 2 draw calls for ALL fans no matter how many. Each fan has
        // its own random shirt color (10 jersey palette), idle bounce phase
        // offset, and excited-until timer. Cheer trigger (called from
        // playSwish hook on every make) sets every fan to excited mode for
        // 1.5-2.5s — instances jump up + slight rotation. Idle fans sway
        // gently in their seats. Crowd murmur ambient loop starts on first
        // user gesture.
        const FAN_PALETTE = [
          0xdc2626, 0xea580c, 0xf59e0b, 0xeab308,  // arena-red/orange/amber
          0x16a34a, 0x059669, 0x0891b2, 0x0284c7,  // green/teal/cyan/blue
          0x7c3aed, 0xa21caf, 0xdb2777, 0xe11d48,  // purple/fuchsia/pink/rose
        ]
        const ROWS = 4
        const PER_BENCH = 14
        const FAN_COUNT = ROWS * PER_BENCH * 2
        const torsoMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.05 })
        const headMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.8 })
        const torsoMesh = new THREE.InstancedMesh(
          new THREE.BoxGeometry(0.42, 0.58, 0.3), torsoMat, FAN_COUNT,
        )
        const headMesh = new THREE.InstancedMesh(
          new THREE.SphereGeometry(0.14, 8, 6), headMat, FAN_COUNT,
        )
        torsoMesh.castShadow = true
        headMesh.castShadow = true
        type FanState = {
          baseX: number; baseY: number; baseZ: number
          phase: number; armsUp: boolean
          excitedUntil: number; jumpY: number; tilt: number
        }
        const fanArray: FanState[] = []
        const fanMtx = new THREE.Matrix4()
        const fanQuat = new THREE.Quaternion()
        const fanPos = new THREE.Vector3()
        const fanScale = new THREE.Vector3(1, 1, 1)
        const tmpColor = new THREE.Color()
        let fanIdx = 0
        ;[-1, 1].forEach((sideSign) => {
          const sideBaseX = sideSign * (courtWidth / 2 + 3)
          for (let row = 0; row < ROWS; row++) {
            const seatX = sideBaseX + sideSign * row * 1.5
            const seatY = 0.4 + row * 0.7 + 0.55  // bench top + half torso
            for (let s = 0; s < PER_BENCH; s++) {
              const seatZ = -courtSpan / 2 + 1 + s * (courtSpan - 2) / (PER_BENCH - 1)
              const armsUp = Math.random() < 0.18  // 18% have arms up at all times
              fanArray.push({
                baseX: seatX, baseY: seatY, baseZ: seatZ,
                phase: Math.random() * Math.PI * 2,
                armsUp,
                excitedUntil: 0, jumpY: 0, tilt: 0,
              })
              fanPos.set(seatX, seatY, seatZ)
              fanQuat.identity()
              fanMtx.compose(fanPos, fanQuat, fanScale)
              torsoMesh.setMatrixAt(fanIdx, fanMtx)
              fanPos.set(seatX, seatY + 0.45, seatZ)
              fanMtx.compose(fanPos, fanQuat, fanScale)
              headMesh.setMatrixAt(fanIdx, fanMtx)
              tmpColor.set(FAN_PALETTE[Math.floor(Math.random() * FAN_PALETTE.length)])
              torsoMesh.setColorAt(fanIdx, tmpColor)
              fanIdx++
            }
          }
        })
        torsoMesh.instanceMatrix.needsUpdate = true
        if (torsoMesh.instanceColor) torsoMesh.instanceColor.needsUpdate = true
        headMesh.instanceMatrix.needsUpdate = true
        scene.add(torsoMesh, headMesh)
        ;(scene.userData as any).crowd = {
          fanArray, torsoMesh, headMesh,
          fanMtx, fanQuat, fanPos, fanScale,
          axisX: new THREE.Vector3(1, 0, 0),
          cheer: () => {
            const t = performance.now()
            for (const f of fanArray) {
              f.excitedUntil = t + 1500 + Math.random() * 900
            }
            playCheer()
          },
        }
        // Ambient crowd murmur — starts on first user gesture (audio ctx
        // policy). Cached on userData so we don't double-start.
        const tryStartMurmur = () => {
          if ((scene.userData as any).crowdMurmurStarted) return
          const handle = startCrowdMurmur()
          if (handle) (scene.userData as any).crowdMurmurStarted = true
        }
        window.addEventListener('pointerdown', tryStartMurmur, { once: true })
        window.addEventListener('keydown', tryStartMurmur, { once: true })
        // Gym overhead lights (4 panels of fluorescent)
        for (let lx = -8; lx <= 8; lx += 8) {
          for (let lz = -8; lz <= 8; lz += 8) {
            const panel = new THREE.Mesh(
              new THREE.BoxGeometry(3, 0.1, 1),
              new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff8e0, emissiveIntensity: 0.9 }),
            )
            panel.position.set(lx, 21.5, lz)
            scene.add(panel)
            const gymLight = new THREE.PointLight(0xfff8e0, 1.5, 40)
            gymLight.position.set(lx, 19, lz)
            scene.add(gymLight)
          }
        }
        // Scoreboard above mid-court
        const scoreCanvas = document.createElement('canvas')
        scoreCanvas.width = 512; scoreCanvas.height = 128
        const scx = scoreCanvas.getContext('2d')!
        scx.fillStyle = '#0a0a0a'; scx.fillRect(0, 0, 512, 128)
        scx.strokeStyle = '#dc2626'; scx.lineWidth = 6; scx.strokeRect(8, 8, 496, 112)
        scx.fillStyle = '#dc2626'; scx.font = 'bold 60px monospace'; scx.textAlign = 'center'
        scx.fillText('🏀 OPEN GYM', 256, 80)
        const scoreTex = new THREE.CanvasTexture(scoreCanvas)
        const scoreboard = new THREE.Mesh(
          new THREE.PlaneGeometry(8, 2),
          new THREE.MeshStandardMaterial({ map: scoreTex, emissive: 0xdc2626, emissiveIntensity: 0.3, emissiveMap: scoreTex }),
        )
        scoreboard.position.set(0, 18, 0)
        scoreboard.rotation.y = Math.PI
        scene.add(scoreboard)
      }

      // Phase 16.39 — Basketball ball + NBA2K-style jump shot for gym + blacktop.
      // Mirrors the city basketball mechanic at line ~631 but routes every shot
      // through findNearestHoop() so full-court gym (2 hoops) auto-targets the
      // closest one based on player position. Scoring checks ALL hoops on the
      // floor so dunks/threes at either end count.
      const ballMatBG = new THREE.MeshStandardMaterial({
        color: 0xea580c, emissive: 0xea580c, emissiveIntensity: 0.1, roughness: 0.6, metalness: 0.05,
      })
      const ballBG = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), ballMatBG)
      ballBG.castShadow = true
      ballBG.position.set(0, 1.4, 0)
      scene.add(ballBG)
      const lastTargetBG = new THREE.Vector3()
      if (hoopList[0]) lastTargetBG.copy(hoopList[0].rimPos)
      const ballStateBG = {
        held: true,
        vel: new THREE.Vector3(),
        scoredThisShot: false,
        airborneFrames: 0,
        returnTimer: 0,
      }
      ;(scene.userData as any).ball = { ball: ballBG, ballState: ballStateBG, RIM_POS: lastTargetBG }

      const jumpStateBG = { active: false, t: 0, duration: 0, peakY: 0, ballRelease: 0, isDunk: false, baseY: 0 }
      ;(scene.userData as any).jumpState = jumpStateBG

      const findNearestHoop = (pos: THREE.Vector3): THREE.Vector3 => {
        if (hoopList.length === 0) return new THREE.Vector3(0, 3.3, 0)
        let nearest = hoopList[0].rimPos
        let minDist = pos.distanceTo(nearest)
        for (let i = 1; i < hoopList.length; i++) {
          const d = pos.distanceTo(hoopList[i].rimPos)
          if (d < minDist) { minDist = d; nearest = hoopList[i].rimPos }
        }
        return nearest
      }

      shootRef.current = () => {
        if (!ballStateBG.held || jumpStateBG.active) return
        const playerGroup = (scene.userData as any).playerGroupRef
        if (!playerGroup) return
        const start = ballBG.position.clone()
        const target = findNearestHoop(playerGroup.position).clone()
        lastTargetBG.copy(target)
        const dx = target.x - start.x
        const dz = target.z - start.z
        const horizDist = Math.hypot(dx, dz)
        if (horizDist < 0.1) return
        playerGroup.rotation.y = Math.atan2(dx, dz)
        const isDunk = horizDist < 2.5
        const isLayup = !isDunk && horizDist < 4.0
        const isThree = horizDist > 7
        const wantFadeaway = !!(keys && (keys['shift'] || keys['f']))
        jumpStateBG.active = true
        jumpStateBG.t = 0
        jumpStateBG.baseY = playerGroup.position.y
        jumpStateBG.duration = isDunk ? 0.6 : isLayup ? 0.7 : isThree ? 0.5 : 0.55
        jumpStateBG.peakY = isDunk ? 1.8 : isLayup ? 1.0 : isThree ? 0.6 : 1.2
        jumpStateBG.ballRelease = isDunk ? 0.5 : isLayup ? 0.55 : 0.35
        jumpStateBG.isDunk = isDunk
        ;(jumpStateBG as any).pendingShot = { start, target, dx, dz, horizDist, isDunk, isThree }
        // Phase 16.41 — play the matching XBot body clip
        const xb = (avatarHolder.userData as any).xbot
        if (xb?.play) {
          if (isDunk) xb.play('dunk', 1000)
          else if (isLayup) xb.play('layup', 1000)
          else if (wantFadeaway) xb.play('fadeaway', 1000)
          else xb.play('jumpshot', 800)
        }
      }

      ;(scene.userData as any).updateJump = (dt: number) => {
        if (!jumpStateBG.active) return
        const playerGroup = (scene.userData as any).playerGroupRef
        if (!playerGroup) return
        jumpStateBG.t += dt
        const progress = jumpStateBG.t / jumpStateBG.duration
        let jumpY = 0
        if (progress < 0.15) {
          jumpY = -0.1 * (progress / 0.15)
        } else if (progress < 1) {
          const u = (progress - 0.15) / 0.85
          jumpY = jumpStateBG.peakY * 4 * u * (1 - u) - 0.1 + 0.1 * u
        }
        playerGroup.position.y = jumpStateBG.baseY + jumpY
        const shot = (jumpStateBG as any).pendingShot
        if (shot && progress >= jumpStateBG.ballRelease) {
          const { start, target, dx, dz, isDunk, isThree } = shot
          if (isDunk) {
            ballBG.position.set(target.x, target.y + 0.5, target.z)
            ballStateBG.vel.set(0, -8, 0)
          } else {
            const releaseY = jumpStateBG.baseY + jumpStateBG.peakY + 1.4
            ballBG.position.set(start.x, releaseY, start.z)
            const apexY = target.y + (isThree ? 3.5 : 2.0)
            const g = 9.8 * 1.5
            const timeUp = isThree ? 0.45 : 0.4
            const timeDown = isThree ? 0.7 : 0.55
            const vy = (apexY - releaseY) / timeUp + 0.5 * g * timeUp
            const totalTime = timeUp + timeDown
            const vx = dx / totalTime
            const vz = dz / totalTime
            ballStateBG.vel.set(vx, vy, vz)
          }
          ballStateBG.held = false
          ballStateBG.scoredThisShot = false
          ballStateBG.airborneFrames = 0
          ;(ballStateBG as any).rimHitThisShot = false
          ;(ballStateBG as any).bbHitThisShot = false
          ;(ballStateBG as any).airTime = 0
          ;(ballStateBG as any).bounces = 0
          ballStateBG.returnTimer = 0
          setHoopScore((s) => ({ ...s, attempts: s.attempts + 1 }))
          ;(jumpStateBG as any).pendingShot = null
        }
        if (jumpStateBG.t >= jumpStateBG.duration) {
          jumpStateBG.active = false
          playerGroup.position.y = jumpStateBG.baseY
        }
      }

      ;(scene.userData as any).gravity = (g: number) => {
        if (ballStateBG.held) return
        ballStateBG.airborneFrames++
        const prevY = ballBG.position.y
        const prevVelY = ballStateBG.vel.y
        ballStateBG.vel.y -= 9.8 * 1.5 * g
        ballBG.position.x += ballStateBG.vel.x * g
        ballBG.position.y += ballStateBG.vel.y * g
        ballBG.position.z += ballStateBG.vel.z * g
        // Phase 16.43 — BACKSPIN during flight. Real shooters put backspin
        // on the ball; rotation axis is perpendicular to the direction of
        // horizontal travel. Spin rate scales with launch speed so a hard
        // shot reads as fast spin and a soft layup spins gently.
        const horizVel = Math.hypot(ballStateBG.vel.x, ballStateBG.vel.z)
        if (horizVel > 0.05) {
          const spinRate = (horizVel * 0.45 + Math.abs(ballStateBG.vel.y) * 0.05) * g
          // Spin around axis perpendicular to horizontal velocity in XZ plane
          const ax = -ballStateBG.vel.z / horizVel
          const az = ballStateBG.vel.x / horizVel
          ballBG.rotation.x += ax * spinRate
          ballBG.rotation.z += az * spinRate
        } else {
          // Free-fall ball gets gentle tumble so it doesn't look static
          ballBG.rotation.x += 2.0 * g
        }
        // Sound detection: SWISH on score, RIM on near-miss, BACKBOARD on plane hit
        if (!ballStateBG.scoredThisShot && ballStateBG.vel.y < 0) {
          for (const hoop of hoopList) {
            const dxh = ballBG.position.x - hoop.rimPos.x
            const dzh = ballBG.position.z - hoop.rimPos.z
            const horizDist = Math.hypot(dxh, dzh)
            const dyh = Math.abs(ballBG.position.y - hoop.rimPos.y)
            if (horizDist < 0.34 && dyh < 0.25) {
              ballStateBG.scoredThisShot = true
              setHoopScore((s) => ({ makes: s.makes + 1, attempts: s.attempts, streak: s.streak + 1 }))
              playSwish()
              // Phase 16.44 — crowd erupts on every make
              const crowdRef = (scene.userData as any).crowd
              if (crowdRef?.cheer) crowdRef.cheer()
              break
            }
            // Rim chirp on close miss (ball passes near rim, slightly outside)
            if (!(ballStateBG as any).rimHitThisShot && horizDist > 0.34 && horizDist < 0.6 && dyh < 0.3) {
              ;(ballStateBG as any).rimHitThisShot = true
              playRim()
            }
            // Backboard thud (ball within backboard plane radius)
            if (!(ballStateBG as any).bbHitThisShot && Math.abs(ballBG.position.z - (hoop.rimPos.z - 0.4)) < 0.15 && Math.abs(ballBG.position.x) < 1.0 && ballBG.position.y > 3.2 && ballBG.position.y < 4.3) {
              ;(ballStateBG as any).bbHitThisShot = true
              playBackboard()
            }
          }
        }
        // Track bounces — after 2 floor contacts force settle so the bounce
        // loop can't keep ball "alive" with vel.y < -2 forever.
        if (ballBG.position.y < 0.18) {
          ballBG.position.y = 0.18
          ;(ballStateBG as any).bounces = ((ballStateBG as any).bounces || 0) + 1
          if (ballStateBG.vel.y < -2 && (ballStateBG as any).bounces < 2) {
            ballStateBG.vel.y = -ballStateBG.vel.y * 0.4
            ballStateBG.vel.x *= 0.55
            ballStateBG.vel.z *= 0.55
          } else {
            ballStateBG.vel.set(0, 0, 0)
            if (ballStateBG.returnTimer <= 0) ballStateBG.returnTimer = 0.6
          }
          if (!ballStateBG.scoredThisShot && ballStateBG.airborneFrames > 5) {
            setHoopScore((s) => ({ ...s, streak: 0 }))
            ballStateBG.scoredThisShot = true
          }
        }
        // Phase 16.39 — HARD watchdog. Every shot returns within 2.5s no
        // matter what state the ball is in (over the fence, wedged on the
        // backboard top, bouncing endlessly). Player never gets stuck.
        ;(ballStateBG as any).airTime = ((ballStateBG as any).airTime || 0) + g
        const courtBound = theme === 'gym' ? 16 : 10
        const outOfBounds = Math.abs(ballBG.position.x) > courtBound ||
                            Math.abs(ballBG.position.z) > courtBound ||
                            ballBG.position.y > 25
        if (outOfBounds && ballStateBG.returnTimer <= 0) {
          ballStateBG.returnTimer = 0.3
        }
        if ((ballStateBG as any).airTime > 2.5 && ballStateBG.returnTimer <= 0) {
          ballStateBG.returnTimer = 0.05
        }
        if (ballStateBG.returnTimer > 0) {
          ballStateBG.returnTimer -= g
          if (ballStateBG.returnTimer <= 0) {
            ballStateBG.held = true
            ballStateBG.vel.set(0, 0, 0)
            ;(ballStateBG as any).airTime = 0
            ;(ballStateBG as any).bounces = 0
            ;(ballStateBG as any).rimHitThisShot = false
            ;(ballStateBG as any).bbHitThisShot = false
          }
        }
      }
    }

    if (theme === 'city') {
      // Phase 16.25 — Dashed center line extended to FULL CITY LENGTH (95u
      // each direction) so the street stretches across the open world.
      for (let i = -94; i <= 94; i += 3) {
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(0.3, 1.8),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.15 })
        )
        dash.rotation.x = -Math.PI / 2
        dash.position.set(0, 0.01, i)
        scene.add(dash)
      }
      // CROSS STREETS — perpendicular dashed lines every 40u to break up the
      // grid into city blocks and give intersections to walk through.
      for (let cx = -80; cx <= 80; cx += 40) {
        for (let i = -90; i <= 90; i += 3) {
          if (Math.abs(i) < 5) continue  // gap at center intersection
          const dash = new THREE.Mesh(
            new THREE.PlaneGeometry(1.8, 0.3),
            new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.15 })
          )
          dash.rotation.x = -Math.PI / 2
          dash.position.set(i, 0.01, cx)
          scene.add(dash)
        }
      }
      // Sidewalk strips — full length, both sides
      const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.95 })
      ;[-16.5, 16.5].forEach((x) => {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 200), sidewalkMat)
        sw.position.set(x, 0.075, 0)
        sw.receiveShadow = true
        scene.add(sw)
      })
      // Cross-street sidewalks
      for (let cx = -80; cx <= 80; cx += 40) {
        ;[-16.5, 16.5].forEach((z) => {
          const sw = new THREE.Mesh(new THREE.BoxGeometry(200, 0.15, 2.5), sidewalkMat)
          sw.position.set(0, 0.075, cx + (z > 0 ? -16.5 : 16.5))
          scene.add(sw)
        })
      }
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
      // Storefront facades extended to full street length (200u)
      ;[
        { x: -19.0, rot: Math.PI / 2 },
        { x: 19.0, rot: -Math.PI / 2 },
      ].forEach(({ x, rot }) => {
        const facade = new THREE.Mesh(new THREE.PlaneGeometry(200, 8), brickMat)
        facade.position.set(x, 4, 0)
        facade.rotation.y = rot
        scene.add(facade)
      })
      // Storefront awnings — bright colored stripes along the FULL street
      // (was 6 awnings 0-40u; now 30 awnings spanning -90 to +90u)
      const awningColors = [0xdc2626, 0x16a34a, 0x2563eb, 0xfacc15, 0xa855f7]
      for (let i = 0; i < 30; i++) {
        const ax = -94 + i * 6.5
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
      sctx.fillText('🏀 THE COURT', 512, 80)
      const signTex = new THREE.CanvasTexture(signCanvas)
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 0.75),
        new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xfacc15, emissiveIntensity: 0.3, emissiveMap: signTex }),
      )
      sign.position.set(0, 5.0, courtZ - 3.6)
      scene.add(sign)

      // Phase 16.27 — BASKETBALL. Orange ball follows the character at hand
      // height; press B (or tap SHOOT button) to launch it toward the hoop
      // with a parabolic arc. Simple physics — gravity + initial velocity
      // aimed at the rim's apex. Detect score by checking ball passes through
      // the rim's 0.35u torus radius near rim Y on the way down.
      const RIM_POS = new THREE.Vector3(0, 3.3, courtZ - 3.0)
      const ballMat = new THREE.MeshStandardMaterial({
        color: 0xea580c, emissive: 0xea580c, emissiveIntensity: 0.1, roughness: 0.6, metalness: 0.05,
      })
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), ballMat)
      ball.castShadow = true
      ball.position.set(0, 1.4, 5)  // initial spawn at player
      scene.add(ball)
      const ballState = {
        held: true,
        vel: new THREE.Vector3(),
        scoredThisShot: false,
        airborneFrames: 0,
        returnTimer: 0,
      }
      ;(scene.userData as any).ball = { ball, ballState, RIM_POS }

      // Phase 16.35 — NBA2K-style shot mechanic with jump animation and
      // automatic slam dunk when close to rim. Player crouches → leaps →
      // ball releases at apex. Distance from rim determines shot type:
      //   <2.5u → SLAM DUNK (vertical leap, ball pushed straight through)
      //   2.5-7u → JUMP SHOT (arc with player jump)
      //   >7u → THREE-POINTER (longer arc, less jump)
      const jumpState = { active: false, t: 0, duration: 0, peakY: 0, ballRelease: 0, isDunk: false, baseY: 0 }
      ;(scene.userData as any).jumpState = jumpState
      // playerGroup is declared further below — store ref lazily via scene.userData

      shootRef.current = () => {
        if (!ballState.held || jumpState.active) return  // can't shoot while mid-jump
        const playerGroup = (scene.userData as any).playerGroupRef
        if (!playerGroup) return
        const start = ball.position.clone()
        const target = RIM_POS.clone()
        const dx = target.x - start.x
        const dz = target.z - start.z
        const horizDist = Math.hypot(dx, dz)
        if (horizDist < 0.1) return

        // Face the hoop (rotate player to look at it)
        playerGroup.rotation.y = Math.atan2(dx, dz)

        const isDunk = horizDist < 2.5
        const isThree = horizDist > 7

        // Jump animation parameters
        jumpState.active = true
        jumpState.t = 0
        jumpState.baseY = playerGroup.position.y
        jumpState.duration = isDunk ? 0.6 : isThree ? 0.5 : 0.55
        jumpState.peakY = isDunk ? 1.8 : isThree ? 0.6 : 1.2  // dunk = highest jump
        jumpState.ballRelease = isDunk ? 0.5 : 0.35  // release at peak of jump for dunk
        jumpState.isDunk = isDunk

        // Pre-set ball trajectory parameters but only release at peak of jump
        ;(jumpState as any).pendingShot = { start, target, dx, dz, horizDist, isDunk, isThree }
      }
      ;(scene.userData as any).updateJump = (dt: number) => {
        if (!jumpState.active) return
        const playerGroup = (scene.userData as any).playerGroupRef
        if (!playerGroup) return
        jumpState.t += dt
        const progress = jumpState.t / jumpState.duration
        // Squat-jump-land curve: smooth parabola for vertical leap
        let jumpY = 0
        if (progress < 0.15) {
          // Squat: dip slightly
          jumpY = -0.1 * (progress / 0.15)
        } else if (progress < 1) {
          // Jump arc — parabola peaking at jumpState.peakY
          const u = (progress - 0.15) / 0.85
          jumpY = jumpState.peakY * 4 * u * (1 - u) - 0.1 + 0.1 * u
        }
        playerGroup.position.y = jumpState.baseY + jumpY
        // Release ball at the apex
        const shot = (jumpState as any).pendingShot
        if (shot && progress >= jumpState.ballRelease) {
          const { start, target, dx, dz, horizDist, isDunk, isThree } = shot
          if (isDunk) {
            // SLAM DUNK — push ball straight through rim from above
            ball.position.set(target.x, target.y + 0.5, target.z)
            ballState.vel.set(0, -8, 0)
          } else {
            // Jump shot / three — release from peak position
            const releaseY = jumpState.baseY + jumpState.peakY + 1.4
            ball.position.set(start.x, releaseY, start.z)
            const apexY = target.y + (isThree ? 3.5 : 2.0)
            const g = 9.8 * 1.5
            const timeUp = isThree ? 0.45 : 0.4
            const timeDown = isThree ? 0.7 : 0.55
            const vy = (apexY - releaseY) / timeUp + 0.5 * g * timeUp
            const totalTime = timeUp + timeDown
            const vx = dx / totalTime
            const vz = dz / totalTime
            ballState.vel.set(vx, vy, vz)
          }
          ballState.held = false
          ballState.scoredThisShot = false
          ballState.airborneFrames = 0
          ;(ballState as any).rimHitThisShot = false
          ;(ballState as any).bbHitThisShot = false
          ;(ballState as any).airTime = 0
          ;(ballState as any).bounces = 0
          ballState.returnTimer = 0
          setHoopScore((s) => ({ ...s, attempts: s.attempts + 1 }))
          ;(jumpState as any).pendingShot = null
        }
        if (jumpState.t >= jumpState.duration) {
          jumpState.active = false
          playerGroup.position.y = jumpState.baseY
        }
      }
      ;(scene.userData as any).gravity = (g: number) => {
        const ballRef = (scene.userData as any).ball
        if (!ballRef) return
        const { ball, ballState, RIM_POS } = ballRef
        if (ballState.held) return
        ballState.airborneFrames++
        ballState.vel.y -= 9.8 * 1.5 * g  // g here is dtSec
        ball.position.x += ballState.vel.x * g
        ball.position.y += ballState.vel.y * g
        ball.position.z += ballState.vel.z * g
        // Score + SFX detection
        if (!ballState.scoredThisShot && ballState.vel.y < 0) {
          const dx = ball.position.x - RIM_POS.x
          const dz = ball.position.z - RIM_POS.z
          const horizDist = Math.hypot(dx, dz)
          const dy = Math.abs(ball.position.y - RIM_POS.y)
          if (horizDist < 0.34 && dy < 0.25) {
            ballState.scoredThisShot = true
            setHoopScore((s) => ({ makes: s.makes + 1, attempts: s.attempts, streak: s.streak + 1 }))
            playSwish()
          }
          if (!(ballState as any).rimHitThisShot && horizDist > 0.34 && horizDist < 0.6 && dy < 0.3) {
            ;(ballState as any).rimHitThisShot = true
            playRim()
          }
          if (!(ballState as any).bbHitThisShot && Math.abs(ball.position.z - (RIM_POS.z - 0.4)) < 0.15 && Math.abs(ball.position.x) < 1.0 && ball.position.y > 3.2 && ball.position.y < 4.3) {
            ;(ballState as any).bbHitThisShot = true
            playBackboard()
          }
        }
        // Floor collision — max 2 bounces then force settle
        if (ball.position.y < 0.18) {
          ball.position.y = 0.18
          ;(ballState as any).bounces = ((ballState as any).bounces || 0) + 1
          if (ballState.vel.y < -2 && (ballState as any).bounces < 2) {
            ballState.vel.y = -ballState.vel.y * 0.4
            ballState.vel.x *= 0.55
            ballState.vel.z *= 0.55
          } else {
            ballState.vel.set(0, 0, 0)
            if (ballState.returnTimer <= 0) ballState.returnTimer = 0.6
          }
          if (!ballState.scoredThisShot && ballState.airborneFrames > 5) {
            setHoopScore((s) => ({ ...s, streak: 0 }))
            ballState.scoredThisShot = true
          }
        }
        // Phase 16.39 — HARD 2.5s watchdog + OOB rescue
        ;(ballState as any).airTime = ((ballState as any).airTime || 0) + g
        const outOfBoundsCity = Math.abs(ball.position.x) > 12 ||
                                Math.abs(ball.position.z - RIM_POS.z) > 14 ||
                                ball.position.y > 25
        if (outOfBoundsCity && ballState.returnTimer <= 0) {
          ballState.returnTimer = 0.3
        }
        if ((ballState as any).airTime > 2.5 && ballState.returnTimer <= 0) {
          ballState.returnTimer = 0.05
        }
        // Return to hand after ball settles
        if (ballState.returnTimer > 0) {
          ballState.returnTimer -= g
          if (ballState.returnTimer <= 0) {
            ballState.held = true
            ballState.vel.set(0, 0, 0)
            ;(ballState as any).airTime = 0
            ;(ballState as any).bounces = 0
            ;(ballState as any).rimHitThisShot = false
            ;(ballState as any).bbHitThisShot = false
          }
        }
      }

      // Phase 16.15 — multiplayer pickup game sign (DEFERRED)
      // Until WebRTC/Socket.IO server infrastructure is online, the court is
      // single-player visit-only. Sign tells visitors the multiplayer is
      // coming + invites them to share the URL so friends can show up
      // (today they'd see solo; future they'd see each other's avatars).
      const comingSignCanvas = document.createElement('canvas')
      comingSignCanvas.width = 1024; comingSignCanvas.height = 192
      const cctx = comingSignCanvas.getContext('2d')!
      cctx.fillStyle = 'rgba(0,0,0,0.85)'; cctx.fillRect(0, 0, 1024, 192)
      cctx.strokeStyle = '#22d3ee'; cctx.lineWidth = 3
      cctx.setLineDash([12, 12]); cctx.strokeRect(12, 12, 1000, 168)
      cctx.setLineDash([])
      cctx.fillStyle = '#22d3ee'; cctx.font = 'bold 38px monospace'; cctx.textAlign = 'center'
      cctx.fillText('🚧 PICKUP GAMES — COMING SOON', 512, 65)
      cctx.fillStyle = '#ffffff'; cctx.font = '24px monospace'
      cctx.fillText('2v2 multiplayer · share this gallery URL', 512, 110)
      cctx.fillText('to invite friends · play w/ controllers', 512, 145)
      const comingSignTex = new THREE.CanvasTexture(comingSignCanvas)
      const comingSign = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 0.95),
        new THREE.MeshStandardMaterial({ map: comingSignTex, emissive: 0x22d3ee, emissiveIntensity: 0.15, emissiveMap: comingSignTex, transparent: true }),
      )
      comingSign.position.set(-7, 2.5, courtZ + 1)
      comingSign.rotation.y = Math.PI / 6
      scene.add(comingSign)

      // Phase 16.26 — LOCATION SIGN at spawn point. Updates when user
      // searches a city/street in the HUD search bar. Default shows "spawn"
      // copy with hint to use the search. After search, shows the address.
      // The canvas + texture refs are stored at scene level so the search-
      // result useEffect (below) can mutate them without rebuilding the scene.
      const locSignCanvas = document.createElement('canvas')
      locSignCanvas.width = 1024; locSignCanvas.height = 192
      const locCtx = locSignCanvas.getContext('2d')!
      const paintLocSign = (loc: { label: string; lat: number; lng: number } | null) => {
        locCtx.fillStyle = 'rgba(0,0,0,0.85)'; locCtx.fillRect(0, 0, 1024, 192)
        locCtx.strokeStyle = '#facc15'; locCtx.lineWidth = 4; locCtx.strokeRect(8, 8, 1008, 176)
        locCtx.fillStyle = '#facc15'; locCtx.font = 'bold 36px monospace'; locCtx.textAlign = 'center'
        if (loc) {
          locCtx.fillText('📍 NOW EXPLORING', 512, 60)
          locCtx.fillStyle = '#ffffff'; locCtx.font = 'bold 28px monospace'
          // Wrap long addresses across 2 lines
          const words = loc.label.split(' ')
          const lines: string[] = []
          let line = ''
          for (const w of words) {
            if ((line + ' ' + w).trim().length > 38) { lines.push(line.trim()); line = w }
            else line = (line + ' ' + w).trim()
          }
          if (line) lines.push(line)
          lines.slice(0, 2).forEach((ln, i) => locCtx.fillText(ln, 512, 105 + i * 32))
          locCtx.fillStyle = '#facc15'; locCtx.font = '18px monospace'
          locCtx.fillText(`${loc.lat.toFixed(4)}°, ${loc.lng.toFixed(4)}°`, 512, 170)
        } else {
          locCtx.fillText('🌍 OPEN WORLD', 512, 60)
          locCtx.fillStyle = '#ffffff'; locCtx.font = '24px monospace'
          locCtx.fillText('search any city or address in the HUD', 512, 105)
          locCtx.fillText('to set your "you are here" location', 512, 140)
          locCtx.fillStyle = '#facc15'; locCtx.font = '18px monospace'
          locCtx.fillText('try: "Times Square Manhattan"', 512, 175)
        }
      }
      paintLocSign(cityLocationRef.current)
      const locSignTex = new THREE.CanvasTexture(locSignCanvas)
      const locSign = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 1.3),
        new THREE.MeshStandardMaterial({ map: locSignTex, emissive: 0xfacc15, emissiveIntensity: 0.2, emissiveMap: locSignTex, transparent: true }),
      )
      locSign.position.set(0, 3.5, 8)  // in front of spawn (player spawns at z=5, sign faces them)
      locSign.rotation.y = Math.PI  // face the player
      scene.add(locSign)
      // Store refs on the scene's userData so the cityLocation useEffect can update
      ;(scene.userData as any).locSign = { canvas: locSignCanvas, paint: paintLocSign, texture: locSignTex }

      // Streetlamps every 12 units on both sides for the full city length
      for (let lz = -90; lz <= 90; lz += 12) {
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
    // Phase 16.25 — city theme is OPEN WORLD: no enclosing walls/ceiling,
    // skybox dome instead. Gallery themes (modern/cyberpunk/vinyl/vault) keep
    // their 4 walls + ceiling because that's the gallery-room UX.
    const wallMat = new THREE.MeshStandardMaterial({ color: themeCfg.wall, metalness: 0.3, roughness: 0.7 })
    const wallHeight = 8
    const wallLength = 40

    if (!isOutdoor) {
      // For gym, walls are bigger (30u high gym ceiling) and longer
      const gymExpand = isGymCourt ? 1.5 : 1
      const gymHeight = isGymCourt ? 22 : wallHeight
      const useLen = wallLength * gymExpand
      // Back wall
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(useLen, gymHeight), wallMat)
      backWall.position.set(0, gymHeight / 2, -useLen / 2)
      backWall.receiveShadow = true
      scene.add(backWall)

      // Front + side walls + ceiling
      if (isGymCourt) {
        // Gym: closed box, all 4 walls + ceiling, no door gap
        const fw = new THREE.Mesh(new THREE.PlaneGeometry(useLen, gymHeight), wallMat)
        fw.position.set(0, gymHeight / 2, useLen / 2)
        fw.rotation.y = Math.PI
        scene.add(fw)
        const lw = new THREE.Mesh(new THREE.PlaneGeometry(useLen, gymHeight), wallMat)
        lw.position.set(-useLen / 2, gymHeight / 2, 0)
        lw.rotation.y = Math.PI / 2
        scene.add(lw)
        const rw = new THREE.Mesh(new THREE.PlaneGeometry(useLen, gymHeight), wallMat)
        rw.position.set(useLen / 2, gymHeight / 2, 0)
        rw.rotation.y = -Math.PI / 2
        scene.add(rw)
        const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xf5e8c8, metalness: 0.1, roughness: 0.9 })
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(useLen, useLen), ceilingMat)
        ceiling.position.y = gymHeight
        ceiling.rotation.x = Math.PI / 2
        scene.add(ceiling)
      } else {
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
      }
    } else {
      // CITY OPEN WORLD — dome skybox + atmospheric horizon, no walls/ceiling
      const skyGeo = new THREE.SphereGeometry(280, 32, 16)
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x0a1228) },
          bottomColor: { value: new THREE.Color(0x2a1a14) },
          offset: { value: 33 },
          exponent: { value: 0.7 },
        },
        vertexShader: `varying vec3 vWorldPosition; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPosition = wp.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main(){ float h = normalize(vWorldPosition + offset).y; gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0), exponent), 0.0)), 1.0); }`,
      })
      const sky = new THREE.Mesh(skyGeo, skyMat)
      scene.add(sky)
      // Phase 16.35 — distant city silhouette varies PER SEARCHED LOCATION.
      // Hash the city label (or default "Open World") into a seed → drives
      // building count, height range, density, palette tint, fog hue, window
      // brightness. Different city searches now produce visually distinct
      // skylines instead of the same generic horizon.
      const seedSource = cityLocationRef.current?.label || 'Open World'
      let seed = 0
      for (let i = 0; i < seedSource.length; i++) seed = (seed * 31 + seedSource.charCodeAt(i)) >>> 0
      const seededRandom = () => {
        seed = (seed * 1103515245 + 12345) >>> 0
        return (seed >>> 16) / 65535
      }
      // Per-city derived parameters
      const cityHueShift = seededRandom() * 360       // base palette hue
      const cityBldgCount = 22 + Math.floor(seededRandom() * 16)  // 22-38
      const cityMaxHeight = 18 + seededRandom() * 32  // 18-50 — Tokyo skyscrapers vs Brooklyn lowrise
      const cityDensity = 0.55 + seededRandom() * 0.4 // window lit ratio
      const cityWindowHue = Math.floor(seededRandom() * 60) - 30  // 30° shift around warm yellow
      // Update fog tint from city seed
      const fogR = 0.10 + (seededRandom() * 0.15)
      const fogG = 0.06 + (seededRandom() * 0.12)
      const fogB = 0.03 + (seededRandom() * 0.20)
      if (scene.fog && (scene.fog as any).color) (scene.fog as any).color.setRGB(fogR, fogG, fogB)
      // Update sky shader bottom color from fog (atmospheric horizon match)
      if ((skyMat as any).uniforms?.bottomColor) {
        (skyMat as any).uniforms.bottomColor.value.setRGB(fogR * 1.5, fogG * 1.4, fogB * 1.3)
      }
      // Build the horizon
      for (let i = 0; i < cityBldgCount; i++) {
        const angle = (i / cityBldgCount) * Math.PI * 2
        const r = 130 + seededRandom() * 35
        const w = 8 + seededRandom() * 12
        const h = 12 + seededRandom() * cityMaxHeight
        const d = 8 + seededRandom() * 12
        // Hue rotates around the seed's base shift so all buildings feel
        // like the same "city palette"
        const localHue = ((cityHueShift + (seededRandom() - 0.5) * 40) % 360 + 360) % 360
        const bldgColor = new THREE.Color().setHSL(localHue / 360, 0.35, 0.08)
        const bldgEmissive = new THREE.Color().setHSL(localHue / 360, 0.45, 0.15)
        const bldgMat = new THREE.MeshStandardMaterial({ color: bldgColor, emissive: bldgEmissive, emissiveIntensity: 0.06, roughness: 0.9 })
        const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bldgMat)
        bldg.position.set(Math.sin(angle) * r, h / 2, Math.cos(angle) * r)
        bldg.rotation.y = angle + Math.PI
        scene.add(bldg)
        // Lit windows — count + color from city seed
        if (seededRandom() < cityDensity) {
          const winHue = ((50 + cityWindowHue) % 360 + 360) % 360  // ~yellow base shifted per-city
          const winColor = new THREE.Color().setHSL(winHue / 360, 0.8, 0.55)
          const winMat = new THREE.MeshBasicMaterial({ color: winColor, transparent: true, opacity: 0.7 })
          const winRows = 2 + Math.floor(seededRandom() * 3)
          for (let wi = 0; wi < winRows; wi++) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), winMat)
            const wy = 3 + seededRandom() * (h - 6)
            const wx = (seededRandom() - 0.5) * (w - 2)
            win.position.set(Math.sin(angle) * (r - d / 2 - 0.1) + Math.cos(angle) * wx, wy, Math.cos(angle) * (r - d / 2 - 0.1) - Math.sin(angle) * wx)
            win.rotation.y = angle + Math.PI
            scene.add(win)
          }
        }
      }
      // Store seed/params on scene so the location-search useEffect can
      // rebuild the horizon when a new city is searched without re-mounting.
      ;(scene.userData as any).citySeed = seed
      ;(scene.userData as any).rebuildHorizon = () => {
        // For future ship — currently a full scene rebuild is needed for new
        // city. Saved here as a hook for the next iteration to swap horizon
        // without re-mounting the whole gallery.
      }
    }

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
    // Phase 16.11 + 16.28 — reads the same character config the user saves in
    // CharacterDesigner. Loads GLB if any URL is present. ALSO listens for
    // 'character-updated' events so when user generates a new character in
    // a different tab / via Save as Avatar without leaving the page, the
    // gallery swaps the avatar in-place (no full scene rebuild).
    const playerGroup = new THREE.Group()
    ;(scene.userData as any).playerGroupRef = playerGroup
    playerGroup.position.set(0, 0, 5)
    scene.add(playerGroup)

    // The avatar mesh is held in a sub-group so we can clear + rebuild on
    // character-updated events without touching playerGroup's position/rotation.
    const avatarHolder = new THREE.Group()
    playerGroup.add(avatarHolder)

    // Phase 16.40/16.41 — XBot rigged avatar w/ AnimationMixer + full 2K
    // move-set authored as custom AnimationClips via QuaternionKeyframeTrack.
    const buildXBotPlayer = () => {
      const loader = new GLTFLoader()
      loader.load(
        'https://threejs.org/examples/models/gltf/Xbot.glb',
        (gltf) => {
          const model = gltf.scene
          const preBox = new THREE.Box3().setFromObject(model)
          const preSize = new THREE.Vector3(); preBox.getSize(preSize)
          if (preSize.y > 0 && (preSize.y < 0.5 || preSize.y > 4)) {
            model.scale.setScalar(1.8 / preSize.y)
          }
          model.traverse((obj: any) => {
            if (obj.isMesh) {
              obj.castShadow = true
              obj.receiveShadow = true
            }
          })

          // Phase 16.42 — apply user's CharacterConfig to XBot materials so
          // the player on the court LOOKS LIKE THE CHARACTER THEY DESIGNED
          // in CharacterDesigner. XBot ships w/ multiple meshes (Beta_*,
          // head, hair); tint each by name heuristic. Skin tone tints face
          // /limb meshes, body color tints jersey/torso, hair color tints
          // hair mesh. Materials are cloned so the cache copy stays clean
          // for the next theme switch. character-updated event listener
          // already tears down + rebuilds, so live designer edits propagate
          // to the court in real time (same flow as buildCapsule themes).
          const charForXBot = getStoredCharacter()
          const bodyColor = new THREE.Color(charForXBot.bodyColor || '#22d3ee')
          const skinHex = (charForXBot as any).face?.skinTone || (charForXBot as any).skinColor || '#d4a373'
          const skinColor = new THREE.Color(skinHex)
          const HAIR_COLOR_HEX: Record<string, string> = {
            black: '#1a1a1a', brown: '#5a3a1a', blonde: '#e6c98a', red: '#a02020',
            silver: '#c0c0c0', cyan: '#22d3ee', pink: '#ec4899', purple: '#a855f7',
            rainbow: '#ec4899', platinum: '#e5e4e2', ginger: '#c4602f', 'two-tone': '#5a3a1a',
          }
          const hairHex = (charForXBot as any).hairColorHex
            || HAIR_COLOR_HEX[charForXBot.hairColor as string]
            || '#1a1a1a'
          const hairColor = new THREE.Color(hairHex)
          const accentHex = (charForXBot as any).accentColor || (charForXBot as any).glowColor
          model.traverse((obj: any) => {
            if (!obj.isMesh || !obj.material) return
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
            const cloned = materials.map((mat: any) => {
              const m = mat.clone()
              const key = `${(obj.name || '').toLowerCase()} ${(mat.name || '').toLowerCase()}`
              if (/face|head|skin|joint|eye/.test(key)) {
                m.color = skinColor.clone()
              } else if (/hair/.test(key)) {
                m.color = hairColor.clone()
              } else if (/short|pant|leg|sneaker|shoe/.test(key) && accentHex) {
                m.color = new THREE.Color(accentHex)
              } else {
                // Default: jersey / body / clothing → user's bodyColor
                m.color = bodyColor.clone()
              }
              // Slight emissive lift on jersey tint so it reads on dark
              // courts (matches buildCapsule's jersey emissive treatment).
              if (m.emissive && !/face|head|skin|hair/.test(key)) {
                m.emissive = bodyColor.clone().multiplyScalar(0.08)
              }
              return m
            })
            obj.material = Array.isArray(obj.material) ? cloned : cloned[0]
          })

          // Honor user's height multiplier — buildCapsule themes already
          // do this, but the sports-theme branch skipped buildAvatar's
          // scaling math (line ~1888-1889). 1.0 default = no change.
          const heightMul = charForXBot.height ?? 1
          if (heightMul !== 1 && heightMul > 0) model.scale.multiplyScalar(heightMul)

          avatarHolder.add(model)

          if (!gltf.animations || gltf.animations.length === 0) return
          const mixer = new THREE.AnimationMixer(model)
          const clipMap: Record<string, THREE.AnimationAction> = {}
          for (const clip of gltf.animations) {
            clipMap[clip.name.toLowerCase()] = mixer.clipAction(clip)
          }

          // ─── Phase 16.41 — Author custom 2K move clips ───
          // Collect bone names by scanning the skeleton; Mixamo prefix is the
          // standard for threejs.org/Xbot but we resolve dynamically so any
          // rig variant still wires up the clips that match its bone naming.
          const boneByName: Record<string, THREE.Bone> = {}
          model.traverse((obj: any) => {
            if (obj.isBone) boneByName[obj.name] = obj
          })
          const findBone = (...candidates: string[]) => {
            for (const c of candidates) {
              if (boneByName[c]) return boneByName[c].name
              const found = Object.keys(boneByName).find(n => n.toLowerCase().endsWith(c.toLowerCase()))
              if (found) return found
            }
            return null
          }
          const B = {
            hips:   findBone('mixamorigHips', 'Hips'),
            spine:  findBone('mixamorigSpine1', 'Spine1', 'mixamorigSpine', 'Spine'),
            head:   findBone('mixamorigHead', 'Head'),
            armL:   findBone('mixamorigLeftArm', 'LeftArm'),
            armR:   findBone('mixamorigRightArm', 'RightArm'),
            forearmL: findBone('mixamorigLeftForeArm', 'LeftForeArm'),
            forearmR: findBone('mixamorigRightForeArm', 'RightForeArm'),
            upLegL: findBone('mixamorigLeftUpLeg', 'LeftUpLeg'),
            upLegR: findBone('mixamorigRightUpLeg', 'RightUpLeg'),
            legL:   findBone('mixamorigLeftLeg', 'LeftLeg'),
            legR:   findBone('mixamorigRightLeg', 'RightLeg'),
          }
          console.log('[GalleryRoom3D] XBot bones resolved:', B)

          // Phase 16.42 — build a QuaternionKeyframeTrack from euler keyframes
          // APPLIED ON TOP of the bone's bind-pose quaternion. Mixamo XBot's
          // bind pose has arms at sides (NOT identity rotation), so writing
          // identity at keyframe 0 forces arms into world-aligned T-pose.
          // Composing bindQuat * delta means [0,0,0] keyframes = bind pose
          // (arms at sides) and middle keyframes apply rotation deltas on top.
          // This is what made the previous hand-rolled clips look "frozen /
          // broken" — they were correct rotations but on the wrong base.
          const _q = new THREE.Quaternion()
          const _e = new THREE.Euler()
          const _qBind = new THREE.Quaternion()
          const _qDelta = new THREE.Quaternion()
          const quatTrack = (bonePath: string | null, times: number[], eulers: number[][]) => {
            if (!bonePath) return null
            const bone = boneByName[bonePath]
            if (bone) _qBind.copy(bone.quaternion); else _qBind.identity()
            const flat = new Float32Array(times.length * 4)
            for (let i = 0; i < eulers.length; i++) {
              _e.set(eulers[i][0] || 0, eulers[i][1] || 0, eulers[i][2] || 0)
              _qDelta.setFromEuler(_e)
              _q.copy(_qBind).multiply(_qDelta)
              flat[i * 4]     = _q.x
              flat[i * 4 + 1] = _q.y
              flat[i * 4 + 2] = _q.z
              flat[i * 4 + 3] = _q.w
            }
            return new THREE.QuaternionKeyframeTrack(`${bonePath}.quaternion`, times, flat)
          }
          const buildClip = (
            name: string,
            duration: number,
            tracks: Array<ReturnType<typeof quatTrack>>,
          ) => {
            const valid = tracks.filter((t): t is THREE.QuaternionKeyframeTrack => t !== null)
            return new THREE.AnimationClip(name, duration, valid)
          }

          // Phase 16.43 — DUNK (Kobe baseline reverse vibe). 6-key sequence
          // adds RIM HANG frame (arms still overhead post-slam) + soft 2-foot
          // landing instead of snap-to-rest.
          const dunkClip = buildClip('dunk', 1.2, [
            quatTrack(B.upLegL, [0, 0.18, 0.40, 0.55, 0.85, 1.2],
              [[0,0,0], [-1.05,0,0], [-0.1,0,0], [0.0,0,0], [-0.4,0,0], [0,0,0]]),
            quatTrack(B.upLegR, [0, 0.18, 0.40, 0.55, 0.85, 1.2],
              [[0,0,0], [-1.05,0,0], [-0.1,0,0], [0.0,0,0], [-0.4,0,0], [0,0,0]]),
            quatTrack(B.legL,   [0, 0.18, 0.40, 0.55, 0.85, 1.2],
              [[0,0,0], [1.55,0,0], [0.15,0,0], [0.0,0,0], [0.7,0,0], [0,0,0]]),
            quatTrack(B.legR,   [0, 0.18, 0.40, 0.55, 0.85, 1.2],
              [[0,0,0], [1.55,0,0], [0.15,0,0], [0.0,0,0], [0.7,0,0], [0,0,0]]),
            // Both arms gather low → swing up overhead at peak → SLAM down
            // → RIM HANG (arms held overhead briefly, slight bend through
            // forearm) → drop to rest
            quatTrack(B.armL,   [0, 0.18, 0.40, 0.55, 0.70, 1.0, 1.2],
              [[0,0,0], [0.2,0,0.55], [-2.7,0,0.15], [-1.8,0,0.1], [-2.5,0,0.18], [-1.0,0,0.1], [0,0,0]]),
            quatTrack(B.armR,   [0, 0.18, 0.40, 0.55, 0.70, 1.0, 1.2],
              [[0,0,0], [0.2,0,-0.55], [-2.7,0,-0.15], [-1.8,0,-0.1], [-2.5,0,-0.18], [-1.0,0,-0.1], [0,0,0]]),
            quatTrack(B.forearmL, [0, 0.40, 0.55, 0.70, 1.2],
              [[0,0,0], [-0.5,0,0], [-0.2,0,0], [-0.3,0,0], [0,0,0]]),
            quatTrack(B.forearmR, [0, 0.40, 0.55, 0.70, 1.2],
              [[0,0,0], [-0.5,0,0], [-0.2,0,0], [-0.3,0,0], [0,0,0]]),
            quatTrack(B.spine,  [0, 0.18, 0.40, 0.55, 0.85, 1.2],
              [[0,0,0], [0.25,0,0], [-0.25,0,0], [-0.1,0,0], [0.15,0,0], [0,0,0]]),
            quatTrack(B.head,   [0, 0.40, 0.55, 1.2], [[0,0,0], [-0.25,0,0], [-0.1,0,0], [0,0,0]]),
          ])

          // Phase 16.43 — LAYUP. Drive leg knee lift + extended right arm
          // scoop + BALL ROLL-OFF (wrist over-extension at finish releases
          // ball off fingertips) + plant landing.
          const layupClip = buildClip('layup', 1.1, [
            quatTrack(B.upLegR, [0, 0.20, 0.45, 0.65, 0.90, 1.1],
              [[0,0,0], [-1.45,0,0], [-0.5,0,0], [-0.2,0,0], [-0.35,0,0], [0,0,0]]),
            quatTrack(B.legR,   [0, 0.20, 0.45, 0.65, 0.90, 1.1],
              [[0,0,0], [1.25,0,0], [0.35,0,0], [0.15,0,0], [0.6,0,0], [0,0,0]]),
            quatTrack(B.upLegL, [0, 0.45, 0.90, 1.1], [[0,0,0], [-0.15,0,0], [-0.25,0,0], [0,0,0]]),
            quatTrack(B.legL,   [0, 0.45, 0.90, 1.1], [[0,0,0], [0.25,0,0], [0.45,0,0], [0,0,0]]),
            quatTrack(B.armR,   [0, 0.20, 0.45, 0.60, 0.75, 1.1],
              [[0,0,0], [-0.95,0,0.08], [-2.55,0,0.1], [-2.65,0,0.12], [-1.7,0,0.05], [0,0,0]]),
            quatTrack(B.forearmR, [0, 0.20, 0.45, 0.60, 0.75, 1.1],
              [[0,0,0], [-0.5,0,0], [-0.4,0,0], [0.2,0,0], [-0.15,0,0], [0,0,0]]),
            // Guide hand swings in to cradle ball pre-release
            quatTrack(B.armL,   [0, 0.20, 0.45, 0.60, 1.1],
              [[0,0,0], [-0.45,0,0.3], [-1.05,0,0.25], [-0.5,0,0.2], [0,0,0]]),
            quatTrack(B.forearmL, [0, 0.20, 0.45, 1.1], [[0,0,0], [-0.4,0,0], [-0.6,0,0], [0,0,0]]),
            quatTrack(B.spine,  [0, 0.45, 0.65, 1.1], [[0,0,0], [-0.15,0,0.1], [-0.05,0,0.05], [0,0,0]]),
          ])

          // Phase 16.43 — FADEAWAY. Back-leaning jump shot signature: legs
          // drift back during release, spine leans further past straight,
          // shoulder rolls back to clear defender, FOLLOW THROUGH HELD during
          // back-fall, knees absorb on landing.
          const fadeawayClip = buildClip('fadeaway', 1.1, [
            quatTrack(B.upLegL, [0, 0.20, 0.45, 0.70, 0.90, 1.1],
              [[0,0,0], [-0.55,0,0], [-0.25,0,0], [-0.05,0,0], [-0.35,0,0], [0,0,0]]),
            quatTrack(B.upLegR, [0, 0.20, 0.45, 0.70, 0.90, 1.1],
              [[0,0,0], [-0.55,0,0], [-0.25,0,0], [-0.05,0,0], [-0.35,0,0], [0,0,0]]),
            quatTrack(B.legL,   [0, 0.20, 0.45, 0.70, 0.90, 1.1],
              [[0,0,0], [0.85,0,0], [0.35,0,0], [0.1,0,0], [0.55,0,0], [0,0,0]]),
            quatTrack(B.legR,   [0, 0.20, 0.45, 0.70, 0.90, 1.1],
              [[0,0,0], [0.85,0,0], [0.35,0,0], [0.1,0,0], [0.55,0,0], [0,0,0]]),
            // Shooting arm — peak release at 0.55, gooseneck hold through 0.75
            quatTrack(B.armR,   [0, 0.20, 0.40, 0.55, 0.75, 0.95, 1.1],
              [[0,0,0], [-0.45,0,0.05], [-1.6,0,0.05], [-2.55,0,0.05], [-2.6,0,0.12], [-1.1,0,0.05], [0,0,0]]),
            quatTrack(B.forearmR, [0, 0.20, 0.40, 0.55, 0.75, 1.1],
              [[0,0,0], [-0.55,0,0], [-1.0,0,0], [-0.2,0,0], [0.3,0,0], [0,0,0]]),
            // Guide hand
            quatTrack(B.armL,   [0, 0.20, 0.40, 0.55, 1.1],
              [[0,0,0], [-0.35,0,0.25], [-0.85,0,0.3], [-0.55,0,0.2], [0,0,0]]),
            // Spine back-arch — the FADEAWAY signature
            quatTrack(B.spine,  [0, 0.20, 0.40, 0.55, 0.75, 1.1],
              [[0,0,0], [0.05,0,0], [-0.25,0,0], [-0.5,0,0], [-0.38,0,0], [0,0,0]]),
            quatTrack(B.head,   [0, 0.40, 0.55, 0.75, 1.1],
              [[0,0,0], [-0.2,0,0], [-0.35,0,0], [-0.22,0,0], [0,0,0]]),
          ])

          // Phase 16.43 — REBOUND. Two-leg explosive leap → both arms snap
          // up overhead to attack ball → ARMS CRADLE PULL DOWN (forearms
          // bend inward, ball secured to chest) → 2-foot landing.
          const reboundClip = buildClip('rebound', 0.95, [
            quatTrack(B.upLegL, [0, 0.18, 0.40, 0.65, 0.85, 0.95],
              [[0,0,0], [-0.85,0,0], [-0.05,0,0], [-0.05,0,0], [-0.3,0,0], [0,0,0]]),
            quatTrack(B.upLegR, [0, 0.18, 0.40, 0.65, 0.85, 0.95],
              [[0,0,0], [-0.85,0,0], [-0.05,0,0], [-0.05,0,0], [-0.3,0,0], [0,0,0]]),
            quatTrack(B.legL,   [0, 0.18, 0.40, 0.65, 0.85, 0.95],
              [[0,0,0], [1.25,0,0], [0.1,0,0], [0.1,0,0], [0.5,0,0], [0,0,0]]),
            quatTrack(B.legR,   [0, 0.18, 0.40, 0.65, 0.85, 0.95],
              [[0,0,0], [1.25,0,0], [0.1,0,0], [0.1,0,0], [0.5,0,0], [0,0,0]]),
            quatTrack(B.armL,   [0, 0.25, 0.45, 0.65, 0.95],
              [[0,0,0], [-2.85,0,0.25], [-2.7,0,0.22], [-1.2,0,0.2], [0,0,0]]),
            quatTrack(B.armR,   [0, 0.25, 0.45, 0.65, 0.95],
              [[0,0,0], [-2.85,0,-0.25], [-2.7,0,-0.22], [-1.2,0,-0.2], [0,0,0]]),
            // CRADLE PULL-DOWN — forearms bend inward, ball secured
            quatTrack(B.forearmL, [0, 0.45, 0.65, 0.85, 0.95],
              [[0,0,0], [-0.2,0,0], [-1.3,0,-0.3], [-1.0,0,-0.25], [0,0,0]]),
            quatTrack(B.forearmR, [0, 0.45, 0.65, 0.85, 0.95],
              [[0,0,0], [-0.2,0,0], [-1.3,0,0.3], [-1.0,0,0.25], [0,0,0]]),
            quatTrack(B.spine,  [0, 0.40, 0.65, 0.85, 0.95],
              [[0,0,0], [-0.15,0,0], [0.05,0,0], [0.1,0,0], [0,0,0]]),
            quatTrack(B.head,   [0, 0.40, 0.95], [[0,0,0], [-0.3,0,0], [0,0,0]]),
          ])

          // DEFENSIVE STANCE — held pose, knees bent, arms out wide (loop)
          const defenseClip = buildClip('defense', 0.5, [
            quatTrack(B.upLegL, [0, 0.25, 0.5], [[-0.6,0,-0.25], [-0.65,0,-0.25], [-0.6,0,-0.25]]),
            quatTrack(B.upLegR, [0, 0.25, 0.5], [[-0.6,0,0.25],  [-0.65,0,0.25],  [-0.6,0,0.25]]),
            quatTrack(B.legL,   [0, 0.5], [[1.0,0,0], [1.0,0,0]]),
            quatTrack(B.legR,   [0, 0.5], [[1.0,0,0], [1.0,0,0]]),
            quatTrack(B.armL,   [0, 0.25, 0.5], [[0,0,1.0], [0.1,0,1.05], [0,0,1.0]]),
            quatTrack(B.armR,   [0, 0.25, 0.5], [[0,0,-1.0], [0.1,0,-1.05], [0,0,-1.0]]),
            quatTrack(B.spine,  [0, 0.5], [[0.2,0,0], [0.2,0,0]]),
          ])

          // Phase 16.43 — BLOCK. Vertical leap + right arm straight up to
          // swat → DOWNWARD SWAT (forearm whips down past peak = the
          // "GET THAT OUTTA HERE" motion) → 2-foot landing.
          const blockClip = buildClip('block', 0.85, [
            quatTrack(B.upLegL, [0, 0.18, 0.45, 0.70, 0.85],
              [[0,0,0], [-0.7,0,0], [-0.05,0,0], [-0.3,0,0], [0,0,0]]),
            quatTrack(B.upLegR, [0, 0.18, 0.45, 0.70, 0.85],
              [[0,0,0], [-0.7,0,0], [-0.05,0,0], [-0.3,0,0], [0,0,0]]),
            quatTrack(B.legL,   [0, 0.18, 0.45, 0.70, 0.85],
              [[0,0,0], [1.05,0,0], [0.1,0,0], [0.5,0,0], [0,0,0]]),
            quatTrack(B.legR,   [0, 0.18, 0.45, 0.70, 0.85],
              [[0,0,0], [1.05,0,0], [0.1,0,0], [0.5,0,0], [0,0,0]]),
            // Right arm shoots straight up, then SWATS down past peak
            quatTrack(B.armR,   [0, 0.18, 0.40, 0.55, 0.85],
              [[0,0,0], [-1.5,0,-0.08], [-2.85,0,-0.05], [-1.6,0,-0.05], [0,0,0]]),
            quatTrack(B.forearmR, [0, 0.40, 0.55, 0.85],
              [[0,0,0], [-0.15,0,0], [0.35,0,0], [0,0,0]]),
            quatTrack(B.armL,   [0, 0.25, 0.55, 0.85],
              [[0,0,0], [-0.6,0,0.35], [-0.4,0,0.25], [0,0,0]]),
            quatTrack(B.spine,  [0, 0.40, 0.85], [[0,0,0], [-0.08,0,-0.05], [0,0,0]]),
          ])

          // PASS — chest pass: both forearms extend forward
          const passClip = buildClip('pass', 0.5, [
            quatTrack(B.armL,   [0, 0.15, 0.3, 0.5], [[0,0,0], [-0.4,0,0.4], [-0.9,0,0.3], [0,0,0]]),
            quatTrack(B.armR,   [0, 0.15, 0.3, 0.5], [[0,0,0], [-0.4,0,-0.4], [-0.9,0,-0.3], [0,0,0]]),
            quatTrack(B.forearmL, [0, 0.15, 0.3, 0.5], [[0,0,0], [-1.2,0,0], [-0.2,0,0], [0,0,0]]),
            quatTrack(B.forearmR, [0, 0.15, 0.3, 0.5], [[0,0,0], [-1.2,0,0], [-0.2,0,0], [0,0,0]]),
          ])

          // CROSSOVER — lateral lean + arms swap
          const crossoverClip = buildClip('crossover', 0.4, [
            quatTrack(B.spine,  [0, 0.2, 0.4], [[0,0,0], [0,0,0.35], [0,0,0]]),
            quatTrack(B.armL,   [0, 0.2, 0.4], [[0,0,0], [-0.4,0.4,0.3], [0,0,0]]),
            quatTrack(B.armR,   [0, 0.2, 0.4], [[0,0,0], [-0.4,-0.4,-0.3], [0,0,0]]),
          ])

          // PUMP FAKE — quick arm raise without ball release
          const pumpFakeClip = buildClip('pumpFake', 0.35, [
            quatTrack(B.armR,   [0, 0.15, 0.35], [[0,0,0], [-1.4,0,0], [0,0,0]]),
            quatTrack(B.forearmR, [0, 0.15, 0.35], [[0,0,0], [-0.6,0,0], [0,0,0]]),
            quatTrack(B.armL,   [0, 0.15, 0.35], [[0,0,0], [-0.3,0,0.2], [0,0,0]]),
          ])

          // JAB STEP — quick forward leg jab
          const jabStepClip = buildClip('jabStep', 0.28, [
            quatTrack(B.upLegR, [0, 0.14, 0.28], [[0,0,0], [-0.5,0,0], [0,0,0]]),
            quatTrack(B.legR,   [0, 0.14, 0.28], [[0,0,0], [0.3,0,0], [0,0,0]]),
            quatTrack(B.spine,  [0, 0.14, 0.28], [[0,0,0], [-0.15,0,0], [0,0,0]]),
          ])

          // Phase 16.43 — JUMP SHOT (Kobe form). 8-key sequence:
          // 0.0  stance       — triple-threat, ball at hip
          // 0.15 gather       — deep knee bend, both arms lift ball to chest
          // 0.30 drive        — legs explode up, shooting elbow under ball (90°)
          // 0.45 peak / lift  — full extension, elbow above forehead
          // 0.55 RELEASE      — wrist begins snap (forearm extends past straight)
          // 0.70 GOOSENECK    — wrist flicks DOWN, fingers point at floor,
          //                     guide hand drops away (Kobe signature hold)
          // 0.85 descent      — legs prep to absorb landing
          // 1.0  landing      — soft knees, return to base
          const jumpShotClip = buildClip('jumpshot', 1.0, [
            quatTrack(B.upLegL, [0, 0.15, 0.30, 0.45, 0.70, 0.85, 1.0],
              [[0,0,0], [-0.45,0,0], [-0.55,0,0], [-0.1,0,0], [-0.05,0,0], [-0.35,0,0], [0,0,0]]),
            quatTrack(B.upLegR, [0, 0.15, 0.30, 0.45, 0.70, 0.85, 1.0],
              [[0,0,0], [-0.45,0,0], [-0.55,0,0], [-0.1,0,0], [-0.05,0,0], [-0.35,0,0], [0,0,0]]),
            quatTrack(B.legL,   [0, 0.15, 0.30, 0.45, 0.70, 0.85, 1.0],
              [[0,0,0], [0.9,0,0], [0.7,0,0], [0.05,0,0], [0.05,0,0], [0.65,0,0], [0,0,0]]),
            quatTrack(B.legR,   [0, 0.15, 0.30, 0.45, 0.70, 0.85, 1.0],
              [[0,0,0], [0.9,0,0], [0.7,0,0], [0.05,0,0], [0.05,0,0], [0.65,0,0], [0,0,0]]),
            // Shooting arm — upper arm sweeps up to full extension; subtle
            // outward tilt during gooseneck hold so the arm doesn't read flat
            quatTrack(B.armR,   [0, 0.15, 0.30, 0.45, 0.55, 0.70, 0.85, 1.0],
              [[0,0,0], [-0.4,0,0.05], [-1.7,0,0], [-2.55,0,0.02], [-2.7,0,0.05], [-2.62,0,0.12], [-1.1,0,0.05], [0,0,0]]),
            // Shooting forearm — 90° bend at gather (ball in pocket), unfolds
            // through peak, then OVER-EXTENDS slightly (positive X = wrist
            // drops below the line of the arm = gooseneck)
            quatTrack(B.forearmR, [0, 0.15, 0.30, 0.45, 0.55, 0.70, 0.85, 1.0],
              [[0,0,0], [-0.5,0,0], [-1.05,0,0], [-0.55,0,0], [-0.15,0,0], [0.35,0,0], [0.15,0,0], [0,0,0]]),
            // Guide hand — supports ball on the way up, drops away at release
            // (left hand falls to chest level + slightly outward)
            quatTrack(B.armL,   [0, 0.15, 0.30, 0.45, 0.55, 0.70, 0.85, 1.0],
              [[0,0,0], [-0.35,0,0.25], [-0.95,0,0.3], [-1.3,0,0.28], [-0.95,0,0.22], [-0.4,0,0.18], [-0.15,0,0.1], [0,0,0]]),
            quatTrack(B.forearmL, [0, 0.15, 0.30, 0.45, 0.55, 0.70, 1.0],
              [[0,0,0], [-0.3,0,0], [-0.7,0,0], [-0.5,0,0], [-0.25,0,0], [-0.1,0,0], [0,0,0]]),
            // Spine — slight forward lean on gather, upright through release,
            // tiny backward lean during gooseneck (back arch hold)
            quatTrack(B.spine,  [0, 0.15, 0.30, 0.45, 0.55, 0.70, 1.0],
              [[0,0,0], [0.08,0,0], [0.02,0,0], [-0.05,0,0], [-0.08,0,0], [-0.04,0,0], [0,0,0]]),
            // Head — chin up at peak (eyes track ball through release), level
            // through gooseneck
            quatTrack(B.head,   [0, 0.30, 0.55, 0.70, 1.0],
              [[0,0,0], [-0.1,0,0], [-0.18,0,0], [-0.12,0,0], [0,0,0]]),
          ])

          // Wire all custom clips into the clipMap. LoopOnce + clampWhenFinished
          // means the clip stops on its last frame (we manually fade back).
          const oneShotClips = [dunkClip, layupClip, fadeawayClip, reboundClip, blockClip, passClip, crossoverClip, pumpFakeClip, jabStepClip, jumpShotClip]
          for (const clip of oneShotClips) {
            const action = mixer.clipAction(clip)
            action.setLoop(THREE.LoopOnce, 1)
            action.clampWhenFinished = true
            clipMap[clip.name.toLowerCase()] = action
          }
          // Defense loops while held
          const defenseAction = mixer.clipAction(defenseClip)
          defenseAction.setLoop(THREE.LoopRepeat, Infinity)
          clipMap[defenseClip.name.toLowerCase()] = defenseAction

          // Start Idle
          const idleAction = clipMap['idle']
          if (idleAction) idleAction.play()
          const xbotState: any = {
            mixer,
            clips: clipMap,
            currentClip: 'idle',
            moveLockUntil: 0,
            defenseHeld: false,
          }
          // Phase 16.41 — Mixamo Xbot ships with 13 stock clips that are
          // already polished retargets: Idle, Walking, Running, Dance,
          // Death, Sitting, Standing, Jump, Yes, No, Wave, Punch, ThumbsUp.
          // Hand-rolled QuaternionKeyframeTrack pose authoring missed bone
          // axis conventions and rendered as frozen / broken poses. Now
          // every move routes to the closest stock clip — fluid motion
          // guaranteed because Mixamo authored them. Position state
          // machines (jumpState / moveState) still differentiate trajectory.
          const moveToStockClip: Record<string, string> = {
            'jumpshot':  'jump',
            'dunk':      'jump',
            'layup':     'jump',
            'fadeaway':  'jump',
            'rebound':   'jump',
            'block':     'jump',
            'pass':      'punch',
            'pumpfake':  'wave',
            'crossover': 'wave',
            'jabstep':   'walking',
            'defense':   'sitting',
          }
          // Phase 16.43 — moves that warrant a sneaker squeak on trigger
          // (any ground-direction-change or push-off — basically anything
          // that isn't a hold pose like defense)
          const SQUEAK_MOVES = new Set([
            'jumpshot', 'dunk', 'layup', 'fadeaway', 'rebound', 'block',
            'crossover', 'jabstep', 'pumpfake',
          ])
          xbotState.play = (clipName: string, durationMs: number) => {
            const key = clipName.toLowerCase()
            // Phase 16.42 — authored 2K clips now bind-pose-correct. Prefer
            // the authored basketball clip; fall through to stock Mixamo
            // only when an authored clip is genuinely missing.
            const fallback = moveToStockClip[key]
            const actionKey = clipMap[key] ? key : (fallback && clipMap[fallback]) ? fallback : key
            const newAction = clipMap[actionKey]
            if (!newAction) return
            const oldAction = clipMap[xbotState.currentClip]
            newAction.reset().setEffectiveWeight(1).fadeIn(0.12).play()
            if (oldAction && oldAction !== newAction) oldAction.fadeOut(0.12)
            xbotState.currentClip = actionKey
            xbotState.moveLockUntil = performance.now() + durationMs
            // Phase 16.43 — sneaker squeak on triggered moves
            if (SQUEAK_MOVES.has(key)) playSqueak()
          }
          ;(avatarHolder.userData as any).xbot = xbotState
          console.log('[GalleryRoom3D] XBot loaded w/ 2K clips', {
            stock: gltf.animations.map(c => c.name),
            authored: oneShotClips.map(c => c.name).concat([defenseClip.name]),
          })
        },
        undefined,
        (err) => {
          console.error('[GalleryRoom3D] XBot load failed, falling back to humanoid:', err)
          buildCapsule({ bodyColor: '#dc2626' } as CharacterConfig)
        },
      )
    }

    const buildAvatar = (character: CharacterConfig) => {
      // Tear down old meshes first + stop any animation mixer
      const oldXbot = (avatarHolder.userData as any).xbot
      if (oldXbot?.mixer) {
        oldXbot.mixer.stopAllAction()
      }
      ;(avatarHolder.userData as any).xbot = null
      ;(avatarHolder.userData as any).limbs = null
      while (avatarHolder.children.length > 0) {
        const child = avatarHolder.children[0]
        avatarHolder.remove(child)
        if ((child as any).geometry) (child as any).geometry.dispose()
        if ((child as any).material) {
          const mat = (child as any).material
          if (Array.isArray(mat)) mat.forEach((m: any) => m.dispose())
          else mat.dispose()
        }
      }
      const glbUrl = (character as any).aiGlbUrl || character.humanGlbUrl
      // Phase 16.40 — sports themes (gym + blacktop) load XBot with bundled
      // walk/run/idle animations. Other themes still honor saved character GLBs.
      const isSportsTheme = theme === 'gym' || theme === 'blacktop'
      if (isSportsTheme) {
        buildXBotPlayer()
        return
      }
      const isGlbAvatar = !!glbUrl && !isSportsTheme
      console.log('[GalleryRoom3D] character', {
        type: character.type,
        hasAiGlb: !!(character as any).aiGlbUrl,
        hasHumanGlb: !!character.humanGlbUrl,
        sportsTheme: isSportsTheme,
        willLoadGlb: isGlbAvatar,
      })
      if (isGlbAvatar) {
        const loader = new GLTFLoader()
        loader.load(
          glbUrl!,
          (gltf) => {
            const model = gltf.scene
            const baseScale = character.humanScale ?? 1
            const heightMul = character.height ?? 1
            const preBox = new THREE.Box3().setFromObject(model)
            const preSize = new THREE.Vector3(); preBox.getSize(preSize)
            if (preSize.y > 0 && (preSize.y < 0.5 || preSize.y > 4)) {
              const autoScale = 1.8 / preSize.y
              model.scale.setScalar(autoScale * heightMul)
            } else {
              model.scale.setScalar(baseScale * heightMul)
            }
            const box = new THREE.Box3().setFromObject(model)
            const center = new THREE.Vector3(); box.getCenter(center)
            model.position.x -= center.x
            model.position.z -= center.z
            model.position.y = (character.humanYOffset ?? 0) - box.min.y
            model.traverse((obj: any) => {
              if (obj.isMesh) {
                obj.castShadow = true
                obj.receiveShadow = true
              }
            })
            avatarHolder.add(model)
            console.log('[GalleryRoom3D] GLB loaded + auto-scaled')
          },
          undefined,
          (err) => {
            console.error('[GalleryRoom3D] character GLB load failed, falling back to capsule:', err)
            buildCapsule(character)
          }
        )
      } else {
        buildCapsule(character)
      }
    }

    const buildCapsule = (character: CharacterConfig) => {
      // Phase 16.39 — humanoid built from primitives WITH joint groups so the
      // animate loop can rotate each limb around hip/shoulder for a walk cycle.
      // Each leg/arm is a Group at the joint; the limb meshes hang underneath
      // so rotation.x on the group swings the whole limb from the joint.
      const skinTone = (character as any).skinColor || 0xd4a373
      const skin = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.7, metalness: 0.05 })
      const jersey = new THREE.MeshStandardMaterial({
        color: character.bodyColor || themeCfg.accent,
        emissive: character.glowColor || themeCfg.accent,
        emissiveIntensity: (character.glowIntensity ?? 0.2) * 0.4,
        roughness: 0.6, metalness: 0.1,
      })
      const shortsMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.05 })
      const sneakerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1 })
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })

      // Head + hair
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), skin)
      head.position.set(0, 1.86, 0); head.castShadow = true
      avatarHolder.add(head)
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), hairMat)
      hair.position.set(0, 1.88, 0); hair.castShadow = true
      avatarHolder.add(hair)

      // Torso (jersey)
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.28), jersey)
      torso.position.set(0, 1.4, 0); torso.castShadow = true
      avatarHolder.add(torso)

      // Hips / shorts
      const hips = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.3, 0.3), shortsMat)
      hips.position.set(0, 1.0, 0); hips.castShadow = true
      avatarHolder.add(hips)

      // Arms — wrapped in shoulder Groups so they can swing
      const armGroups: THREE.Group[] = []
      for (const xSign of [-1, 1]) {
        const shoulderGroup = new THREE.Group()
        shoulderGroup.position.set(xSign * 0.32, 1.6, 0)
        const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 8), skin)
        upperArm.position.set(0, -0.18, 0); upperArm.castShadow = true
        shoulderGroup.add(upperArm)
        const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.28, 4, 8), skin)
        forearm.position.set(0, -0.5, 0); forearm.castShadow = true
        shoulderGroup.add(forearm)
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), skin)
        hand.position.set(0, -0.72, 0); hand.castShadow = true
        shoulderGroup.add(hand)
        avatarHolder.add(shoulderGroup)
        armGroups.push(shoulderGroup)
      }

      // Legs — wrapped in hip Groups so they can swing
      const legGroups: THREE.Group[] = []
      for (const xSign of [-1, 1]) {
        const hipGroup = new THREE.Group()
        hipGroup.position.set(xSign * 0.12, 1.0, 0)
        const upperLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.36, 4, 8), skin)
        upperLeg.position.set(0, -0.32, 0); upperLeg.castShadow = true
        hipGroup.add(upperLeg)
        const lowerLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.36, 4, 8), skin)
        lowerLeg.position.set(0, -0.76, 0); lowerLeg.castShadow = true
        hipGroup.add(lowerLeg)
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.32), sneakerMat)
        shoe.position.set(0, -0.96, 0.04); shoe.castShadow = true
        hipGroup.add(shoe)
        avatarHolder.add(hipGroup)
        legGroups.push(hipGroup)
      }

      // Expose limbs to the animate loop for walk-cycle animation
      ;(avatarHolder.userData as any).limbs = {
        legL: legGroups[0], legR: legGroups[1],
        armL: armGroups[0], armR: armGroups[1],
        head, hair, torso, hips,
      }
    }

    // Initial avatar build from saved character
    buildAvatar(getStoredCharacter())

    // Phase 16.28 — listen for character-updated events fired by
    // CharacterDesigner.saveCharacter(). Lets users design + save in another
    // tab (or the designer modal) and see the gallery3d avatar swap live.
    const onCharacterUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as CharacterConfig | undefined
      if (detail) buildAvatar(detail)
      else buildAvatar(getStoredCharacter())
    }
    window.addEventListener('character-updated', onCharacterUpdated)
    // Cross-tab updates via storage event
    const onStorageChange = (e: StorageEvent) => {
      if (e.key === 'soundchain_character') buildAvatar(getStoredCharacter())
    }
    window.addEventListener('storage', onStorageChange)

    // ─── Movement ────────────────────────────────────────────
    const keys: Record<string, boolean> = {}
    // Ignore key events when a form field is focused — fixes city search input
    // that couldn't accept typing because WASD was triggering movement instead
    // of letting characters land in the input.
    const isTypingInForm = (target: EventTarget | null) => {
      if (!target || !(target as HTMLElement).tagName) return false
      const tag = (target as HTMLElement).tagName
      const editable = (target as HTMLElement).isContentEditable
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInForm(e.target)) return
      keys[e.key.toLowerCase()] = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (isTypingInForm(e.target)) return
      keys[e.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // ─── 360° Camera Yaw — mouse/touch drag rotates the view ──
    // Phase 16.21 — Frank wants "full panoramic view 360". Drag horizontally
    // on the canvas to rotate the camera around the character. Vertical drag
    // tilts (pitch) within sensible bounds. Works on desktop + touch.
    let cameraYaw = 0  // radians around Y axis
    let cameraPitch = 0.05  // small upward tilt by default
    let dragging = false
    let lastX = 0, lastY = 0
    const onPointerDown = (e: PointerEvent) => {
      // Only start drag on the canvas itself, not HUD elements above it
      if (e.target !== renderer.domElement) return
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      try { renderer.domElement.setPointerCapture(e.pointerId) } catch {}
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      cameraYaw -= dx * 0.008
      cameraPitch = Math.max(-0.3, Math.min(0.6, cameraPitch + dy * 0.005))
    }
    const onPointerUp = (e: PointerEvent) => {
      dragging = false
      try { renderer.domElement.releasePointerCapture(e.pointerId) } catch {}
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

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

    // Track gamepad A-button "fired" edge so holding doesn't auto-spam shots
    const ballState_aHeld = { fired: false }

    // Phase 16.39 — NBA2K-style move state machine.
    // While a move is active, it OWNS player position/rotation (WASD is gated
    // off below). Each move ticks dt forward from t=0 until duration, then
    // releases the player back to normal control.
    type MoveKind = 'crossover' | 'spin' | 'pumpFake' | 'jabStep'
    const moveState = {
      type: null as null | MoveKind,
      t: 0,
      duration: 0,
      startX: 0, startZ: 0, startY: 0, startRotY: 0,
      facingX: 0, facingZ: 0,
      sideX: 0, sideZ: 0,
      crossDir: 1,
    }
    const triggerMove = (type: MoveKind) => {
      if (moveState.type) return
      const ballRef = (scene.userData as any).ball
      // Don't allow moves while a shot is in flight or mid-jump
      const jumpState = (scene.userData as any).jumpState
      if (jumpState?.active) return
      if (ballRef && !ballRef.ballState.held) return
      const rot = playerGroup.rotation.y
      moveState.type = type
      moveState.t = 0
      moveState.startX = playerGroup.position.x
      moveState.startZ = playerGroup.position.z
      moveState.startY = playerGroup.position.y
      moveState.startRotY = rot
      moveState.facingX = Math.sin(rot)
      moveState.facingZ = Math.cos(rot)
      moveState.sideX = Math.cos(rot)
      moveState.sideZ = -Math.sin(rot)
      if (type === 'crossover') {
        moveState.duration = 0.4
        moveState.crossDir = Math.random() < 0.5 ? -1 : 1
      } else if (type === 'spin') {
        moveState.duration = 0.55
      } else if (type === 'pumpFake') {
        moveState.duration = 0.35
      } else if (type === 'jabStep') {
        moveState.duration = 0.28
      }
      // Phase 16.41 — play matching XBot body clip if rigged avatar is loaded
      const xb2 = (avatarHolder.userData as any).xbot
      if (xb2?.play) {
        if (type === 'crossover') xb2.play('crossover', 400)
        else if (type === 'pumpFake') xb2.play('pumpFake', 350)
        else if (type === 'jabStep') xb2.play('jabStep', 280)
        // 'spin' uses playerGroup.rotation.y so no clip needed
      }
    }
    ;(scene.userData as any).triggerMove = triggerMove

    // ─── Animation Loop ──────────────────────────────────────
    // Phase 16.24 — SPEED is now in units PER SECOND, not per-frame. Frame-rate
    // independent movement so character walks the same pace at 60fps (empty
    // room) vs 15fps (city theme with all the brick textures, billboards,
    // streetlamps, and basketball court grinding GPU). Old SPEED 0.18/frame
    // at 60fps = 10.8 u/sec — match that as the baseline, bump slightly for
    // a snappier feel since the gallery is large.
    // Phase 16.39 — sports courts get NBA2K-like sprint feel; bounds stay
    // inside the court geometry so dunks register and player can't run off.
    const SPEED = theme === 'city' ? 18 : (theme === 'gym' || theme === 'blacktop') ? 14 : 12
    const PLAYER_BOUNDS = theme === 'city' ? 95 : theme === 'gym' ? 14 : theme === 'blacktop' ? 8 : 19
    let lastFrame = performance.now()
    let frameCount = 0
    let fpsLastUpdate = lastFrame
    let rafId = 0

    const animate = () => {
      rafId = requestAnimationFrame(animate)
      const now = performance.now()
      const dtSec = Math.min(0.1, (now - lastFrame) / 1000)  // clamp 100ms to avoid huge jumps after tab-switch
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
      // Phase 16.24 — input is now CAMERA-RELATIVE: W = forward in the
      // direction the camera is looking (not world -Z). Press W with camera
      // facing east, character walks east. Matches NBA2K/GTA player feel.
      const rawX = (right - left) + gpX
      const rawZ = -(fwd - back) + gpY
      const mag = Math.min(1, Math.hypot(rawX, rawZ))
      let dirX = 0, dirZ = 0
      if (mag > 0.001) {
        const norm = Math.hypot(rawX, rawZ)
        // Local stick direction (in screen/camera space)
        const localX = rawX / norm
        const localZ = rawZ / norm
        // Rotate by camera yaw to convert to world space
        const cosY = Math.cos(cameraYaw)
        const sinY = Math.sin(cameraYaw)
        dirX = localX * cosY + localZ * sinY
        dirZ = -localX * sinY + localZ * cosY
      }
      // Phase 16.39 — Move tick. If a NBA2K-style move is active, it OWNS
      // position/rotation for its duration; WASD is gated below.
      if (moveState.type) {
        moveState.t += dtSec
        const u = Math.min(1, moveState.t / moveState.duration)
        if (moveState.type === 'crossover') {
          const lateral = Math.sin(u * Math.PI) * 1.5 * moveState.crossDir
          playerGroup.position.x = moveState.startX + moveState.sideX * lateral
          playerGroup.position.z = moveState.startZ + moveState.sideZ * lateral
        } else if (moveState.type === 'spin') {
          playerGroup.rotation.y = moveState.startRotY + u * Math.PI * 2
          const fwd = u * 1.4
          playerGroup.position.x = moveState.startX + moveState.facingX * fwd
          playerGroup.position.z = moveState.startZ + moveState.facingZ * fwd
        } else if (moveState.type === 'pumpFake') {
          const bounce = Math.sin(u * Math.PI) * 0.22
          playerGroup.position.y = moveState.startY + bounce
        } else if (moveState.type === 'jabStep') {
          const fwd = Math.sin(u * Math.PI) * 0.5
          playerGroup.position.x = moveState.startX + moveState.facingX * fwd
          playerGroup.position.z = moveState.startZ + moveState.facingZ * fwd
        }
        if (u >= 1) {
          if (moveState.type === 'pumpFake') playerGroup.position.y = moveState.startY
          if (moveState.type === 'spin') playerGroup.rotation.y = moveState.startRotY
          if (moveState.type === 'crossover' || moveState.type === 'jabStep') {
            playerGroup.position.x = moveState.startX
            playerGroup.position.z = moveState.startZ
          }
          moveState.type = null
        }
        playerGroup.position.x = Math.max(-PLAYER_BOUNDS, Math.min(PLAYER_BOUNDS, playerGroup.position.x))
        playerGroup.position.z = Math.max(-PLAYER_BOUNDS, Math.min(PLAYER_BOUNDS, playerGroup.position.z))
      } else {
        // Normal WASD/gamepad movement (only when no move is active)
        playerGroup.position.x += dirX * SPEED * mag * dtSec
        playerGroup.position.z += dirZ * SPEED * mag * dtSec
        playerGroup.position.x = Math.max(-PLAYER_BOUNDS, Math.min(PLAYER_BOUNDS, playerGroup.position.x))
        playerGroup.position.z = Math.max(-PLAYER_BOUNDS, Math.min(PLAYER_BOUNDS, playerGroup.position.z))
        if (mag > 0.05) {
          playerGroup.rotation.y = Math.atan2(dirX, -dirZ)
        }
      }

      // Phase 16.40 — XBot AnimationMixer tick + clip cross-fade by speed.
      // Rigged avatar handles walk/run/idle natively; primitive limb swing
      // (below) only runs as fallback when the XBot fetch failed.
      const xbot = (avatarHolder.userData as any).xbot as {
        mixer: THREE.AnimationMixer
        clips: Record<string, THREE.AnimationAction>
        currentClip: string
        moveLockUntil: number
        defenseHeld: boolean
        play: (clipName: string, durationMs: number) => void
      } | null
      // Phase 16.44 — fan animation tick. Idle fans sway gently in place;
      // excited fans jump up + tilt slightly. InstancedMesh matrix update
      // per fan is cheap (just a Matrix4.compose). Total work: ~112 fans
      // × small compose = sub-1ms even on Sarg.
      const crowd = (scene.userData as any).crowd
      if (crowd && crowd.fanArray) {
        const t = now / 1000  // seconds for sin period
        const axisX = crowd.axisX as THREE.Vector3
        for (let i = 0; i < crowd.fanArray.length; i++) {
          const f = crowd.fanArray[i]
          const excited = now < f.excitedUntil
          // Idle sway: gentle ~0.025u oscillation. Excited jump: |sin| up
          // to 0.42u with phase-offset so the crowd doesn't move in lockstep.
          const idleSway = Math.sin(t * 2.4 + f.phase) * 0.025
          const excitedJump = excited
            ? Math.abs(Math.sin((now - (f.excitedUntil - 1500)) * 0.008 + f.phase)) * 0.42
            : 0
          const targetY = idleSway + excitedJump
          f.jumpY = f.jumpY * 0.78 + targetY * 0.22
          const targetTilt = excited ? -0.18 + Math.sin(t * 8 + f.phase) * 0.06 : 0
          f.tilt = f.tilt * 0.85 + targetTilt * 0.15
          // Torso
          crowd.fanPos.set(f.baseX, f.baseY + f.jumpY, f.baseZ)
          crowd.fanQuat.setFromAxisAngle(axisX, f.tilt)
          crowd.fanMtx.compose(crowd.fanPos, crowd.fanQuat, crowd.fanScale)
          crowd.torsoMesh.setMatrixAt(i, crowd.fanMtx)
          // Head — sits above torso, tilts slightly more for life
          crowd.fanPos.set(f.baseX, f.baseY + 0.45 + f.jumpY, f.baseZ)
          crowd.fanQuat.setFromAxisAngle(axisX, f.tilt * 1.4)
          crowd.fanMtx.compose(crowd.fanPos, crowd.fanQuat, crowd.fanScale)
          crowd.headMesh.setMatrixAt(i, crowd.fanMtx)
        }
        crowd.torsoMesh.instanceMatrix.needsUpdate = true
        crowd.headMesh.instanceMatrix.needsUpdate = true
      }

      if (xbot?.mixer) {
        xbot.mixer.update(dtSec)
        // Phase 16.43 — ambient DRIBBLE cycle while ball is held + player
        // not airborne. ~0.55s cadence (typical pro dribble rate). Cuts
        // out during shooting moves so the audio doesn't compete with
        // the shot mechanic. Also fires the ball-bounce visual at the
        // same cadence so the ball reads as actively dribbled, not just
        // floating in the hand.
        const ballRef = (scene.userData as any).ball
        const jumpRef = (scene.userData as any).jumpState
        if (ballRef?.ballState?.held && !jumpRef?.active && now > xbot.moveLockUntil) {
          const dribbleState = (scene.userData as any).dribbleState || { t: 0 }
          ;(scene.userData as any).dribbleState = dribbleState
          dribbleState.t += dtSec
          // Visual bounce — ball oscillates between hip-height and floor-low
          // following |sin|. SFX fires once per period at the floor contact.
          const period = 0.55
          const phase = (dribbleState.t % period) / period
          const bounce = (1 - Math.abs(Math.sin(phase * Math.PI))) * 0.85  // 0.0 (floor) → 0.85 (hip)
          if (ballRef.ball) {
            const pg = (scene.userData as any).playerGroupRef
            // Ball lives in player's right-hand dribble zone: offset forward
            // + slightly to the right of player's facing direction.
            if (pg && ballRef.ball.position.y < 2.0 && ballRef.ball.position.y > -0.3) {
              const fwd = pg.rotation.y
              const offFwd = 0.45
              const offSide = 0.30
              ballRef.ball.position.x = pg.position.x + Math.sin(fwd) * offFwd + Math.cos(fwd) * offSide
              ballRef.ball.position.z = pg.position.z + Math.cos(fwd) * offFwd - Math.sin(fwd) * offSide
              ballRef.ball.position.y = pg.position.y + 0.2 + bounce
              ballRef.ball.rotation.x += dtSec * 6.0  // spinning while dribbled
            }
          }
          if (dribbleState.t >= period) {
            playDribble()
            dribbleState.t = dribbleState.t % period
          }
        } else if ((scene.userData as any).dribbleState) {
          ;(scene.userData as any).dribbleState.t = 0
        }
        // Only auto-switch locomotion when no move clip is locking the avatar.
        if (now > xbot.moveLockUntil) {
          const speed = Math.hypot(dirX, dirZ) * mag
          // Resolve clip name from any of several common Mixamo naming
          // variants (Walking/Walk, Running/Run, Sitting/Squat, etc.)
          const resolve = (...keys: string[]) => {
            for (const k of keys) if (xbot.clips[k]) return k
            return null
          }
          let wantClip: string | null = 'idle'
          if (xbot.defenseHeld) {
            wantClip = resolve('sitting', 'standing', 'idle')
          } else if (speed > 0.6) {
            wantClip = resolve('running', 'run', 'walking', 'walk', 'idle')
          } else if (speed > 0.1) {
            wantClip = resolve('walking', 'walk', 'running', 'run', 'idle')
          } else {
            wantClip = resolve('idle')
          }
          if (wantClip && wantClip !== xbot.currentClip) {
            const from = xbot.clips[xbot.currentClip]
            const to = xbot.clips[wantClip]
            if (to) {
              to.reset().fadeIn(0.2).play()
              if (from) from.fadeOut(0.2)
              xbot.currentClip = wantClip
            }
          }
        }
      }

      // Phase 16.39 — Walk-cycle animation (primitive humanoid fallback only).
      const limbs = (avatarHolder.userData as any).limbs as {
        legL: THREE.Group; legR: THREE.Group; armL: THREE.Group; armR: THREE.Group;
        torso: THREE.Mesh; head: THREE.Mesh; hair: THREE.Mesh; hips: THREE.Mesh;
      } | undefined
      if (limbs) {
        const moving = mag > 0.1
        if (moving) {
          const phase = now * 0.014
          const swing = Math.sin(phase) * 0.55
          limbs.legL.rotation.x = swing
          limbs.legR.rotation.x = -swing
          limbs.armL.rotation.x = -swing * 0.7
          limbs.armR.rotation.x = swing * 0.7
          avatarHolder.position.y = Math.abs(Math.cos(phase)) * 0.05
        } else {
          // Idle: ease limbs back to neutral
          limbs.legL.rotation.x *= 0.85
          limbs.legR.rotation.x *= 0.85
          limbs.armL.rotation.x *= 0.85
          limbs.armR.rotation.x *= 0.85
          avatarHolder.position.y *= 0.85
        }
      }

      // Phase 16.27 + 16.35 — basketball follow + physics + jump animation
      const ballRef = (scene.userData as any).ball
      if (ballRef) {
        const { ball, ballState } = ballRef
        // NBA2K jump-shot animation tick
        const updateJump = (scene.userData as any).updateJump
        if (updateJump) updateJump(dtSec)

        if (ballState.held) {
          // Ball hovers in front of character at hand height (follows jump)
          const handOffset = new THREE.Vector3(
            Math.sin(playerGroup.rotation.y) * 0.6,
            1.3 + Math.sin(now * 0.012) * 0.18,  // bounce visual
            Math.cos(playerGroup.rotation.y) * 0.6,
          )
          ball.position.copy(playerGroup.position).add(handOffset)
          // Phase 16.39 — Dribble SFX: every ~0.42s when moving with ball held
          const moving = Math.hypot(rawX, rawZ) > 0.1
          if (moving) {
            if (!(ballRef as any).lastDribble) (ballRef as any).lastDribble = 0
            ;(ballRef as any).lastDribble += dtSec
            if ((ballRef as any).lastDribble > 0.42) {
              playDribble()
              ;(ballRef as any).lastDribble = 0
            }
          } else {
            ;(ballRef as any).lastDribble = 0
          }
        } else {
          // Physics tick (gravity + velocity integration + score detection)
          ;(scene.userData as any).gravity(dtSec)
        }
        // Spin the ball based on velocity for visual juice
        ball.rotation.x += ballState.vel.z * dtSec * 4
        ball.rotation.z -= ballState.vel.x * dtSec * 4
      }

      // Phase 16.39 — Sneaker squeak on hard direction changes (gym floor only)
      if (theme === 'gym') {
        if (!(scene.userData as any).lastDir) (scene.userData as any).lastDir = { x: 0, z: 0 }
        const lastDir = (scene.userData as any).lastDir as { x: number; z: number }
        const dirMag = Math.hypot(dirX, dirZ)
        const prevMag = Math.hypot(lastDir.x, lastDir.z)
        if (dirMag > 0.5 && prevMag > 0.5) {
          const dot = (lastDir.x * dirX + lastDir.z * dirZ) / (dirMag * prevMag)
          if (dot < 0.3) {  // angle change > ~70°
            if (!(scene.userData as any).lastSqueak || now - (scene.userData as any).lastSqueak > 220) {
              playSqueak()
              ;(scene.userData as any).lastSqueak = now
            }
          }
        }
        lastDir.x = dirX
        lastDir.z = dirZ
      }

      // Keyboard shoot: B key triggers shot (also gamepad A button below)
      if (keys['b'] && shootRef.current) {
        keys['b'] = false  // single-fire
        shootRef.current()
      }
      // Phase 16.39 — NBA2K move keys: C=crossover, V=spin, P=pump-fake, J=jab-step
      if (keys['c']) { keys['c'] = false; triggerMove('crossover') }
      if (keys['v']) { keys['v'] = false; triggerMove('spin') }
      if (keys['p']) { keys['p'] = false; triggerMove('pumpFake') }
      if (keys['j']) { keys['j'] = false; triggerMove('jabStep') }
      // R = recall ball to hand (emergency rescue if ball is lost)
      if (keys['r']) {
        keys['r'] = false
        const ballRef2 = (scene.userData as any).ball
        if (ballRef2) {
          ballRef2.ballState.held = true
          ballRef2.ballState.vel.set(0, 0, 0)
          ballRef2.ballState.scoredThisShot = false
          ballRef2.ballState.airborneFrames = 0
          ballRef2.ballState.returnTimer = 0
          ;(ballRef2.ballState as any).airTime = 0
          ;(ballRef2.ballState as any).rimHitThisShot = false
          ;(ballRef2.ballState as any).bbHitThisShot = false
        }
      }
      // Phase 16.41 — full 2K move keys (XBot rigged-avatar only):
      // F = fadeaway shot, X = rebound grab, Z = block, T = pass
      // G held = defensive stance
      const xbotRef = (avatarHolder.userData as any).xbot
      if (keys['f']) {
        // shootRef reads keys['f'] internally to detect fadeaway — clear AFTER
        if (shootRef.current) shootRef.current()
        keys['f'] = false
      }
      if (keys['x']) {
        keys['x'] = false
        if (xbotRef?.play) xbotRef.play('rebound', 800)
        // Add a quick vertical leap so the rebound visibly jumps
        const pg = (scene.userData as any).playerGroupRef
        const js = (scene.userData as any).jumpState
        if (pg && js && !js.active) {
          js.active = true
          js.t = 0
          js.baseY = pg.position.y
          js.duration = 0.7
          js.peakY = 1.6
          js.ballRelease = 99  // never releases the ball during a rebound
          js.isDunk = false
          ;(js as any).pendingShot = null
        }
      }
      if (keys['z']) {
        keys['z'] = false
        if (xbotRef?.play) xbotRef.play('block', 700)
        const pg = (scene.userData as any).playerGroupRef
        const js = (scene.userData as any).jumpState
        if (pg && js && !js.active) {
          js.active = true
          js.t = 0
          js.baseY = pg.position.y
          js.duration = 0.6
          js.peakY = 1.4
          js.ballRelease = 99
          js.isDunk = false
          ;(js as any).pendingShot = null
        }
      }
      if (keys['t']) {
        keys['t'] = false
        if (xbotRef?.play) xbotRef.play('pass', 500)
      }
      // Defense is hold-to-engage so we read keys['g'] every frame
      if (xbotRef) {
        const wantsDefense = !!keys['g']
        if (wantsDefense !== xbotRef.defenseHeld) {
          xbotRef.defenseHeld = wantsDefense
        }
      }
      // Gamepad A button (button 0) — also triggers shot
      try {
        const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : []
        for (const p of pads) {
          if (p && p.buttons[0]?.pressed) {
            if (shootRef.current && !ballState_aHeld.fired) {
              shootRef.current()
              ballState_aHeld.fired = true
            }
            break
          } else if (p) {
            ballState_aHeld.fired = false
          }
        }
      } catch {}

      // Camera follow — Phase 16.21 — orbits character based on yaw/pitch.
      // Drag the canvas to look around 360°; character moves relative to
      // camera direction so WASD always feels intuitive from the user's view.
      const camDist = 6
      const camHeight = 3 + Math.sin(cameraPitch) * 4
      const offsetX = Math.sin(cameraYaw) * camDist
      const offsetZ = Math.cos(cameraYaw) * camDist
      const camTarget = new THREE.Vector3(
        playerGroup.position.x + offsetX,
        playerGroup.position.y + camHeight,
        playerGroup.position.z + offsetZ,
      )
      camera.position.lerp(camTarget, 0.15)
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
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('character-updated', onCharacterUpdated)
      window.removeEventListener('storage', onStorageChange)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
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

  // Phase 16.26 + 16.35 — repaint location sign + force horizon rebuild
  // when cityLocation changes so different searched cities actually look
  // different (different building palette/density/heights/window colors).
  useEffect(() => {
    cityLocationRef.current = cityLocation
    const scene = sceneRef.current
    if (!scene) return
    const ls = (scene.userData as any).locSign as { paint: (l: any) => void; texture: THREE.CanvasTexture } | undefined
    if (ls) {
      ls.paint(cityLocation)
      ls.texture.needsUpdate = true
    }
    // For now, bump the scene-rebuild trigger via toggling loading. Heavy
    // but reliable — different cities now produce different horizons.
    if (cityLocation) {
      setLoading(true)
      const t = setTimeout(() => setLoading(false), 100)
      return () => clearTimeout(t)
    }
  }, [cityLocation])

  return (
    <div className="relative w-full h-full" tabIndex={0} onFocus={() => containerRef.current?.focus()}>
      <div ref={containerRef} className="absolute inset-0" tabIndex={0} style={{ cursor: 'grab', outline: 'none' }} onClick={() => containerRef.current?.focus()} />

      {/* Phase 16.41 — mobile action grid for full NBA2K move-set. Each
          button dispatches the matching keyboard event so the same animate-
          loop handlers fire on touch + keyboard alike. Hold-to-engage on
          DEFENSE: keydown on pointerDown, keyup on pointerUp/Leave/Cancel. */}
      {(theme === 'gym' || theme === 'blacktop' || theme === 'city') && (() => {
        const tap = (k: string) => (e: React.PointerEvent) => {
          e.stopPropagation()
          window.dispatchEvent(new KeyboardEvent('keydown', { key: k }))
        }
        const press = (k: string, down: boolean) => (e: React.PointerEvent) => {
          e.stopPropagation()
          window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k }))
        }
        type Btn = { label: string; emoji: string; key: string; color: string }
        const moves: Btn[] = [
          { label: 'REB',  emoji: '⬆️', key: 'x', color: 'from-cyan-500/40 to-cyan-700/60 border-cyan-400/70' },
          { label: 'BLK',  emoji: '🛡️', key: 'z', color: 'from-cyan-500/40 to-cyan-700/60 border-cyan-400/70' },
          { label: 'PASS', emoji: '🤲', key: 't', color: 'from-emerald-500/40 to-emerald-700/60 border-emerald-400/70' },
          { label: 'FADE', emoji: '🎯', key: 'f', color: 'from-orange-500/40 to-orange-700/60 border-orange-400/70' },
          { label: 'X-O',  emoji: '🔄', key: 'c', color: 'from-purple-500/40 to-purple-700/60 border-purple-400/70' },
          { label: 'SPIN', emoji: '💫', key: 'v', color: 'from-purple-500/40 to-purple-700/60 border-purple-400/70' },
          { label: 'PMP',  emoji: '👆', key: 'p', color: 'from-purple-500/40 to-purple-700/60 border-purple-400/70' },
          { label: 'JAB',  emoji: '➡️', key: 'j', color: 'from-purple-500/40 to-purple-700/60 border-purple-400/70' },
        ]
        return (
          <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-1.5 sm:hidden pointer-events-auto">
            <div className="grid grid-cols-2 gap-1.5">
              {moves.map(m => (
                <button
                  key={m.key}
                  onPointerDown={tap(m.key)}
                  className={`w-12 h-12 rounded-lg bg-gradient-to-br ${m.color} backdrop-blur border-2 text-white text-[10px] font-mono font-bold active:scale-95 transition flex flex-col items-center justify-center gap-0.5 shadow-md`}
                  aria-label={m.label}
                >
                  <span className="text-base leading-none">{m.emoji}</span>
                  <span className="leading-none">{m.label}</span>
                </button>
              ))}
            </div>
            <button
              onPointerDown={press('g', true)}
              onPointerUp={press('g', false)}
              onPointerLeave={press('g', false)}
              onPointerCancel={press('g', false)}
              className="w-full h-9 rounded-lg bg-gradient-to-br from-red-500/40 to-red-700/60 backdrop-blur border-2 border-red-400/70 text-white text-[10px] font-mono font-bold active:scale-95 transition flex items-center justify-center gap-1 shadow-md"
              aria-label="Defensive stance (hold)"
            >
              🛡️ DEF (hold)
            </button>
          </div>
        )
      })()}

      {/* Mobile touch controls — D-pad overlay */}
      <div className="absolute bottom-16 left-3 z-10 sm:hidden flex flex-col items-center gap-1">
        <button onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }))} onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }))} className="w-10 h-10 rounded bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white text-lg active:bg-white/20">↑</button>
        <div className="flex gap-1">
          <button onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))} onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }))} className="w-10 h-10 rounded bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white text-lg active:bg-white/20">←</button>
          <button onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))} onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 's' }))} className="w-10 h-10 rounded bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white text-lg active:bg-white/20">↓</button>
          <button onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }))} onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }))} className="w-10 h-10 rounded bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white text-lg active:bg-white/20">→</button>
        </div>
      </div>

      {/* Phase 16.27 + 16.29 — basketball SHOOT button.
          Moved to LEFT side (above D-pad) so it doesn't collide with the
          global SC chrome pills (search / brain / Invite / Customize) on
          the right side. Big circular tap target visible on all devices. */}
      {(theme === 'city' || theme === 'gym' || theme === 'blacktop') && (
        <>
          <button
            onPointerDown={(e) => { e.stopPropagation(); shootRef.current?.() }}
            className="absolute bottom-40 left-3 sm:bottom-32 sm:left-5 z-30 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-500/40 to-orange-700/60 backdrop-blur border-2 border-orange-400/70 text-white text-2xl sm:text-3xl font-bold active:scale-95 active:from-orange-500/60 active:to-orange-700/80 transition shadow-[0_0_20px_rgba(234,88,12,0.5)] flex items-center justify-center pointer-events-auto"
            aria-label="Shoot basketball"
          >
            🏀
          </button>
          <button
            onPointerDown={(e) => {
              e.stopPropagation()
              const sc = sceneRef.current as any
              const ballRef = sc?.userData?.ball
              if (ballRef) {
                ballRef.ballState.held = true
                ballRef.ballState.vel.set(0, 0, 0)
                ballRef.ballState.returnTimer = 0
                ballRef.ballState.airborneFrames = 0
                ballRef.ballState.scoredThisShot = false
                ballRef.ballState.airTime = 0
                ballRef.ballState.bounces = 0
                ballRef.ballState.rimHitThisShot = false
                ballRef.ballState.bbHitThisShot = false
              }
            }}
            className="absolute bottom-24 left-3 sm:bottom-12 sm:left-5 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-cyan-500/40 to-cyan-700/60 backdrop-blur border-2 border-cyan-400/70 text-white text-lg sm:text-xl font-bold active:scale-95 transition shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center pointer-events-auto"
            aria-label="Recall ball to hand"
          >
            ↺
          </button>
        </>
      )}

      {/* Phase 16.33 — modal rendered via React PORTAL to document.body so
          it's outside any parent CSS / event-delegation context. No ancestor
          can intercept keystrokes or pointer events. Click-outside-to-close
          REMOVED — × button is the only close trigger now (was causing event
          handling races on Chrome that prevented input from getting focus). */}
      {citySearchOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-4"
        >
          <div
            className="w-full max-w-md bg-[#0a0a0a] border-2 border-yellow-500/40 rounded-xl shadow-2xl shadow-yellow-500/20 overflow-hidden mt-12 sm:mt-0"
          >
            <div className="px-4 py-3 border-b border-yellow-500/20 flex items-center justify-between">
              <div className="font-mono text-sm text-yellow-300 font-bold">🌍 SEARCH CITY / STREET</div>
              <button
                type="button"
                onClick={() => setCitySearchOpen(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none px-3 py-1"
              >×</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const q = citySearchValue.trim()
                if (!q || citySearchLoading) return
                setCitySearchLoading(true)
                try {
                  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, {
                    headers: { 'Accept': 'application/json' },
                  })
                  const data = await res.json()
                  if (Array.isArray(data) && data[0]) {
                    const loc = {
                      label: data[0].display_name.split(',').slice(0, 3).join(',').trim(),
                      lat: parseFloat(data[0].lat),
                      lng: parseFloat(data[0].lon),
                    }
                    setCityLocation(loc)
                    cityLocationRef.current = loc
                    toast.success(`📍 ${loc.label}`)
                    setCitySearchOpen(false)
                    setCitySearchValue('')
                  } else {
                    toast.info('Address not found')
                  }
                } catch (err: any) {
                  toast.error(`Search failed: ${err?.message || 'network error'}`)
                } finally {
                  setCitySearchLoading(false)
                }
              }}
              className="p-4 space-y-3"
            >
              {/* Tap-to-focus label so iOS users have a clear interaction target */}
              <label className="block">
                <span className="text-[10px] font-mono text-yellow-500/70 uppercase tracking-wider block mb-1">Tap below to type</span>
                <input
                  ref={citySearchInputRef}
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  tabIndex={0}
                  value={citySearchValue}
                  onChange={(e) => setCitySearchValue(e.target.value)}
                  onFocus={(e) => e.currentTarget.scrollIntoView?.({ block: 'center', behavior: 'smooth' })}
                  placeholder="e.g. Times Square Manhattan"
                  // font-size: 16px is critical on iOS Safari — anything smaller
                  // triggers auto-zoom + can prevent keyboard from showing.
                  style={{ fontSize: '16px', WebkitAppearance: 'none', WebkitUserSelect: 'text', userSelect: 'text' }}
                  className="w-full bg-black border-2 border-yellow-500/40 rounded-lg px-4 py-4 font-mono text-yellow-100 placeholder:text-yellow-500/30 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-500/30"
                />
              </label>
              <div className="text-[11px] font-mono text-yellow-500/60 px-1 leading-relaxed">
                Try tapping one to fill the field:
                <div className="flex flex-wrap gap-1 mt-1">
                  {['Times Square Manhattan', 'Shibuya Crossing Tokyo', 'Sunset Blvd LA', 'Brooklyn', 'Downtown Miami'].map((q) => (
                    <button key={q} type="button" onClick={() => {
                      setCitySearchValue(q)
                      citySearchInputRef.current?.focus()
                    }} className="px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={!citySearchValue.trim() || citySearchLoading}
                className="w-full py-3 rounded-lg bg-gradient-to-br from-yellow-500/30 to-orange-500/40 border-2 border-yellow-500/50 text-yellow-200 text-base font-mono font-bold hover:from-yellow-500/40 hover:to-orange-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {citySearchLoading ? '🔍 SEARCHING…' : '🚀 TELEPORT HERE'}
              </button>
            </form>
          </div>
        </div>,
        document.body,
      )}

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
        {/* Phase 16.26 — current city location HUD badge (set by search) */}
        {theme === 'city' && cityLocation && (
          <div className="px-2 py-1 rounded bg-yellow-500/15 backdrop-blur border border-yellow-500/40 text-[9px] font-mono text-yellow-300 max-w-[60vw] truncate">
            📍 {cityLocation.label}
          </div>
        )}
        {/* Phase 16.27 — basketball score HUD (city theme only) */}
        {theme === 'city' && (
          <div className="px-2 py-1 rounded bg-orange-500/15 backdrop-blur border border-orange-500/40 text-[10px] font-mono text-orange-300 flex items-center gap-2">
            🏀 <span className="font-bold">{hoopScore.makes}</span>/<span>{hoopScore.attempts}</span>
            {hoopScore.streak >= 3 && <span className="ml-1 text-yellow-300">🔥 {hoopScore.streak}</span>}
          </div>
        )}
        {/* Phase 16.29 — city search is now a TAP-TO-OPEN MODAL.
            Inline-input approach kept getting blocked by canvas z-index +
            pointer-event quirks on mobile Safari. Modal sidesteps it. */}
        {theme === 'city' && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setCitySearchOpen(true) }}
            className="pointer-events-auto px-3 py-1.5 rounded bg-yellow-500/15 backdrop-blur border border-yellow-500/40 text-[11px] font-mono text-yellow-300 hover:bg-yellow-500/25 flex items-center gap-1.5"
          >
            🌍 SEARCH CITY / STREET
          </button>
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
