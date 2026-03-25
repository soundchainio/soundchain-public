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
  { label: 'POLYGON', color: 0x8247e5 },
  { label: 'IPFS', color: 0x65c2cb },
  { label: 'SCID', color: 0x00e5ff },
  { label: 'AGENTS', color: 0x00ff88 },
  { label: 'CLAWHUB', color: 0xff6600 },
  { label: 'NPM', color: 0xcb3837 },
  { label: 'OGUN', color: 0xffd700 },
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

  const getPalette = useCallback(() => {
    if (!genre) return DEFAULT_PALETTE
    const key = genre.toLowerCase().replace(/\s+/g, '-')
    return GENRE_PALETTES[key] || DEFAULT_PALETTE
  }, [genre])

  // Connect Web Audio API analyser
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
      } catch (e) {
        console.warn('[4D Radio] Audio analyser setup failed:', e)
      }
    }
    audio.addEventListener('play', connectAnalyser, { once: true })
    return () => { audio.removeEventListener('play', connectAnalyser) }
  }, [audioRef])

  // Resume AudioContext
  useEffect(() => {
    if (isPlaying && audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
  }, [isPlaying])

  // Load artwork texture
  useEffect(() => {
    if (!artworkUrl || artworkUrl === artworkUrlRef.current) return
    artworkUrlRef.current = artworkUrl
    const loader = new THREE.TextureLoader()
    loader.crossOrigin = 'anonymous'
    loader.load(
      artworkUrl,
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
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x020810, 1)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // --- Scene ---
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x020810, 0.018)
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
      new THREE.Vector2(width, height),
      0.8,   // strength — subtle glow (was 1.8)
      0.4,   // radius — tighter bloom (was 0.6)
      0.4    // threshold — only bright objects bloom (was 0.15)
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
            color = texture2D(uTexture, vUv).rgb;
            // Energy injection from bass
            float energy = uBass * 0.5;
            color += uPrimary * energy * 0.4;
            // Boost brightness for bloom to catch
            color *= 1.2 + uBass * 0.3;
          } else {
            float t = vUv.y + sin(vUv.x * 6.28 + uTime * 2.0) * 0.15;
            color = mix(uPrimary, uSecondary, t);
            float pulse = sin(uTime * 4.0) * 0.5 + 0.5;
            color += vec3(pulse * uBass * 0.5);
            color *= 1.5;
          }
          // Subtle rim lighting
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
          rim = pow(rim, 3.0);
          color += uPrimary * rim * 0.3;
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
      // Dimmed color variation (40% brightness for readability)
      const colorChoice = Math.random()
      const dim = 0.4
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
          vAlpha = (0.3 + uMids * 0.5) * twinkle;
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
          gl_FragColor = vec4(vColor * 1.3, alpha);
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
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)
      const elapsed = clockRef.current.getElapsedTime()
      const delta = clockRef.current.getDelta()

      // Read FFT
      let bass = 0, mids = 0, highs = 0
      if (analyserRef.current && dataArrayRef.current) {
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

      // --- 3 Frequency rings ---
      freqRingsRef.current.forEach((ring, ringIdx) => {
        const { baseRadius, segments } = ring.userData as { baseRadius: number; segments: number }
        const positions = ring.geometry.attributes.position as THREE.BufferAttribute
        if (dataArrayRef.current) {
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

      // --- Grid pulse ---
      if (gridRef.current) {
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
          const orbitSpeed = 0.15
          const angle = baseAngle + elapsed * orbitSpeed
          const radius = 4.5 + Math.sin(elapsed * 0.4 + baseAngle) * 0.6

          if (child instanceof THREE.Mesh) {
            child.position.x = Math.cos(angle) * radius
            child.position.z = Math.sin(angle) * radius
            child.position.y = Math.sin(elapsed * 0.25 + baseAngle * 2) * 1.2
            child.rotation.x = elapsed * 2.0
            child.rotation.z = elapsed * 1.5
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

    return () => {
      window.removeEventListener('resize', handleResize)
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
