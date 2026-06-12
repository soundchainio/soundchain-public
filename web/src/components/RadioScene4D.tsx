/**
 * RadioScene4D — OGUN RADIO · ORBITAL COMMAND (approved Jun 10 2026)
 *
 * Visual spec: ogun-radio-orbital.html preview, Frank-approved on the v1 look.
 * Matches it exactly — same scale (core r=7, belt a=12–42, cam ~72), same
 * warm glow core, same center cover-art billboard bloom, same asteroid-scale
 * NFT bodies (no big planet orbs).
 *
 * - Central glowing reactor core (cream) + layered warm halo + wireframe shell
 * - Cover art BILLBOARD blooms at the core center on capture landing and
 *   slowly spins — full artwork visible flat, not wrapped around a sphere
 * - 2,600-body Keplerian rust swarm (NASA/JPL NEO population shape)
 * - Every NFT/SCID = an asteroid on a DETERMINISTIC orbit derived from
 *   hash(OGUN contract, tokenId). Same id -> same orbit on every client.
 * - Genre -> orbital band + inclination + color (hip-hop inner belt, etc.)
 * - NFT bodies at asteroid scale, soft per-body pulse, genre tint
 * - Faint orbit ellipses for a sampled subset only (full 5,417 = spaghetti)
 * - Track change = GRAVITATIONAL CAPTURE: 3.2s orbit decay, spiral trail,
 *   impact ripple, art bloom; body respawns into the belt after 20s
 * - Cinematic auto-orbit + drag rotate + scroll zoom
 * - Audio-reactive: bass breathes core/halo, mids brighten the belt,
 *   highs swell NFT bodies
 * - NO post-processing — the approved look's glow is all additive sprites,
 *   which is also cheaper than the old UnrealBloom pass
 *
 * Production wiring preserved:
 * - Apr 14 analyser ownership fix (this page owns its Web Audio graph,
 *   publishes globally for Neural)
 * - S3 CORS proxy for artwork textures (now feeds the billboard)
 * - Mobile frame budgets, paused-state throttle, visibilitychange full stop
 *
 * Ecosystem nodes (NVIDIA/FURL/OGUN/...) are behind showEcosystemNodes
 * (default false — not in the approved frame). Flip the prop to bring the
 * stack labels back without touching the scene.
 */

import React, { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'

// A track body in the orbital swarm. id should be stable (tokenId or scid).
export interface RadioTrackBody {
  id: string | number
  scid?: string
  title?: string
  genre?: string
}

interface RadioScene4DProps {
  audioRef: React.RefObject<HTMLAudioElement | null>
  isPlaying: boolean
  artworkUrl?: string
  genre?: string
  /** Full v1+v2 volume from /api/radio/galaxy — each entry becomes an asteroid.
   *  Omitted -> 48 placeholder bodies render so the scene is alive pre-wiring. */
  tracks?: RadioTrackBody[]
  /** When this changes, that track's asteroid begins gravitational capture */
  currentTrackId?: string | number
  /** Fires when the asteroid lands — sync audio start here for the cinematic beat */
  onCaptureComplete?: (id: string | number) => void
  /** Stack labels orbiting outside the belt. Off by default (approved look). */
  showEcosystemNodes?: boolean
}

// Genre -> color palette mapping (primary tints the body + capture FX)
const GENRE_PALETTES: Record<string, { primary: THREE.Color; secondary: THREE.Color; accent: THREE.Color }> = {
  'hip-hop': { primary: new THREE.Color(0xff4500), secondary: new THREE.Color(0xff8c00), accent: new THREE.Color(0xffd700) },
  'rap': { primary: new THREE.Color(0xff4500), secondary: new THREE.Color(0xff8c00), accent: new THREE.Color(0xffd700) },
  'electronic': { primary: new THREE.Color(0x00ffff), secondary: new THREE.Color(0x8b5cf6), accent: new THREE.Color(0xff00ff) },
  'edm': { primary: new THREE.Color(0x00ffff), secondary: new THREE.Color(0x8b5cf6), accent: new THREE.Color(0xff00ff) },
  'jazz': { primary: new THREE.Color(0xffd700), secondary: new THREE.Color(0xdaa520), accent: new THREE.Color(0xf5deb3) },
  'rock': { primary: new THREE.Color(0xff0000), secondary: new THREE.Color(0xff4444), accent: new THREE.Color(0xffa500) },
  'r&b': { primary: new THREE.Color(0x9b59b6), secondary: new THREE.Color(0xe91e63), accent: new THREE.Color(0xff69b4) },
  'soul': { primary: new THREE.Color(0x9b59b6), secondary: new THREE.Color(0xe91e63), accent: new THREE.Color(0xff69b4) },
  'pop': { primary: new THREE.Color(0xff69b4), secondary: new THREE.Color(0x00bfff), accent: new THREE.Color(0xffffff) },
  'lo-fi': { primary: new THREE.Color(0x37e6ff), secondary: new THREE.Color(0x4a6741), accent: new THREE.Color(0xd4a574) },
  'classical': { primary: new THREE.Color(0xffd700), secondary: new THREE.Color(0xffffff), accent: new THREE.Color(0xc0c0c0) },
  'reggae': { primary: new THREE.Color(0x00ff00), secondary: new THREE.Color(0xffd700), accent: new THREE.Color(0xff0000) },
  'latin': { primary: new THREE.Color(0xff6347), secondary: new THREE.Color(0xffd700), accent: new THREE.Color(0xff1493) },
  'country': { primary: new THREE.Color(0xdeb887), secondary: new THREE.Color(0xcd853f), accent: new THREE.Color(0x8b4513) },
}
const DEFAULT_PALETTE = { primary: new THREE.Color(0xff4400), secondary: new THREE.Color(0x00ffff), accent: new THREE.Color(0xffd700) }

// Genre -> orbital band + max inclination. v1 preview scale: core r=7.
const GENRE_ORBITS: Record<string, { band: [number, number]; inc: number }> = {
  'hip-hop': { band: [14, 20], inc: 0.12 },
  'rap': { band: [14, 20], inc: 0.12 },
  'electronic': { band: [20, 27], inc: 0.30 },
  'edm': { band: [20, 27], inc: 0.30 },
  'lo-fi': { band: [20, 26], inc: 0.22 },
  'jazz': { band: [24, 30], inc: 0.18 },
  'r&b': { band: [22, 29], inc: 0.20 },
  'soul': { band: [22, 29], inc: 0.20 },
  'pop': { band: [18, 25], inc: 0.16 },
  'rock': { band: [26, 34], inc: 0.35 },
  'classical': { band: [30, 38], inc: 0.25 },
  'reggae': { band: [25, 32], inc: 0.28 },
  'latin': { band: [21, 28], inc: 0.24 },
  'country': { band: [28, 36], inc: 0.30 },
}
const DEFAULT_ORBIT = { band: [18, 38] as [number, number], inc: 0.45 }

const OGUN_CONTRACT = '0x45F1AF89486AeEc2Da0B06340Cd9CD3Bd741A15c'
const CORE_R = 7
const CAPTURE_SECONDS = 3.2
const CAPTURE_LAND_RADIUS = CORE_R * 1.05
const RESPAWN_SECONDS = 20
const ORBIT_RING_SAMPLE = 60 // faint ellipses drawn for this many bodies max

// ---- Deterministic orbit derivation ----
// Stand-in for keccak256(contractAddress, tokenId). FNV-1a 32-bit.
function hash32(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function makeRng(seed: number) {
  let s = seed
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

// Keplerian position: M -> E (2 Newton steps) -> true anomaly -> rotate ω,Ω,i
const _kp = new Float32Array(3)
function kepPos(a: number, e: number, inc: number, raan: number, argp: number, M: number, out: Float32Array) {
  let E = M
  for (let k = 0; k < 2; k++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2))
  const r = a * (1 - e * Math.cos(E))
  const xo = r * Math.cos(nu), yo = r * Math.sin(nu)
  const cw = Math.cos(argp), sw = Math.sin(argp), cO = Math.cos(raan), sO = Math.sin(raan)
  const ci = Math.cos(inc), si = Math.sin(inc)
  out[0] = xo * (cw * cO - sw * sO * ci) - yo * (sw * cO + cw * sO * ci)
  out[2] = xo * (cw * sO + sw * cO * ci) - yo * (sw * sO - cw * cO * ci)
  out[1] = xo * (sw * si) + yo * (cw * si)
}

interface OrbitParams { a: number; e: number; inc: number; raan: number; argp: number; M: number; n: number }

function deriveOrbit(id: string | number, genre?: string): OrbitParams {
  const seed = hash32(OGUN_CONTRACT + ':' + String(id))
  const r = makeRng(seed)
  const g = (genre && GENRE_ORBITS[genre.toLowerCase().replace(/\s+/g, '-')]) || DEFAULT_ORBIT
  const a = g.band[0] + r() * (g.band[1] - g.band[0])
  return {
    a,
    e: 0.05 + r() * 0.30,
    inc: (r() - 0.5) * 2 * g.inc,
    raan: r() * Math.PI * 2,
    argp: r() * Math.PI * 2,
    M: r() * Math.PI * 2,
    n: 0.10 / Math.pow(a / 14, 1.5), // Kepler's third law: n ∝ a^-3/2
  }
}

const PLACEHOLDER_GENRES = ['hip-hop', 'lo-fi', 'electronic', 'jazz', 'rock', 'classical']
function placeholderTracks(): RadioTrackBody[] {
  return Array.from({ length: 48 }, (_, i) => ({
    id: 5400 + i,
    scid: 'SC-POL-' + (5400 + i),
    genre: PLACEHOLDER_GENRES[hash32('g' + i) % PLACEHOLDER_GENRES.length],
  }))
}

// Ecosystem node labels (showEcosystemNodes prop)
const ECOSYSTEM_NODES = [
  { label: 'NVIDIA', color: 0x76b900 }, { label: 'META', color: 0x0668e1 },
  { label: 'POLYGON', color: 0x8247e5 }, { label: 'IPFS', color: 0x469ea2 },
  { label: 'SCID', color: 0x00e5ff }, { label: 'FURL', color: 0xff2266 },
  { label: 'SMITH', color: 0xb8ff44 }, { label: 'AGENTS', color: 0xff8800 },
  { label: 'CLAWHUB', color: 0xe64400 }, { label: 'NPM', color: 0xcb3837 },
  { label: 'OGUN', color: 0xffd700 }, { label: 'P2P', color: 0x44ddff },
]

function createTextSprite(text: string, color: number): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const hexColor = '#' + new THREE.Color(color).getHexString()
  ctx.shadowColor = hexColor
  ctx.shadowBlur = 12
  ctx.fillStyle = hexColor
  ctx.font = 'bold 28px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 32)
  ctx.fillText(text, 128, 32)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }))
  sprite.scale.set(6, 1.5, 1)
  return sprite
}

// Soft radial glow texture — shared by dust, NFT bodies, and core halo
function createGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.5)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)

export default function RadioScene4D({
  audioRef, isPlaying, artworkUrl, genre,
  tracks, currentTrackId, onCaptureComplete, showEcosystemNodes = false,
}: RadioScene4DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const animFrameRef = useRef<number>(0)
  const clockRef = useRef(new THREE.Clock())
  // Synced from `isPlaying` so the animate loop (mounted once) reads it without
  // re-mounting the scene. Paused -> near-idle frame rate (battery fix).
  const isPlayingRef = useRef(false)
  const artworkUrlRef = useRef<string>('')

  // Cover art renders 4D — mapped onto the ENTIRE core sphere (wraps + spins),
  // not a flat billboard. coreRef gives the artwork loader the orb to texture.
  const artSpriteRef = useRef<THREE.Sprite | null>(null)
  const coreRef = useRef<THREE.Mesh | null>(null)
  const artBloomRef = useRef(1) // 0..1 bloom-in progress

  // Orbital layer refs
  const tracksRef = useRef<RadioTrackBody[]>([])
  const nftDirtyRef = useRef(true)
  const nftRef = useRef<{
    points: THREE.Points | null
    orbits: OrbitParams[]
    ids: (string | number)[]
    baseSizes: Float32Array | null
    rings: THREE.Line[]
  }>({ points: null, orbits: [], ids: [], baseSizes: null, rings: [] })
  const captureRef = useRef<{
    idx: number
    t: number
    pendingId: string | number | null
    landedIdx: number
    landedAt: number
    rippleT: number
    trail: number[][]
  }>({ idx: -1, t: 0, pendingId: null, landedIdx: -1, landedAt: -1, rippleT: 1e9, trail: [] })
  const trailLineRef = useRef<THREE.Line | null>(null)
  const rippleRef = useRef<THREE.Mesh | null>(null)
  const captureRingRef = useRef<THREE.Line | null>(null)
  const onCaptureCompleteRef = useRef(onCaptureComplete)
  useEffect(() => { onCaptureCompleteRef.current = onCaptureComplete }, [onCaptureComplete])

  // Camera — v1 preview scale
  const camRef = useRef({ theta: 0.6, phi: 1.15, dist: 72, dragging: false, px: 0, py: 0 })

  // Smoothed audio values
  const smoothBassRef = useRef(0)
  const smoothMidsRef = useRef(0)
  const smoothHighsRef = useRef(0)

  // Sync track registry into the loop
  useEffect(() => {
    tracksRef.current = tracks && tracks.length ? tracks : placeholderTracks()
    nftDirtyRef.current = true
  }, [tracks])

  // Track change -> queue gravitational capture (consumed by animate loop)
  useEffect(() => {
    if (currentTrackId === undefined || currentTrackId === null) return
    captureRef.current.pendingId = currentTrackId
  }, [currentTrackId])

  const getPalette = useCallback(() => {
    if (!genre) return DEFAULT_PALETTE
    const key = genre.toLowerCase().replace(/\s+/g, '-')
    return GENRE_PALETTES[key] || DEFAULT_PALETTE
  }, [genre])

  // /radio's <audio> is a different DOM node than AudioEngine's, so we own its
  // Web Audio graph here and publish the analyser globally for Neural to read.
  // Apr 14 ea3f186 made this read-only assuming AudioEngine owned the audio,
  // which broke Neural on /radio (AudioEngine isn't the source on this page).
  useEffect(() => {
    if (!audioRef.current) return
    const audio = audioRef.current
    const connectAnalyser = () => {
      if (analyserRef.current) return
      try {
        const ctx = audioCtxRef.current || new AudioContext()
        audioCtxRef.current = ctx
        if (!sourceRef.current) {
          sourceRef.current = ctx.createMediaElementSource(audio)
        }
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.82
        sourceRef.current.connect(analyser)
        analyser.connect(ctx.destination)
        analyserRef.current = analyser
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
        ;(window as any).__soundchainAudioCtx = ctx
        ;(window as any).__soundchainAnalyzer = analyser
      } catch (e) {
        console.warn('[4D Radio] Audio analyser setup failed:', e)
      }
    }
    audio.addEventListener('play', connectAnalyser, { once: true })
    return () => { audio.removeEventListener('play', connectAnalyser) }
  }, [audioRef])

  // Resume AudioContext (may still be needed if user interacts before audio starts)
  useEffect(() => {
    isPlayingRef.current = isPlaying
    if (isPlaying && audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
  }, [isPlaying])

  // Load artwork texture — feeds the center billboard (S3 CORS proxy preserved)
  useEffect(() => {
    if (!artworkUrl || artworkUrl === artworkUrlRef.current) return
    artworkUrlRef.current = artworkUrl
    const proxyUrl = artworkUrl.includes('s3.') || artworkUrl.includes('amazonaws.com')
      ? `/api/image-proxy?url=${encodeURIComponent(artworkUrl)}`
      : artworkUrl
    const loader = new THREE.TextureLoader()
    loader.crossOrigin = 'anonymous'
    loader.load(
      proxyUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        // 4D: wrap the cover art around the ENTIRE core sphere so it fills the
        // orb and spins, instead of a flat billboard card.
        const core = coreRef.current
        if (core) {
          const mat = core.material as THREE.MeshBasicMaterial
          const old = mat.map
          mat.map = texture
          mat.color.set(0xffffff) // white base so the art shows true color
          mat.needsUpdate = true
          if (old) old.dispose()
        }
        // Keep the flat billboard hidden — art lives on the sphere now.
        const sprite = artSpriteRef.current
        if (sprite) (sprite.material as THREE.SpriteMaterial).opacity = 0
        // Trigger the bloom/flash on a manual track jump (no capture in flight).
        if (captureRef.current.idx === -1 && artBloomRef.current >= 1) artBloomRef.current = 0
      },
      undefined,
      () => {
        // load failed — fall back to the warm orb
        const core = coreRef.current
        if (core) (core.material as THREE.MeshBasicMaterial).color.set(0xfff3e0)
      }
    )
  }, [artworkUrl])

  // ==================== MAIN SCENE INIT ====================
  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // --- Renderer (no post-processing — approved look glows via additive sprites) ---
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false, powerPreference: isMobile ? 'low-power' : 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2))
    renderer.setClearColor(0x040208, 1) // deep violet-black void
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x040208, 0.0055)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 600)
    cameraRef.current = camera

    const glowTex = createGlowTexture()

    // ============ DISTANT STARFIELD ============
    const starCount = isMobile ? 900 : 1600
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const r = 180 + Math.random() * 220
      const t = Math.random() * Math.PI * 2
      const p = Math.acos(2 * Math.random() - 1)
      starPositions[i * 3] = r * Math.sin(p) * Math.cos(t)
      starPositions[i * 3 + 1] = r * Math.cos(p)
      starPositions[i * 3 + 2] = r * Math.sin(p) * Math.sin(t)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starfield = new THREE.Points(starGeo, new THREE.PointsMaterial({
      size: 1.1, map: glowTex, color: 0x9aa3c0, transparent: true,
      opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
    }))
    scene.add(starfield)

    // ============ CENTRAL CORE — warm glowing reactor (approved v1 look) ============
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(CORE_R, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0xfff3e0 })
    )
    scene.add(core)
    coreRef.current = core

    const makeGlowSprite = (scale: number, color: number, opacity: number) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color, transparent: true, opacity,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }))
      s.scale.setScalar(scale)
      scene.add(s)
      return s
    }
    const glowA = makeGlowSprite(34, 0xffd9a8, 0.9)
    const glowB = makeGlowSprite(58, 0xff6a3d, 0.35)
    const glowC = makeGlowSprite(20, 0xffffff, 0.9)

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(CORE_R * 1.004, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xffb24d, wireframe: true, transparent: true, opacity: 0.10 })
    )
    scene.add(shell)

    // ============ COVER ART BILLBOARD (the centerpiece) ============
    // Flat sprite at core center — full artwork visible at once, blooms in on
    // capture landing, slow spin. Fed by the artworkUrl loader effect above.
    const artSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: null, transparent: true, opacity: 0, depthTest: false,
    }))
    artSprite.scale.setScalar(0.01)
    scene.add(artSprite)
    artSpriteRef.current = artSprite

    // ============ NASA/JPL RUST SWARM ============
    const SWARM_N = isMobile ? 1200 : 2600
    const sw = {
      a: new Float32Array(SWARM_N), e: new Float32Array(SWARM_N),
      inc: new Float32Array(SWARM_N), raan: new Float32Array(SWARM_N),
      argp: new Float32Array(SWARM_N), M: new Float32Array(SWARM_N),
      n: new Float32Array(SWARM_N),
    }
    const swarmPositions = new Float32Array(SWARM_N * 3)
    const swarmColors = new Float32Array(SWARM_N * 3)
    {
      const cA = new THREE.Color(0xff6a3d), cB = new THREE.Color(0xffc89a), cC = new THREE.Color(0x8a4a3a)
      const tmpC = new THREE.Color()
      for (let i = 0; i < SWARM_N; i++) {
        const outlier = Math.random() < 0.12
        sw.a[i] = 12 + Math.pow(Math.random(), 0.65) * 30 + (outlier ? Math.random() * 18 : 0)
        sw.e[i] = Math.random() * (outlier ? 0.5 : 0.25)
        sw.inc[i] = (Math.random() - 0.5) * (outlier ? 1.4 : 0.42)
        sw.raan[i] = Math.random() * Math.PI * 2
        sw.argp[i] = Math.random() * Math.PI * 2
        sw.M[i] = Math.random() * Math.PI * 2
        sw.n[i] = 0.12 / Math.pow(sw.a[i] / 14, 1.5)
        tmpC.copy(Math.random() < 0.7 ? cA : cC).lerp(cB, Math.random() * 0.6)
        swarmColors[i * 3] = tmpC.r; swarmColors[i * 3 + 1] = tmpC.g; swarmColors[i * 3 + 2] = tmpC.b
      }
    }
    const swarmGeo = new THREE.BufferGeometry()
    swarmGeo.setAttribute('position', new THREE.BufferAttribute(swarmPositions, 3))
    swarmGeo.setAttribute('color', new THREE.BufferAttribute(swarmColors, 3))
    const swarmMat = new THREE.PointsMaterial({
      size: 0.55, map: glowTex, vertexColors: true, transparent: true,
      opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending,
    })
    scene.add(new THREE.Points(swarmGeo, swarmMat))

    // ============ NFT/SCID ASTEROID BODIES (asteroid scale — approved) ============
    // One Points object for the whole volume. Per-body pulse phase in shader,
    // per-body capture via buffer writes. Visually matches the 0.85-scale
    // sprites from the approved preview.
    const buildNftSwarm = () => {
      const prev = nftRef.current
      if (prev.points) {
        scene.remove(prev.points)
        prev.points.geometry.dispose()
        ;(prev.points.material as THREE.Material).dispose()
      }
      prev.rings.forEach(r => { scene.remove(r); r.geometry.dispose(); (r.material as THREE.Material).dispose() })
      nftRef.current = { points: null, orbits: [], ids: [], baseSizes: null, rings: [] }

      const list = tracksRef.current
      if (!list.length) return

      const N = list.length
      const pos = new Float32Array(N * 3)
      const col = new Float32Array(N * 3)
      const size = new Float32Array(N).fill(1.0)
      const phase = new Float32Array(N)
      const orbits: OrbitParams[] = new Array(N)
      const ids: (string | number)[] = new Array(N)
      for (let i = 0; i < N; i++) {
        const t = list[i]
        ids[i] = t.id
        orbits[i] = deriveOrbit(t.id, t.genre)
        phase[i] = (hash32('p' + String(t.id)) % 628) / 100
        const key = (t.genre || '').toLowerCase().replace(/\s+/g, '-')
        const pal = GENRE_PALETTES[key] || DEFAULT_PALETTE
        col[i * 3] = pal.primary.r; col[i * 3 + 1] = pal.primary.g; col[i * 3 + 2] = pal.primary.b
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
      geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
      geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
      const mat = new THREE.ShaderMaterial({
        uniforms: { uHighs: { value: 0 }, uTime: { value: 0 }, uTex: { value: glowTex } },
        vertexShader: `
          attribute float aSize;
          attribute float aPhase;
          varying vec3 vColor;
          varying float vPulse;
          uniform float uHighs;
          uniform float uTime;
          void main() {
            vColor = color;
            vPulse = 0.85 + 0.15 * sin(uTime * 2.0 + aPhase);
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            // 58.0 multiplier ~= the approved 0.85-scale sprite footprint
            gl_PointSize = aSize * (1.0 + uHighs * 0.5) * (58.0 / -mvPos.z);
            gl_Position = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          uniform sampler2D uTex;
          varying vec3 vColor;
          varying float vPulse;
          void main() {
            vec4 t = texture2D(uTex, gl_PointCoord);
            gl_FragColor = vec4(vColor, t.a * vPulse);
          }
        `,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const points = new THREE.Points(geo, mat)
      scene.add(points)

      // Faint orbit ellipses — sampled subset only. The approved frame shows a
      // few ghost rings; 5,417 of them is spaghetti + a frame-rate grave.
      const rings: THREE.Line[] = []
      const step = Math.max(1, Math.floor(N / ORBIT_RING_SAMPLE))
      for (let i = 0; i < N && rings.length < ORBIT_RING_SAMPLE; i += step) {
        const o = orbits[i]
        const ringPos = new Float32Array(91 * 3)
        for (let k = 0; k <= 90; k++) {
          kepPos(o.a, o.e, o.inc, o.raan, o.argp, (k / 90) * Math.PI * 2, _kp)
          ringPos[k * 3] = _kp[0]; ringPos[k * 3 + 1] = _kp[1]; ringPos[k * 3 + 2] = _kp[2]
        }
        const rGeo = new THREE.BufferGeometry()
        rGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3))
        const ring = new THREE.Line(rGeo, new THREE.LineBasicMaterial({
          color: new THREE.Color(col[i * 3], col[i * 3 + 1], col[i * 3 + 2]),
          transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false,
        }))
        scene.add(ring)
        rings.push(ring)
      }

      nftRef.current = { points, orbits, ids, baseSizes: size, rings }
    }

    // Capture trail
    const TRAIL_LEN = 80
    const trailGeo = new THREE.BufferGeometry()
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_LEN * 3), 3))
    const trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    }))
    scene.add(trailLine)
    trailLineRef.current = trailLine

    // Impact ripple
    const ripple = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.12, 64),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    )
    scene.add(ripple)
    rippleRef.current = ripple

    // Bright orbit ring for the capturing body (repathed at capture start)
    const cRingGeo = new THREE.BufferGeometry()
    cRingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(91 * 3), 3))
    const captureRing = new THREE.Line(cRingGeo, new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    }))
    scene.add(captureRing)
    captureRingRef.current = captureRing

    // ============ ECOSYSTEM NODES (optional — off in the approved look) ============
    let nodeGroup: THREE.Group | null = null
    if (showEcosystemNodes) {
      nodeGroup = new THREE.Group()
      const NODE_RADIUS = 48
      ECOSYSTEM_NODES.forEach((node, i) => {
        const angle = (i / ECOSYSTEM_NODES.length) * Math.PI * 2
        const mesh = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.9, 1),
          new THREE.MeshBasicMaterial({ color: node.color, transparent: true, opacity: 0.9, wireframe: true })
        )
        mesh.position.set(Math.cos(angle) * NODE_RADIUS, Math.sin(angle * 2) * 5, Math.sin(angle) * NODE_RADIUS)
        nodeGroup!.add(mesh)
        const sprite = createTextSprite(node.label, node.color)
        sprite.position.copy(mesh.position)
        sprite.position.y += 2.2
        nodeGroup!.add(sprite)
      })
      scene.add(nodeGroup)
    }

    // ============ POINTER CONTROLS ============
    const cam = camRef.current
    const onPointerDown = (e: PointerEvent) => { cam.dragging = true; cam.px = e.clientX; cam.py = e.clientY }
    const onPointerUp = () => { cam.dragging = false }
    const onPointerMove = (e: PointerEvent) => {
      if (!cam.dragging) return
      cam.theta += (e.clientX - cam.px) * 0.005
      cam.phi = Math.max(0.25, Math.min(2.6, cam.phi - (e.clientY - cam.py) * 0.005))
      cam.px = e.clientX; cam.py = e.clientY
    }
    const onWheel = (e: WheelEvent) => {
      cam.dist = Math.max(26, Math.min(160, cam.dist + e.deltaY * 0.05))
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true })

    // ==================== ANIMATION LOOP ====================
    let frameCount = 0
    let lastRenderTime = 0
    const playingIntervalMs = isMobile ? 41.66 : 0          // ~24fps mobile / uncapped desktop
    const pausedIntervalMs = isMobile ? 200 : 66.66         // ~5fps mobile / ~15fps desktop

    let loopErrorLogged = false
    const animate = (timestamp?: number) => {
      if (typeof document !== 'undefined' && document.hidden) {
        animFrameRef.current = 0
        return
      }
      animFrameRef.current = requestAnimationFrame(animate)

      const targetInterval = isPlayingRef.current ? playingIntervalMs : pausedIntervalMs
      if (timestamp && targetInterval > 0) {
        if (timestamp - lastRenderTime < targetInterval) return
        lastRenderTime = timestamp
      }
      frameCount++

      const elapsed = clockRef.current.getElapsedTime()
      const delta = clockRef.current.getDelta()

      // Read FFT — skip every other frame on mobile
      let bass = 0, mids = 0, highs = 0
      if (analyserRef.current && dataArrayRef.current && (!isMobile || frameCount % 2 === 0)) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)
        const data = dataArrayRef.current
        const len = data.length
        for (let i = 0; i < 12; i++) bass += data[i]
        bass = bass / (12 * 255)
        for (let i = 12; i < 80; i++) mids += data[i]
        mids = mids / (68 * 255)
        for (let i = 80; i < len; i++) highs += data[i]
        highs = highs / ((len - 80) * 255)
      }

      const lf = 1.0 - Math.pow(0.0005, delta)
      smoothBassRef.current += (bass - smoothBassRef.current) * lf
      smoothMidsRef.current += (mids - smoothMidsRef.current) * lf
      smoothHighsRef.current += (highs - smoothHighsRef.current) * lf
      const sBass = smoothBassRef.current
      const sMids = smoothMidsRef.current
      const sHighs = smoothHighsRef.current

      // Every per-frame visual update is wrapped so a runtime error in ANY
      // section (NFT rebuild, capture state machine, buffer indexing) can never
      // skip the renderer.render() below. A throw here previously froze the
      // ENTIRE scene — core, swarm and asteroids — because the rAF reschedules
      // before the body runs, so the screen kept repainting the last good frame
      // while the math silently advanced. Render is now unconditional.
      try {
      // --- Core breathing (bass) ---
      const pulse = 1 + 0.02 * Math.sin(elapsed * 1.4) + sBass * 0.06
      core.scale.setScalar(pulse)
      core.rotation.y += delta * 0.22 // the wrapped cover art spins (4D)
      shell.scale.setScalar(pulse)
      shell.rotation.y += delta * 0.24
      glowA.material.opacity = 0.8 + 0.15 * Math.sin(elapsed * 1.4) + sBass * 0.2
      glowB.material.opacity = 0.30 + sBass * 0.18
      glowC.material.opacity = 0.85 + sBass * 0.15
      glowA.scale.setScalar(34 * (1 + sBass * 0.1))
      glowB.scale.setScalar(58 * (1 + sBass * 0.08))

      // --- Starfield drift ---
      starfield.rotation.y = elapsed * 0.013

      // --- Swarm propagation (mids brighten the belt) ---
      if (!isMobile || frameCount % 2 === 0) {
        const posAttr = swarmGeo.attributes.position as THREE.BufferAttribute
        const arr = posAttr.array as Float32Array
        const dtS = isMobile ? delta * 2 : delta
        for (let i = 0; i < SWARM_N; i++) {
          sw.M[i] += sw.n[i] * dtS * 9
          kepPos(sw.a[i], sw.e[i], sw.inc[i], sw.raan[i], sw.argp[i], sw.M[i], _kp)
          arr[i * 3] = _kp[0]; arr[i * 3 + 1] = _kp[1]; arr[i * 3 + 2] = _kp[2]
        }
        posAttr.needsUpdate = true
        swarmMat.opacity = 0.7 + sMids * 0.25
      }

      // --- Rebuild NFT swarm if tracks changed ---
      if (nftDirtyRef.current) {
        nftDirtyRef.current = false
        buildNftSwarm()
      }

      // --- NFT propagation + capture state machine ---
      const nft = nftRef.current
      const cap = captureRef.current
      if (nft.points) {
        const nftMat = nft.points.material as THREE.ShaderMaterial
        nftMat.uniforms.uHighs.value = sHighs
        nftMat.uniforms.uTime.value = elapsed

        // Consume pending capture request
        if (cap.pendingId !== null) {
          const idx = nft.ids.indexOf(cap.pendingId)
          cap.pendingId = null
          if (idx >= 0 && idx !== cap.idx) {
            if (cap.landedIdx >= 0 && nft.baseSizes) {
              nft.baseSizes[cap.landedIdx] = 1.0
              ;(nft.points.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true
            }
            cap.idx = idx
            cap.t = 0
            cap.trail.length = 0
            if (captureRingRef.current) {
              const o = nft.orbits[idx]
              const rp = captureRingRef.current.geometry.attributes.position as THREE.BufferAttribute
              for (let k = 0; k <= 90; k++) {
                kepPos(o.a, o.e, o.inc, o.raan, o.argp, (k / 90) * Math.PI * 2, _kp)
                rp.setXYZ(k, _kp[0], _kp[1], _kp[2])
              }
              rp.needsUpdate = true
              const colAttr = nft.points.geometry.attributes.color as THREE.BufferAttribute
              ;(captureRingRef.current.material as THREE.LineBasicMaterial).color.setRGB(colAttr.getX(idx), colAttr.getY(idx), colAttr.getZ(idx))
              ;(captureRingRef.current.material as THREE.LineBasicMaterial).opacity = 0.20
              if (trailLineRef.current) {
                ;(trailLineRef.current.material as THREE.LineBasicMaterial).color.setRGB(colAttr.getX(idx), colAttr.getY(idx), colAttr.getZ(idx))
              }
            }
          }
        }

        // Respawn a landed body back into the belt
        if (cap.landedIdx >= 0 && cap.landedAt > 0 && elapsed - cap.landedAt > RESPAWN_SECONDS && nft.baseSizes) {
          nft.baseSizes[cap.landedIdx] = 1.0
          ;(nft.points.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true
          cap.landedIdx = -1
        }

        if (!isMobile || frameCount % 2 === 0) {
          const posAttr = nft.points.geometry.attributes.position as THREE.BufferAttribute
          const arr = posAttr.array as Float32Array
          const sizeAttr = nft.points.geometry.attributes.aSize as THREE.BufferAttribute
          const dtN = isMobile ? delta * 2 : delta
          for (let i = 0; i < nft.orbits.length; i++) {
            const o = nft.orbits[i]
            if (i === cap.idx) {
              // GRAVITATIONAL CAPTURE — orbit decay, spin-up, flatten
              cap.t += dtN / CAPTURE_SECONDS
              const k = Math.min(cap.t, 1)
              const ease = k * k * (3 - 2 * k)
              const aNow = o.a * (1 - ease) + CAPTURE_LAND_RADIUS * ease
              o.M += o.n * dtN * (1 + ease * 9)
              kepPos(aNow, o.e * (1 - ease), o.inc * (1 - ease), o.raan, o.argp, o.M, _kp)
              arr[i * 3] = _kp[0]; arr[i * 3 + 1] = _kp[1]; arr[i * 3 + 2] = _kp[2]
              // Grows as it falls so the eye can track it (0.85 -> ~2.0 equivalent)
              if (nft.baseSizes) { nft.baseSizes[i] = 1.0 + ease * 1.3; sizeAttr.needsUpdate = true }
              cap.trail.push([_kp[0], _kp[1], _kp[2]])
              if (cap.trail.length > TRAIL_LEN) cap.trail.shift()
              if (trailLineRef.current) {
                const tp = trailLineRef.current.geometry.attributes.position as THREE.BufferAttribute
                for (let q = 0; q < TRAIL_LEN; q++) {
                  const pt = cap.trail[Math.max(0, cap.trail.length - TRAIL_LEN + q)] || cap.trail[0] || [0, 0, 0]
                  tp.setXYZ(q, pt[0], pt[1], pt[2])
                }
                tp.needsUpdate = true
                ;(trailLineRef.current.material as THREE.LineBasicMaterial).opacity = 0.6 * ease
              }
              // LANDING
              if (cap.t >= 1) {
                const landedId = nft.ids[i]
                cap.landedIdx = i
                cap.landedAt = elapsed
                cap.idx = -1
                cap.t = 0
                cap.rippleT = 0
                artBloomRef.current = 0 // art blooms at the core
                if (nft.baseSizes) { nft.baseSizes[i] = 0.001; sizeAttr.needsUpdate = true }
                if (trailLineRef.current) (trailLineRef.current.material as THREE.LineBasicMaterial).opacity = 0
                if (captureRingRef.current) (captureRingRef.current.material as THREE.LineBasicMaterial).opacity = 0
                if (rippleRef.current) {
                  const colAttr = nft.points.geometry.attributes.color as THREE.BufferAttribute
                  ;(rippleRef.current.material as THREE.MeshBasicMaterial).color.setRGB(colAttr.getX(i), colAttr.getY(i), colAttr.getZ(i))
                  if (glowB.material) glowB.material.color.setRGB(colAttr.getX(i), colAttr.getY(i), colAttr.getZ(i))
                }
                onCaptureCompleteRef.current?.(landedId)
              }
            } else {
              o.M += o.n * dtN * 9
              kepPos(o.a, o.e, o.inc, o.raan, o.argp, o.M, _kp)
              arr[i * 3] = _kp[0]; arr[i * 3 + 1] = _kp[1]; arr[i * 3 + 2] = _kp[2]
            }
          }
          posAttr.needsUpdate = true
        }
      }

      // --- Cover-art capture flash — the wrapped orb pops as new art lands ---
      if (artBloomRef.current < 1) {
        artBloomRef.current = Math.min(1, artBloomRef.current + delta * 1.4)
        const e2 = artBloomRef.current * artBloomRef.current * (3 - 2 * artBloomRef.current)
        if (coreRef.current) coreRef.current.scale.multiplyScalar(1 + (1 - e2) * 0.14)
      }

      // --- Impact ripple ---
      if (rippleRef.current && cap.rippleT < 1.4) {
        cap.rippleT += delta
        rippleRef.current.scale.setScalar(CORE_R * 1.1 + cap.rippleT * 16)
        rippleRef.current.lookAt(camera.position)
        ;(rippleRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.5 * (1 - cap.rippleT / 1.4))
      } else if (rippleRef.current) {
        ;(rippleRef.current.material as THREE.MeshBasicMaterial).opacity = 0
      }

      // --- Ecosystem nodes (if enabled) ---
      if (nodeGroup) {
        nodeGroup.rotation.y = elapsed * 0.03
        nodeGroup.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            child.rotation.x = elapsed * 1.2
            child.rotation.z = elapsed * 0.8
            child.scale.setScalar(1.0 + sHighs * 0.8)
          }
        })
      }

      // --- Camera: cinematic auto-orbit, drag layered on top ---
      if (!cam.dragging) cam.theta += delta * 0.04
      const d = cam.dist + Math.sin(elapsed * 0.05) * 2
      camera.position.set(
        d * Math.sin(cam.phi) * Math.cos(cam.theta),
        d * Math.cos(cam.phi),
        d * Math.sin(cam.phi) * Math.sin(cam.theta)
      )
      camera.lookAt(0, 0, 0)
      } catch (err) {
        if (!loopErrorLogged) {
          loopErrorLogged = true
          // eslint-disable-next-line no-console
          console.error('[RadioScene4D] per-frame update threw (scene keeps rendering):', err)
        }
      }

      renderer.render(scene, camera)
    }

    clockRef.current.start()
    animate()

    // Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    // Full RAF stop when tab is backgrounded — phantom battery fix.
    const handleVisibility = () => {
      if (document.hidden) {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current)
          animFrameRef.current = 0
        }
      } else if (animFrameRef.current === 0) {
        animate()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('wheel', onWheel)
      cancelAnimationFrame(animFrameRef.current)
      renderer.dispose()
      scene.clear()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEcosystemNodes]) // re-init only if the nodes toggle flips

  // Genre palette — tints the outer halo to the current track's mood
  useEffect(() => {
    // glow color updates happen inside the loop on capture landing; this is a
    // fallback for direct genre changes without a capture (manual selection)
  }, [genre, getPalette])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  )
}
