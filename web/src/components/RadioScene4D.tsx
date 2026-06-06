/**
 * RadioScene4D — NVIDIA-grade immersive audio-reactive 3D experience
 *
 * God's eye view of music in 2073. Cyberpunk dystopian AI era.
 * - UnrealBloomPass post-processing (everything glows)
 * - Central reactor orb pulses with bass, radiates energy beams
 * - 3 concentric frequency rings deform from live FFT data
 * - Double helix DNA stream (4000 particles)
 * - 8000-particle reactive starfield nebula
 * - Tron-style infinite ground grid
 * - 6 orbiting ecosystem nodes with text sprite labels
 * - Energy beams connecting orb to nodes
 * - Cinematic slow-orbit camera
 * - 14 genre-aware color palettes shift the entire mood
 */

import React, { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

interface RadioScene4DProps {
  audioRef: React.RefObject<HTMLAudioElement | null>
  isPlaying: boolean
  artworkUrl?: string
  genre?: string
}

// Genre -> color palette mapping
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
  'lo-fi': { primary: new THREE.Color(0x6b8e8e), secondary: new THREE.Color(0x4a6741), accent: new THREE.Color(0xd4a574) },
  'classical': { primary: new THREE.Color(0xffd700), secondary: new THREE.Color(0xffffff), accent: new THREE.Color(0xc0c0c0) },
  'reggae': { primary: new THREE.Color(0x00ff00), secondary: new THREE.Color(0xffd700), accent: new THREE.Color(0xff0000) },
  'latin': { primary: new THREE.Color(0xff6347), secondary: new THREE.Color(0xffd700), accent: new THREE.Color(0xff1493) },
  'country': { primary: new THREE.Color(0xdeb887), secondary: new THREE.Color(0xcd853f), accent: new THREE.Color(0x8b4513) },
}

const DEFAULT_PALETTE = { primary: new THREE.Color(0xff4400), secondary: new THREE.Color(0x00ffff), accent: new THREE.Color(0xffd700) }

// Ecosystem node labels
const ECOSYSTEM_NODES = [
  { label: 'NVIDIA', color: 0x76b900 },   // NVIDIA green
  { label: 'META', color: 0x0668e1 },     // Meta blue
  { label: 'POLYGON', color: 0x8247e5 },  // Polygon purple
  { label: 'IPFS', color: 0x469ea2 },     // IPFS teal (darker, distinct from SCID)
  { label: 'SCID', color: 0x00e5ff },     // SCID cyan
  { label: 'FURL', color: 0xff2266 },     // FURL hot pink
  { label: 'SMITH', color: 0xb8ff44 },    // SMITH lime yellow (distinct from AGENTS)
  { label: 'AGENTS', color: 0xff8800 },   // AGENTS orange (was green, clashed with SMITH)
  { label: 'CLAWHUB', color: 0xe64400 },  // CLAWHUB red-orange (distinct from AGENTS orange)
  { label: 'NPM', color: 0xcb3837 },      // NPM red
  { label: 'OGUN', color: 0xffd700 },     // OGUN gold
  { label: 'P2P', color: 0x44ddff },      // P2P light blue (distinct from SCID cyan)
]

// Create a text sprite for 3D labels
function createTextSprite(text: string, color: number): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 256, 64)

  // Glow effect
  const hexColor = '#' + new THREE.Color(color).getHexString()
  ctx.shadowColor = hexColor
  ctx.shadowBlur = 12
  ctx.fillStyle = hexColor
  ctx.font = 'bold 28px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 32)
  // Second pass for brightness
  ctx.fillText(text, 128, 32)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(1.5, 0.375, 1)
  return sprite
}

// Mobile detection — throttle GPU-intensive work on phones/tablets
const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)

export default function RadioScene4D({ audioRef, isPlaying, artworkUrl, genre }: RadioScene4DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const composerRef = useRef<EffectComposer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const animFrameRef = useRef<number>(0)
  const clockRef = useRef(new THREE.Clock())
  // Synced from `isPlaying` prop so the animate loop (mounted once) can read it
  // without re-mounting the whole scene. When paused we throttle to a near-idle
  // frame rate to save phone battery (was rendering at full 30fps mobile / 60fps
  // desktop regardless of audio state).
  const isPlayingRef = useRef(false)
  const artworkTextureRef = useRef<THREE.Texture | null>(null)
  const artworkUrlRef = useRef<string>('')

  // Scene object refs
  const orbRef = useRef<THREE.Mesh | null>(null)
  const orbMaterialRef = useRef<THREE.ShaderMaterial | null>(null)
  const helixParticlesRef = useRef<THREE.Points | null>(null)
  const starfieldRef = useRef<THREE.Points | null>(null)
  const freqRingsRef = useRef<THREE.Line[]>([])
  const nodeGroupRef = useRef<THREE.Group | null>(null)
  const glowRef = useRef<THREE.Mesh | null>(null)
  const gridRef = useRef<THREE.Group | null>(null)
  const beamsRef = useRef<THREE.Group | null>(null)
  const bloomPassRef = useRef<UnrealBloomPass | null>(null)

  // Smoothed audio values
  const smoothBassRef = useRef(0)
  const smoothMidsRef = useRef(0)
  const smoothHighsRef = useRef(0)

  // Per-song randomized orbit params — changes every track for infinite variety
  const orbitParamsRef = useRef({
    speed: 0.15,
    tilt: 0.25,
    wobble: 0.4,
    yAmplitude: 1.2,
    radiusBase: 4.5,
    radiusWave: 0.6,
    spinX: 2.0,
    spinZ: 1.5,
  })

  // Randomize orbit when track changes (artworkUrl is proxy for track change)
  useEffect(() => {
    orbitParamsRef.current = {
      speed: 0.08 + Math.random() * 0.25,       // 0.08 - 0.33
      tilt: 0.1 + Math.random() * 0.5,           // 0.1 - 0.6
      wobble: 0.2 + Math.random() * 0.8,         // 0.2 - 1.0
      yAmplitude: 0.5 + Math.random() * 2.0,     // 0.5 - 2.5
      radiusBase: 3.5 + Math.random() * 2.5,     // 3.5 - 6.0
      radiusWave: 0.3 + Math.random() * 1.0,     // 0.3 - 1.3
      spinX: 1.0 + Math.random() * 3.0,          // 1.0 - 4.0
      spinZ: 0.5 + Math.random() * 3.0,          // 0.5 - 3.5
    }
  }, [artworkUrl])

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

  // Load artwork texture
  useEffect(() => {
    if (!artworkUrl || artworkUrl === artworkUrlRef.current) return
    artworkUrlRef.current = artworkUrl
    // S3 doesn't return CORS headers — proxy through Next.js image optimizer
    // which adds proper CORS and serves from our domain
    const proxyUrl = artworkUrl.includes('s3.') || artworkUrl.includes('amazonaws.com')
      ? `/api/image-proxy?url=${encodeURIComponent(artworkUrl)}`
      : artworkUrl
    const loader = new THREE.TextureLoader()
    loader.crossOrigin = 'anonymous'
    loader.load(
      proxyUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        if (artworkTextureRef.current) artworkTextureRef.current.dispose()
        artworkTextureRef.current = texture
        if (orbMaterialRef.current) {
          orbMaterialRef.current.uniforms.uTexture.value = texture
          orbMaterialRef.current.uniforms.uHasTexture.value = 1.0
        }
      },
      undefined,
      () => {
        if (orbMaterialRef.current) orbMaterialRef.current.uniforms.uHasTexture.value = 0.0
      }
    )
  }, [artworkUrl])

  // ==================== MAIN SCENE INIT ====================
  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false, powerPreference: isMobile ? 'low-power' : 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 3)) // Cap DPR on mobile to reduce GPU load
    renderer.setClearColor(0x000000, 1)  // Deeper space black
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // --- Scene ---
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x000000, 0.008)  // Deeper fog, farther visibility for planets
    sceneRef.current = scene

    // --- Camera (cinematic orbit) ---
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 200)
    camera.position.set(0, 2, 8)
    cameraRef.current = camera

    // --- Post-processing: UnrealBloom ---
    const composer = new EffectComposer(renderer)
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(isMobile ? width / 2 : width, isMobile ? height / 2 : height),
      isMobile ? 0.12 : 0.28, // strength — near-off; PITCH-BLACK space (Frank: full dark, realistic stars)
      isMobile ? 0.15 : 0.28, // radius
      isMobile ? 0.9 : 0.72   // threshold — only the absolute brightest pinpoints bloom, rest stays black
    )
    composer.addPass(bloomPass)
    bloomPassRef.current = bloomPass

    const outputPass = new OutputPass()
    composer.addPass(outputPass)
    composerRef.current = composer

    // ============ CENTRAL REACTOR ORB ============
    const orbGeo = new THREE.SphereGeometry(1.3, 128, 128)
    const orbMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uTexture: { value: null as THREE.Texture | null },
        uHasTexture: { value: 0.0 },
        uPrimary: { value: DEFAULT_PALETTE.primary },
        uSecondary: { value: DEFAULT_PALETTE.secondary },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uBass;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vNormal = normal;
          // Aggressive bass displacement — the orb BREATHES
          float displacement = sin(position.x * 5.0 + uTime * 3.0) * sin(position.y * 5.0 + uTime * 2.0) * sin(position.z * 5.0 + uTime * 1.5) * uBass * 0.25;
          vec3 pos = position + normal * displacement;
          float scale = 1.0 + uBass * 0.12;
          pos *= scale;
          vPosition = pos;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBass;
        uniform sampler2D uTexture;
        uniform float uHasTexture;
        uniform vec3 uPrimary;
        uniform vec3 uSecondary;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 color;
          if (uHasTexture > 0.5) {
            // Show cover art as-is — minimal processing to preserve colors
            color = texture2D(uTexture, vUv).rgb;
            // Very subtle bass pulse — just a hint of energy
            color += uPrimary * uBass * 0.08;
          } else {
            // No texture — show gradient orb
            float t = vUv.y + sin(vUv.x * 6.28 + uTime * 2.0) * 0.15;
            color = mix(uPrimary, uSecondary, t);
            float pulse = sin(uTime * 4.0) * 0.5 + 0.5;
            color += vec3(pulse * uBass * 0.3);
          }
          // Very subtle rim — just enough to see the sphere edge
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
          rim = pow(rim, 4.0);
          color += uPrimary * rim * 0.1;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })
    const orb = new THREE.Mesh(orbGeo, orbMat)
    scene.add(orb)
    orbRef.current = orb
    orbMaterialRef.current = orbMat

    // GLOW SPHERE removed — was too bright, blocked artwork visibility

    // ============ DOUBLE HELIX (4000 particles) ============
    const helixCount = 4000
    const helixPositions = new Float32Array(helixCount * 3)
    const helixColors = new Float32Array(helixCount * 3)
    const helixSizes = new Float32Array(helixCount)
    for (let i = 0; i < helixCount; i++) {
      const t = (i / helixCount) * Math.PI * 10
      const strand = i % 2 === 0 ? 1 : -1
      const radius = 2.2 + Math.sin(t * 0.3) * 0.4
      helixPositions[i * 3] = Math.cos(t) * radius * strand
      helixPositions[i * 3 + 1] = (i / helixCount - 0.5) * 12
      helixPositions[i * 3 + 2] = Math.sin(t) * radius * strand
      const ct = i / helixCount
      helixColors[i * 3] = 0.2 + ct * 0.8
      helixColors[i * 3 + 1] = 1.0 - ct * 0.5
      helixColors[i * 3 + 2] = 0.5 + ct * 0.5
      helixSizes[i] = Math.random() * 3 + 1
    }
    const helixGeo = new THREE.BufferGeometry()
    helixGeo.setAttribute('position', new THREE.BufferAttribute(helixPositions, 3))
    helixGeo.setAttribute('color', new THREE.BufferAttribute(helixColors, 3))
    helixGeo.setAttribute('size', new THREE.BufferAttribute(helixSizes, 1))
    const helixMat = new THREE.ShaderMaterial({
      uniforms: { uMids: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uMids;
        uniform float uTime;
        void main() {
          vColor = color;
          vec3 pos = position;
          pos += normalize(pos) * sin(uTime * 2.0 + length(pos)) * uMids * 0.4;
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (180.0 / -mvPos.z) * (1.0 + uMids * 0.8);
          gl_Position = projectionMatrix * mvPos;
          vAlpha = 0.5 + uMids * 0.5;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = (1.0 - d * 2.0) * vAlpha;
          gl_FragColor = vec4(vColor * 0.4, alpha * 0.5);
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const helixPoints = new THREE.Points(helixGeo, helixMat)
    // Helix hidden — too bright even at 40%, additive blending stacks
    // scene.add(helixPoints)
    helixParticlesRef.current = helixPoints

    // ============ STARFIELD NEBULA (8K density, dimmed for readability) ============
    const starCount = 8000
    const starPositions = new Float32Array(starCount * 3)
    const starSizes = new Float32Array(starCount)
    const starColors = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      // Distribute in a sphere
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 5 + Math.random() * 50
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPositions[i * 3 + 2] = r * Math.cos(phi)
      starSizes[i] = Math.random() * 1.5 + 0.3
      // Dimmed color variation (25% brightness — Apr 29 tuning per Frank's TV test:
      // stars were overpowering the central sphere + orbiting agents on a 60" TV).
      const colorChoice = Math.random()
      const dim = 0.25
      if (colorChoice < 0.3) {
        starColors[i * 3] = 0.6 * dim; starColors[i * 3 + 1] = 0.8 * dim; starColors[i * 3 + 2] = 1.0 * dim
      } else if (colorChoice < 0.6) {
        starColors[i * 3] = 1.0 * dim; starColors[i * 3 + 1] = 0.9 * dim; starColors[i * 3 + 2] = 0.7 * dim
      } else {
        starColors[i * 3] = 1.0 * dim; starColors[i * 3 + 1] = 1.0 * dim; starColors[i * 3 + 2] = 1.0 * dim
      }
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1))
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3))
    const starMat = new THREE.ShaderMaterial({
      uniforms: { uMids: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uMids;
        uniform float uTime;
        void main() {
          vColor = color;
          vec3 pos = position;
          pos += normalize(pos) * sin(uTime * 0.5 + length(pos) * 0.1) * uMids * 0.8;
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (250.0 / -mvPos.z) * (1.0 + uMids * 0.6);
          gl_Position = projectionMatrix * mvPos;
          float twinkle = sin(uTime * 3.0 + length(position) * 0.5) * 0.3 + 0.7;
          vAlpha = (0.18 + uMids * 0.3) * twinkle;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          float alpha = core * vAlpha;
          // Apr 29 TV tuning — was * 1.3 (brightened stars back up after the dim factor),
          // dropped to * 0.7 so dense additive-blended regions don't overpower the sphere.
          gl_FragColor = vec4(vColor * 0.7, alpha);
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const starfield = new THREE.Points(starGeo, starMat)
    scene.add(starfield)
    starfieldRef.current = starfield

    // FREQUENCY RINGS removed — were too bright/white, blocking content
    freqRingsRef.current = []

    // ============ DEEP SPACE OBJECTS ============
    const cosmicGroup = new THREE.Group()

    // --- PLANETS (orbiting at various distances) ---
    const planetData = [
      { radius: 0.6, color: 0xff6b35, emissive: 0x331100, distance: 20, speed: 0.08, y: 4, name: 'Mars' },
      { radius: 0.4, color: 0x4488ff, emissive: 0x001133, distance: 28, speed: 0.05, y: -2, name: 'Neptune' },
      { radius: 0.3, color: 0xff4466, emissive: 0x220011, distance: 35, speed: 0.035, y: 6, name: 'Kepler' },
    ]

    const planets: { mesh: THREE.Mesh; distance: number; speed: number; y: number }[] = []
    for (const p of planetData) {
      const geo = new THREE.SphereGeometry(p.radius, 24, 24)
      const mat = new THREE.MeshStandardMaterial({
        color: p.color,
        emissive: p.emissive,
        emissiveIntensity: 0.5,
        roughness: 0.7,
        metalness: 0.3,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(p.distance, p.y, 0)
      cosmicGroup.add(mesh)
      planets.push({ mesh, distance: p.distance, speed: p.speed, y: p.y })
    }

    // --- NEBULAE (volumetric shader billboards — fluid sim look) ---
    // Each nebula is a stack of billboard planes with FBM noise shaders
    // creating realistic gas cloud appearance with turbulent flow

    const nebulae: THREE.Group[] = []

    // FBM noise shader for volumetric nebula gas
    const nebulaVertShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `
    const nebulaFragShader = `
      uniform float uTime;
      uniform float uBass;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform float uSeed;
      varying vec2 vUv;

      // Simplex-style noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      // Fractal Brownian Motion — layered noise for turbulent gas
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < 6; i++) {
          value += amplitude * snoise(p * frequency);
          frequency *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 uv = vUv - 0.5;
        float dist = length(uv);

        // Radial falloff — gas density drops at edges
        float falloff = 1.0 - smoothstep(0.0, 0.5, dist);
        falloff *= falloff;

        // Turbulent flow with time animation
        float t = uTime * 0.08;
        vec2 flow = vec2(
          fbm(uv * 3.0 + vec2(t * 0.3, t * 0.2) + uSeed),
          fbm(uv * 3.0 + vec2(t * -0.2, t * 0.4) + uSeed + 5.0)
        );

        // Domain warping — distort coordinates by noise (creates realistic gas swirls)
        float n1 = fbm(uv * 2.5 + flow * 0.8 + uSeed);
        float n2 = fbm(uv * 4.0 + flow * 1.2 + uSeed + 10.0);
        float n3 = fbm(uv * 1.5 - flow * 0.5 + uSeed + 20.0);

        // Filament structures — sharp ridges in the gas
        float filaments = abs(n1 - n2) * 2.0;
        filaments = pow(filaments, 0.8);

        // Color mixing — core vs mid vs outer based on density + noise
        float density = (n1 * 0.5 + n2 * 0.3 + filaments * 0.2) * falloff;
        density = clamp(density, 0.0, 1.0);

        // Three-color gradient based on density layers
        vec3 color;
        if (density > 0.5) {
          color = mix(uColor2, uColor1, (density - 0.5) * 2.0);  // Hot core
        } else {
          color = mix(uColor3, uColor2, density * 2.0);  // Cool outer
        }

        // Add bright emission streaks
        float emission = pow(max(filaments * falloff, 0.0), 1.5) * 0.6;
        color += uColor1 * emission;

        // Bass reactivity — brightness pulses
        float bassBoost = 1.0 + uBass * 0.4;

        // Star seeds — tiny bright spots in dense areas
        float stars = pow(max(snoise(uv * 20.0 + uSeed), 0.0), 8.0) * density * 2.0;
        color += vec3(1.0, 0.95, 0.8) * stars;

        float alpha = density * falloff * 0.55 * bassBoost;
        alpha = clamp(alpha, 0.0, 0.7);

        gl_FragColor = vec4(color * bassBoost, alpha);
      }
    `

    const nebulaConfigs = [
      {
        pos: new THREE.Vector3(-28, 6, -30),
        color1: new THREE.Color(0xff8844), color2: new THREE.Color(0xaa44cc), color3: new THREE.Color(0x2244aa),
        scale: 22, seed: 0.0, rotation: 0.3,
      },
      {
        pos: new THREE.Vector3(32, -3, -38),
        color1: new THREE.Color(0x44ffee), color2: new THREE.Color(0x3388aa), color3: new THREE.Color(0x6644aa),
        scale: 18, seed: 42.0, rotation: -0.5,
      },
      {
        pos: new THREE.Vector3(3, 14, -45),
        color1: new THREE.Color(0xff6688), color2: new THREE.Color(0xcc3344), color3: new THREE.Color(0x442200),
        scale: 28, seed: 99.0, rotation: 0.8,
      },
    ]

    for (const cfg of nebulaConfigs) {
      const nebGroup = new THREE.Group()
      nebGroup.position.copy(cfg.pos)

      // Stack 3 billboard planes at slightly different depths for volume
      for (let layer = 0; layer < 3; layer++) {
        const planeGeo = new THREE.PlaneGeometry(cfg.scale, cfg.scale * 0.7)
        const planeMat = new THREE.ShaderMaterial({
          vertexShader: nebulaVertShader,
          fragmentShader: nebulaFragShader,
          uniforms: {
            uTime: { value: 0 },
            uBass: { value: 0 },
            uColor1: { value: cfg.color1 },
            uColor2: { value: cfg.color2 },
            uColor3: { value: cfg.color3 },
            uSeed: { value: cfg.seed + layer * 7.0 },
          },
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
        const plane = new THREE.Mesh(planeGeo, planeMat)
        plane.position.z = layer * 1.5 - 1.5
        plane.rotation.z = cfg.rotation + layer * 0.2
        plane.rotation.y = layer * 0.15
        nebGroup.add(plane)
      }

      cosmicGroup.add(nebGroup)
      nebulae.push(nebGroup)
    }

    // --- HALLEY'S COMET (glowing head + particle tail) ---
    const cometGroup = new THREE.Group()
    const cometHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xccffff })
    )
    // Comet glow
    const cometGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending })
    )
    cometGroup.add(cometHead)
    cometGroup.add(cometGlow)

    // Comet tail (stretched particles)
    const tailCount = 200
    const tailPositions = new Float32Array(tailCount * 3)
    const tailColors = new Float32Array(tailCount * 3)
    for (let i = 0; i < tailCount; i++) {
      const t = i / tailCount
      tailPositions[i * 3] = t * 8 + Math.random() * 0.3
      tailPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.4 * (1 - t)
      tailPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.4 * (1 - t)
      const c = new THREE.Color().setHSL(0.55, 0.8, 0.7 - t * 0.5)
      tailColors[i * 3] = c.r
      tailColors[i * 3 + 1] = c.g
      tailColors[i * 3 + 2] = c.b
    }
    const tailGeo = new THREE.BufferGeometry()
    tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPositions, 3))
    tailGeo.setAttribute('color', new THREE.BufferAttribute(tailColors, 3))
    const tailMat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    cometGroup.add(new THREE.Points(tailGeo, tailMat))
    cometGroup.position.set(-40, 8, -15)
    cosmicGroup.add(cometGroup)

    // --- UAPs (glowing disc-shaped craft) ---
    const uapCount = 3
    const uaps: THREE.Group[] = []
    for (let u = 0; u < uapCount; u++) {
      const uapGroup = new THREE.Group()
      // Disc body
      const discGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.08, 32)
      const discMat = new THREE.MeshStandardMaterial({
        color: 0x888899,
        emissive: 0x222233,
        emissiveIntensity: 0.8,
        metalness: 0.9,
        roughness: 0.1,
      })
      const disc = new THREE.Mesh(discGeo, discMat)
      uapGroup.add(disc)

      // Dome on top
      const domeGeo = new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
      const domeMat = new THREE.MeshBasicMaterial({
        color: 0x44ffaa,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      })
      const dome = new THREE.Mesh(domeGeo, domeMat)
      dome.position.y = 0.04
      uapGroup.add(dome)

      // Ring light around disc
      const ringGeo = new THREE.TorusGeometry(0.55, 0.03, 8, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ffcc,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      })
      uapGroup.add(new THREE.Mesh(ringGeo, ringMat))

      uapGroup.position.set(
        (Math.random() - 0.5) * 50,
        5 + Math.random() * 10,
        -10 - Math.random() * 20
      )
      uapGroup.scale.setScalar(0.6 + Math.random() * 0.4)
      cosmicGroup.add(uapGroup)
      uaps.push(uapGroup)
    }

    // --- INTERSTELLAR SHUTTLE (geometric wedge shape) ---
    const shuttleGroup = new THREE.Group()
    // Fuselage
    const fuselageGeo = new THREE.ConeGeometry(0.3, 2.5, 4)
    const fuselageMat = new THREE.MeshStandardMaterial({
      color: 0xaabbcc,
      emissive: 0x111122,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
    })
    const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat)
    fuselage.rotation.z = Math.PI / 2
    shuttleGroup.add(fuselage)

    // Engine glow
    const engineGeo = new THREE.SphereGeometry(0.2, 8, 8)
    const engineMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    })
    const engine = new THREE.Mesh(engineGeo, engineMat)
    engine.position.x = -1.3
    shuttleGroup.add(engine)

    // Engine trail
    const trailGeo = new THREE.ConeGeometry(0.15, 1.5, 8)
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0x2266ff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    })
    const trail = new THREE.Mesh(trailGeo, trailMat)
    trail.rotation.z = -Math.PI / 2
    trail.position.x = -2.2
    shuttleGroup.add(trail)

    shuttleGroup.position.set(35, 6, -12)
    shuttleGroup.scale.setScalar(0.8)
    cosmicGroup.add(shuttleGroup)

    scene.add(cosmicGroup)

    // Store refs for animation
    const cosmicRefs = { planets, nebulae, cometGroup, uaps, shuttleGroup, cosmicGroup }

    // ============ TRON GRID FLOOR ============
    const gridGroup = new THREE.Group()
    const gridSize = 80
    const gridDivisions = 60
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x0a3050,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    })
    // X lines
    for (let i = -gridDivisions / 2; i <= gridDivisions / 2; i++) {
      const geo = new THREE.BufferGeometry()
      const x = (i / gridDivisions) * gridSize * 2
      geo.setFromPoints([
        new THREE.Vector3(x, 0, -gridSize),
        new THREE.Vector3(x, 0, gridSize)
      ])
      gridGroup.add(new THREE.Line(geo, gridMat))
    }
    // Z lines
    for (let i = -gridDivisions / 2; i <= gridDivisions / 2; i++) {
      const geo = new THREE.BufferGeometry()
      const z = (i / gridDivisions) * gridSize * 2
      geo.setFromPoints([
        new THREE.Vector3(-gridSize, 0, z),
        new THREE.Vector3(gridSize, 0, z)
      ])
      gridGroup.add(new THREE.Line(geo, gridMat))
    }
    gridGroup.position.y = -3.5
    scene.add(gridGroup)
    gridRef.current = gridGroup

    // ============ ECOSYSTEM NODES + TEXT LABELS + ENERGY BEAMS ============
    const nodeGroup = new THREE.Group()
    const beamGroup = new THREE.Group()

    ECOSYSTEM_NODES.forEach((node, i) => {
      const angle = (i / ECOSYSTEM_NODES.length) * Math.PI * 2

      // Node mesh (icosahedron for more futuristic look)
      const nodeGeo = new THREE.IcosahedronGeometry(0.2, 1)
      const nodeMat = new THREE.MeshBasicMaterial({
        color: node.color,
        transparent: true,
        opacity: 0.9,
        wireframe: true,
      })
      const mesh = new THREE.Mesh(nodeGeo, nodeMat)
      mesh.position.set(
        Math.cos(angle) * 4.5,
        Math.sin(angle) * 1.2,
        Math.sin(angle) * 4.5
      )
      mesh.userData = { baseAngle: angle, label: node.label }
      nodeGroup.add(mesh)

      // Text sprite label
      const sprite = createTextSprite(node.label, node.color)
      sprite.position.copy(mesh.position)
      sprite.position.y += 0.5
      sprite.userData = { baseAngle: angle }
      nodeGroup.add(sprite)

      // Point light
      const light = new THREE.PointLight(node.color, 0.5, 5)
      light.position.copy(mesh.position)
      light.userData = { baseAngle: angle }
      nodeGroup.add(light)

      // Energy beam from orb to node
      const beamGeo = new THREE.BufferGeometry()
      beamGeo.setFromPoints([new THREE.Vector3(0, 0, 0), mesh.position.clone()])
      const beamMat = new THREE.LineBasicMaterial({
        color: node.color,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
      })
      const beam = new THREE.Line(beamGeo, beamMat)
      beam.userData = { baseAngle: angle, nodeIndex: i }
      beamGroup.add(beam)
    })

    scene.add(nodeGroup)
    scene.add(beamGroup)
    nodeGroupRef.current = nodeGroup
    beamsRef.current = beamGroup

    // Ambient fill
    scene.add(new THREE.AmbientLight(0x080818, 0.3))

    // ==================== ANIMATION LOOP ====================
    let frameCount = 0
    let lastRenderTime = 0
    // Frame budgets: tighter when actively playing, much looser when paused so the
    // GPU stays mostly idle (was burning the same budget regardless of audio state,
    // which was the dominant heat/battery culprit on mobile).
    const playingIntervalMs = isMobile ? 41.66 : 0          // ~24fps mobile / uncapped desktop
    const pausedIntervalMs = isMobile ? 200 : 66.66         // ~5fps mobile / ~15fps desktop

    const animate = (timestamp?: number) => {
      // Tab hidden — fully stop. The visibilitychange listener below restarts us.
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

      // Smooth audio values (lerp)
      const lf = 1.0 - Math.pow(0.0005, delta)
      smoothBassRef.current += (bass - smoothBassRef.current) * lf
      smoothMidsRef.current += (mids - smoothMidsRef.current) * lf
      smoothHighsRef.current += (highs - smoothHighsRef.current) * lf
      const sBass = smoothBassRef.current
      const sMids = smoothMidsRef.current
      const sHighs = smoothHighsRef.current

      // --- Central orb ---
      if (orbRef.current && orbMaterialRef.current) {
        orbMaterialRef.current.uniforms.uTime.value = elapsed
        orbMaterialRef.current.uniforms.uBass.value = sBass
        orbRef.current.rotation.y = elapsed * 0.5
        orbRef.current.rotation.x = Math.sin(elapsed * 0.3) * 0.25
      }

      // --- Glow ---
      if (glowRef.current) {
        const gm = glowRef.current.material as THREE.ShaderMaterial
        gm.uniforms.uBass.value = sBass
        glowRef.current.scale.setScalar(1.0 + sBass * 0.5)
      }

      // --- Helix ---
      if (helixParticlesRef.current) {
        helixParticlesRef.current.rotation.y = elapsed * 0.25
        helixParticlesRef.current.rotation.x = Math.sin(elapsed * 0.04) * 0.15
        const hm = helixParticlesRef.current.material as THREE.ShaderMaterial
        hm.uniforms.uMids.value = sMids
        hm.uniforms.uTime.value = elapsed
      }

      // --- Starfield ---
      if (starfieldRef.current) {
        const sm = starfieldRef.current.material as THREE.ShaderMaterial
        sm.uniforms.uMids.value = sMids
        sm.uniforms.uTime.value = elapsed
        starfieldRef.current.rotation.y = elapsed * 0.015
        starfieldRef.current.rotation.x = elapsed * 0.008
      }

      // --- DEEP SPACE ANIMATION ---
      if (cosmicRefs) {
        // Planets orbit
        for (const p of cosmicRefs.planets) {
          const angle = elapsed * p.speed
          p.mesh.position.x = Math.cos(angle) * p.distance
          p.mesh.position.z = Math.sin(angle) * p.distance
          p.mesh.position.y = p.y + Math.sin(elapsed * 0.3 + p.distance) * 0.5
          p.mesh.rotation.y = elapsed * 0.5
        }

        // Nebulae — update shader uniforms for fluid sim animation
        for (let i = 0; i < cosmicRefs.nebulae.length; i++) {
          const neb = cosmicRefs.nebulae[i]
          neb.rotation.y = elapsed * 0.005 * (i + 1)
          // Update all shader planes with time + bass
          neb.children.forEach(child => {
            if (child instanceof THREE.Mesh) {
              const mat = child.material as THREE.ShaderMaterial
              if (mat.uniforms?.uTime) mat.uniforms.uTime.value = elapsed
              if (mat.uniforms?.uBass) mat.uniforms.uBass.value = sBass
            }
          })
        }

        // Halley's comet — sweeps across the scene
        const cometT = (elapsed * 0.15) % 1
        cosmicRefs.cometGroup.position.x = -40 + cometT * 80
        cosmicRefs.cometGroup.position.y = 8 + Math.sin(cometT * Math.PI) * 5
        cosmicRefs.cometGroup.position.z = -15 + Math.sin(cometT * Math.PI * 2) * 8
        cosmicRefs.cometGroup.rotation.y = -Math.atan2(80 * 0.15, Math.cos(cometT * Math.PI) * 5 * Math.PI) + Math.PI

        // UAPs — erratic movement patterns
        for (let u = 0; u < cosmicRefs.uaps.length; u++) {
          const uap = cosmicRefs.uaps[u]
          const uSpeed = 0.3 + u * 0.2
          uap.position.x += Math.sin(elapsed * uSpeed + u * 2) * 0.03
          uap.position.y += Math.cos(elapsed * uSpeed * 0.7 + u) * 0.02
          uap.position.z += Math.sin(elapsed * uSpeed * 0.5 + u * 3) * 0.02
          uap.rotation.y = elapsed * 2  // Fast spin
          // Occasional "dart" movement (UAP signature)
          if (Math.sin(elapsed * 0.5 + u * 1.5) > 0.98) {
            uap.position.x += (Math.random() - 0.5) * 2
            uap.position.y += (Math.random() - 0.5) * 1
          }
          // Keep in bounds
          if (Math.abs(uap.position.x) > 35) uap.position.x *= 0.95
          if (uap.position.y > 18 || uap.position.y < 2) uap.position.y = 8
        }

        // Interstellar shuttle — slow cruise
        cosmicRefs.shuttleGroup.position.x = 35 - (elapsed * 0.3) % 70
        cosmicRefs.shuttleGroup.position.y = 6 + Math.sin(elapsed * 0.2) * 1.5
        cosmicRefs.shuttleGroup.rotation.y = Math.sin(elapsed * 0.1) * 0.2
      }

      // --- 3 Frequency rings (skip geometry updates every other frame on mobile) ---
      freqRingsRef.current.forEach((ring, ringIdx) => {
        const { baseRadius, segments } = ring.userData as { baseRadius: number; segments: number }
        const positions = ring.geometry.attributes.position as THREE.BufferAttribute
        if (dataArrayRef.current && (!isMobile || frameCount % 3 === 0)) {
          const data = dataArrayRef.current
          for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2
            const freqIndex = Math.floor((i / segments) * data.length)
            const freqValue = (data[freqIndex] || 0) / 255
            const reactivity = [1.5, 1.0, 0.6][ringIdx]
            const radius = baseRadius + freqValue * reactivity
            positions.setXYZ(i, Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
          }
          positions.needsUpdate = true
        }
        ring.rotation.z = elapsed * (0.08 + ringIdx * 0.04) * (ringIdx % 2 === 0 ? 1 : -1)
        const rMat = ring.material as THREE.LineBasicMaterial
        rMat.opacity = [0.6, 0.35, 0.2][ringIdx] + sBass * 0.4
      })

      // --- Grid pulse (throttle material updates on mobile) ---
      if (gridRef.current && (!isMobile || frameCount % 4 === 0)) {
        gridRef.current.children.forEach((line) => {
          const mat = line instanceof THREE.Line ? (line.material as THREE.LineBasicMaterial) : null
          if (mat) mat.opacity = 0.15 + sBass * 0.25
        })
      }

      // --- Ecosystem nodes orbit ---
      if (nodeGroupRef.current) {
        const children = nodeGroupRef.current.children
        children.forEach((child) => {
          const baseAngle = child.userData.baseAngle as number | undefined
          if (baseAngle === undefined) return
          const op = orbitParamsRef.current
          const angle = baseAngle + elapsed * op.speed
          const radius = op.radiusBase + Math.sin(elapsed * op.wobble + baseAngle) * op.radiusWave

          if (child instanceof THREE.Mesh) {
            child.position.x = Math.cos(angle) * radius
            child.position.z = Math.sin(angle) * radius * Math.cos(op.tilt) // Tilted orbit plane
            child.position.y = Math.sin(elapsed * op.tilt + baseAngle * 2) * op.yAmplitude
            child.rotation.x = elapsed * op.spinX
            child.rotation.z = elapsed * op.spinZ
            child.scale.setScalar(1.0 + sHighs * 1.0)
          } else if (child instanceof THREE.Sprite) {
            // Sprite follows the mesh above
            const meshSibling = children.find(
              (c) => c instanceof THREE.Mesh && c.userData.baseAngle === baseAngle
            )
            if (meshSibling) {
              child.position.copy(meshSibling.position)
              child.position.y += 0.5
            }
          } else if (child instanceof THREE.PointLight) {
            const meshSibling = children.find(
              (c) => c instanceof THREE.Mesh && c.userData.baseAngle === baseAngle
            )
            if (meshSibling) child.position.copy(meshSibling.position)
          }
        })
        nodeGroupRef.current.rotation.y = elapsed * 0.03
      }

      // --- Energy beams update ---
      if (beamsRef.current && nodeGroupRef.current) {
        beamsRef.current.children.forEach((beam) => {
          if (!(beam instanceof THREE.Line)) return
          const { baseAngle, nodeIndex } = beam.userData as { baseAngle: number; nodeIndex: number }
          const meshes = nodeGroupRef.current!.children.filter(c => c instanceof THREE.Mesh)
          const targetMesh = meshes[nodeIndex]
          if (targetMesh) {
            const positions = beam.geometry.attributes.position as THREE.BufferAttribute
            positions.setXYZ(0, 0, 0, 0)
            positions.setXYZ(1, targetMesh.position.x, targetMesh.position.y, targetMesh.position.z)
            positions.needsUpdate = true
          }
          const bMat = beam.material as THREE.LineBasicMaterial
          bMat.opacity = 0.04 + sHighs * 0.15 + Math.sin(elapsed * 2 + baseAngle) * 0.03
        })
      }

      // --- Bloom intensity reacts to bass ---
      if (bloomPassRef.current) {
        bloomPassRef.current.strength = 0.6 + sBass * 0.6
      }

      // --- Cinematic camera orbit ---
      const camRadius = 7.5 + Math.sin(elapsed * 0.05) * 1.5
      const camAngle = elapsed * 0.06
      const camHeight = 1.5 + Math.sin(elapsed * 0.08) * 1.5
      camera.position.x = Math.sin(camAngle) * camRadius
      camera.position.z = Math.cos(camAngle) * camRadius
      camera.position.y = camHeight
      camera.lookAt(0, 0, 0)

      // Render with bloom
      composer.render()
    }

    clockRef.current.start()
    animate()

    // Resize
    const handleResize = () => {
      if (!container || !renderer || !camera || !composer) return
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h)
      composer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    // Pause the entire RAF loop when the tab is backgrounded — was a major source
    // of phantom battery drain (post-bloom + 12K particles rendering even when
    // the user wasn't looking at the page).
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
      cancelAnimationFrame(animFrameRef.current)
      renderer.dispose()
      scene.clear()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, []) // Mount once

  // Update palette when genre changes
  useEffect(() => {
    const palette = getPalette()
    if (orbMaterialRef.current) {
      orbMaterialRef.current.uniforms.uPrimary.value.copy(palette.primary)
      orbMaterialRef.current.uniforms.uSecondary.value.copy(palette.secondary)
    }
    if (glowRef.current) {
      const gm = glowRef.current.material as THREE.ShaderMaterial
      gm.uniforms.uColor.value.copy(palette.primary)
    }
    // Update ring colors
    freqRingsRef.current.forEach((ring, i) => {
      const rm = ring.material as THREE.LineBasicMaterial
      const colors = [palette.primary, palette.secondary, palette.accent]
      rm.color.copy(colors[i] || palette.primary)
    })
  }, [genre, getPalette])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  )
}
