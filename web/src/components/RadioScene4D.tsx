/**
 * RadioScene4D — Immersive audio-reactive 3D scene for OGUN Radio
 *
 * 4D = 3D space + time/audio reactivity
 * - Central artwork orb pulses with bass
 * - Double helix particle stream orbits the center
 * - Floating ecosystem nodes (Polygon, IPFS, Agents, ClawHub, npm)
 * - Circular frequency ring visualizer
 * - Particle starfield reacts to mids/highs
 * - Genre-aware color palette shifts
 */

import React, { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'

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
  { label: 'AGENTS', color: 0x00ff88 },
  { label: 'CLAWHUB', color: 0xff6600 },
  { label: 'NPM', color: 0xcb3837 },
  { label: 'OGUN', color: 0xffd700 },
]

export default function RadioScene4D({ audioRef, isPlaying, artworkUrl, genre }: RadioScene4DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const animFrameRef = useRef<number>(0)
  const clockRef = useRef(new THREE.Clock())
  const artworkTextureRef = useRef<THREE.Texture | null>(null)
  const artworkUrlRef = useRef<string>('')

  // Mutable refs for scene objects
  const orbRef = useRef<THREE.Mesh | null>(null)
  const orbMaterialRef = useRef<THREE.ShaderMaterial | null>(null)
  const helixParticlesRef = useRef<THREE.Points | null>(null)
  const starfieldRef = useRef<THREE.Points | null>(null)
  const freqRingRef = useRef<THREE.Line | null>(null)
  const nodeGroupRef = useRef<THREE.Group | null>(null)
  const glowRef = useRef<THREE.Mesh | null>(null)

  const getPalette = useCallback(() => {
    if (!genre) return DEFAULT_PALETTE
    const key = genre.toLowerCase().replace(/\s+/g, '-')
    return GENRE_PALETTES[key] || DEFAULT_PALETTE
  }, [genre])

  // Connect Web Audio API analyser to audio element
  useEffect(() => {
    if (!audioRef.current) return

    const audio = audioRef.current
    const connectAnalyser = () => {
      if (analyserRef.current) return // already connected

      try {
        const ctx = audioCtxRef.current || new AudioContext()
        audioCtxRef.current = ctx

        if (!sourceRef.current) {
          sourceRef.current = ctx.createMediaElementSource(audio)
        }

        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.8

        sourceRef.current.connect(analyser)
        analyser.connect(ctx.destination)

        analyserRef.current = analyser
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
      } catch (e) {
        // Audio context may fail in some browsers — scene still renders without reactivity
        console.warn('[4D Radio] Audio analyser setup failed:', e)
      }
    }

    // Connect on first play
    audio.addEventListener('play', connectAnalyser, { once: true })

    return () => {
      audio.removeEventListener('play', connectAnalyser)
    }
  }, [audioRef])

  // Resume AudioContext when playing (browsers suspend by default)
  useEffect(() => {
    if (isPlaying && audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
  }, [isPlaying])

  // Load artwork texture when URL changes
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
        // Update orb material
        if (orbMaterialRef.current) {
          orbMaterialRef.current.uniforms.uTexture.value = texture
          orbMaterialRef.current.uniforms.uHasTexture.value = 1.0
        }
      },
      undefined,
      () => {
        // Failed to load artwork — orb stays gradient
        if (orbMaterialRef.current) {
          orbMaterialRef.current.uniforms.uHasTexture.value = 0.0
        }
      }
    )
  }, [artworkUrl])

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Scene
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x030d1b, 0.035)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
    camera.position.set(0, 0, 6)
    cameraRef.current = camera

    // --- CENTRAL ORB (album art sphere) ---
    const orbGeo = new THREE.SphereGeometry(1.2, 64, 64)
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

          // Bass-reactive displacement
          float displacement = sin(position.x * 4.0 + uTime * 2.0) * sin(position.y * 4.0 + uTime * 1.5) * sin(position.z * 4.0 + uTime) * uBass * 0.15;
          vec3 pos = position + normal * displacement;
          // Breathing scale
          float scale = 1.0 + uBass * 0.08;
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
            // Add subtle energy glow from bass
            float energy = uBass * 0.3;
            color += uPrimary * energy * 0.5;
          } else {
            // Gradient fallback
            float t = vUv.y + sin(vUv.x * 6.28 + uTime) * 0.1;
            color = mix(uPrimary, uSecondary, t);
            // Pulsing energy
            float pulse = sin(uTime * 3.0) * 0.5 + 0.5;
            color += vec3(pulse * uBass * 0.3);
          }

          // Rim lighting
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
          rim = pow(rim, 3.0);
          color += uPrimary * rim * (0.5 + uBass * 0.5);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })
    const orb = new THREE.Mesh(orbGeo, orbMat)
    scene.add(orb)
    orbRef.current = orb
    orbMaterialRef.current = orbMat

    // --- GLOW SPHERE (additive bloom around orb) ---
    const glowGeo = new THREE.SphereGeometry(1.5, 32, 32)
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: DEFAULT_PALETTE.primary },
        uBass: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uBass;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          float alpha = intensity * (0.3 + uBass * 0.4);
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    scene.add(glow)
    glowRef.current = glow

    // --- DOUBLE HELIX PARTICLES ---
    const helixCount = 2000
    const helixPositions = new Float32Array(helixCount * 3)
    const helixColors = new Float32Array(helixCount * 3)
    for (let i = 0; i < helixCount; i++) {
      const t = (i / helixCount) * Math.PI * 8
      const strand = i % 2 === 0 ? 1 : -1
      const radius = 2.0 + Math.sin(t * 0.5) * 0.3
      helixPositions[i * 3] = Math.cos(t) * radius * strand
      helixPositions[i * 3 + 1] = (i / helixCount - 0.5) * 8
      helixPositions[i * 3 + 2] = Math.sin(t) * radius * strand

      // Color gradient along helix
      const ct = i / helixCount
      helixColors[i * 3] = ct
      helixColors[i * 3 + 1] = 1.0 - ct * 0.5
      helixColors[i * 3 + 2] = 0.5 + ct * 0.5
    }
    const helixGeo = new THREE.BufferGeometry()
    helixGeo.setAttribute('position', new THREE.BufferAttribute(helixPositions, 3))
    helixGeo.setAttribute('color', new THREE.BufferAttribute(helixColors, 3))
    const helixMat = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const helixPoints = new THREE.Points(helixGeo, helixMat)
    scene.add(helixPoints)
    helixParticlesRef.current = helixPoints

    // --- STARFIELD (background particles) ---
    const starCount = 3000
    const starPositions = new Float32Array(starCount * 3)
    const starSizes = new Float32Array(starCount)
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 40
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 40
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 40
      starSizes[i] = Math.random() * 2 + 0.5
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1))
    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        uMids: { value: 0 },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        attribute float size;
        uniform float uMids;
        uniform float uTime;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          // Subtle breathing
          pos += normalize(pos) * sin(uTime + length(pos)) * uMids * 0.3;
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (200.0 / -mvPos.z) * (1.0 + uMids * 0.5);
          gl_Position = projectionMatrix * mvPos;
          vAlpha = 0.3 + uMids * 0.4 + sin(uTime * 2.0 + length(position) * 0.5) * 0.2;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = (1.0 - d * 2.0) * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const starfield = new THREE.Points(starGeo, starMat)
    scene.add(starfield)
    starfieldRef.current = starfield

    // --- FREQUENCY RING (circular audio visualizer) ---
    const ringSegments = 128
    const ringPositions = new Float32Array(ringSegments * 3)
    for (let i = 0; i < ringSegments; i++) {
      const angle = (i / ringSegments) * Math.PI * 2
      ringPositions[i * 3] = Math.cos(angle) * 2.5
      ringPositions[i * 3 + 1] = Math.sin(angle) * 2.5
      ringPositions[i * 3 + 2] = 0
    }
    const ringGeo = new THREE.BufferGeometry()
    ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3))
    const ringMat = new THREE.LineBasicMaterial({
      color: DEFAULT_PALETTE.primary,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    })
    const freqRing = new THREE.LineLoop(ringGeo, ringMat)
    freqRing.rotation.x = Math.PI * 0.5
    scene.add(freqRing)
    freqRingRef.current = freqRing

    // --- ECOSYSTEM FLOATING NODES ---
    const nodeGroup = new THREE.Group()
    ECOSYSTEM_NODES.forEach((node, i) => {
      const angle = (i / ECOSYSTEM_NODES.length) * Math.PI * 2
      const nodeGeo = new THREE.OctahedronGeometry(0.15, 0)
      const nodeMat = new THREE.MeshBasicMaterial({
        color: node.color,
        transparent: true,
        opacity: 0.8,
        wireframe: true,
      })
      const mesh = new THREE.Mesh(nodeGeo, nodeMat)
      mesh.position.set(
        Math.cos(angle) * 3.5,
        Math.sin(angle) * 0.8,
        Math.sin(angle) * 3.5
      )
      mesh.userData = { baseAngle: angle, label: node.label }
      nodeGroup.add(mesh)

      // Point light for each node
      const light = new THREE.PointLight(node.color, 0.3, 3)
      light.position.copy(mesh.position)
      nodeGroup.add(light)
    })
    scene.add(nodeGroup)
    nodeGroupRef.current = nodeGroup

    // Ambient light
    scene.add(new THREE.AmbientLight(0x111122, 0.5))

    // --- ANIMATION LOOP ---
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)

      const elapsed = clockRef.current.getElapsedTime()
      const delta = clockRef.current.getDelta()

      // Read frequency data
      let bass = 0, mids = 0, highs = 0
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)
        const data = dataArrayRef.current
        const len = data.length

        // Bass: bins 0-10, Mids: bins 10-60, Highs: bins 60+
        for (let i = 0; i < 10; i++) bass += data[i]
        bass = bass / (10 * 255)
        for (let i = 10; i < 60; i++) mids += data[i]
        mids = mids / (50 * 255)
        for (let i = 60; i < len; i++) highs += data[i]
        highs = highs / ((len - 60) * 255)
      }

      // Smooth values (lerp toward target)
      const lerpFactor = 1.0 - Math.pow(0.001, delta)

      // Update central orb
      if (orbRef.current && orbMaterialRef.current) {
        orbMaterialRef.current.uniforms.uTime.value = elapsed
        orbMaterialRef.current.uniforms.uBass.value += (bass - orbMaterialRef.current.uniforms.uBass.value) * lerpFactor
        orbRef.current.rotation.y = elapsed * 0.15
        orbRef.current.rotation.x = Math.sin(elapsed * 0.1) * 0.1
      }

      // Update glow
      if (glowRef.current) {
        const glowMat = glowRef.current.material as THREE.ShaderMaterial
        glowMat.uniforms.uBass.value += (bass - glowMat.uniforms.uBass.value) * lerpFactor
        const glowScale = 1.0 + bass * 0.3
        glowRef.current.scale.setScalar(glowScale)
      }

      // Rotate helix
      if (helixParticlesRef.current) {
        helixParticlesRef.current.rotation.y = elapsed * 0.3
        helixParticlesRef.current.rotation.x = Math.sin(elapsed * 0.05) * 0.2
        const hMat = helixParticlesRef.current.material as THREE.PointsMaterial
        hMat.opacity = 0.4 + mids * 0.6
        hMat.size = 0.02 + mids * 0.03
      }

      // Starfield reactivity
      if (starfieldRef.current) {
        const sMat = starfieldRef.current.material as THREE.ShaderMaterial
        sMat.uniforms.uMids.value += (mids - sMat.uniforms.uMids.value) * lerpFactor
        sMat.uniforms.uTime.value = elapsed
        starfieldRef.current.rotation.y = elapsed * 0.02
        starfieldRef.current.rotation.x = elapsed * 0.01
      }

      // Frequency ring — deform based on FFT data
      if (freqRingRef.current && dataArrayRef.current) {
        const positions = freqRingRef.current.geometry.attributes.position as THREE.BufferAttribute
        const data = dataArrayRef.current
        for (let i = 0; i < ringSegments; i++) {
          const angle = (i / ringSegments) * Math.PI * 2
          const freqIndex = Math.floor((i / ringSegments) * data.length)
          const freqValue = (data[freqIndex] || 0) / 255
          const radius = 2.5 + freqValue * 1.2
          positions.setXYZ(i, Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
        }
        positions.needsUpdate = true
        freqRingRef.current.rotation.z = elapsed * 0.1
        const rMat = freqRingRef.current.material as THREE.LineBasicMaterial
        rMat.opacity = 0.3 + bass * 0.7
      }

      // Orbit ecosystem nodes
      if (nodeGroupRef.current) {
        nodeGroupRef.current.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            const baseAngle = child.userData.baseAngle as number
            const orbitSpeed = 0.2
            const angle = baseAngle + elapsed * orbitSpeed
            const radius = 3.5 + Math.sin(elapsed * 0.5 + baseAngle) * 0.5
            child.position.x = Math.cos(angle) * radius
            child.position.z = Math.sin(angle) * radius
            child.position.y = Math.sin(elapsed * 0.3 + baseAngle * 2) * 1.0
            child.rotation.x = elapsed * 1.5
            child.rotation.z = elapsed * 1.0
            // Pulse with highs
            const nodeScale = 1.0 + highs * 0.8
            child.scale.setScalar(nodeScale)
          }
          if (child instanceof THREE.PointLight && child.parent) {
            // Lights follow their mesh siblings
            const meshSibling = nodeGroupRef.current!.children.find(
              (c) => c instanceof THREE.Mesh && c.userData.baseAngle === child.userData?.baseAngle
            )
            if (meshSibling) child.position.copy(meshSibling.position)
          }
        })
        nodeGroupRef.current.rotation.y = elapsed * 0.05
      }

      // Gentle camera breathing
      camera.position.x = Math.sin(elapsed * 0.1) * 0.3
      camera.position.y = Math.cos(elapsed * 0.15) * 0.2
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }

    clockRef.current.start()
    animate()

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h)
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
    if (freqRingRef.current) {
      const rm = freqRingRef.current.material as THREE.LineBasicMaterial
      rm.color.copy(palette.primary)
    }
  }, [genre, getPalette])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  )
}
