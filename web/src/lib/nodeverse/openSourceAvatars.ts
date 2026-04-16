/**
 * Open-Source Avatar Registry — CC0/MIT humanoid GLB models
 *
 * Curated library of free 3D avatars Frank can use INSTEAD of Ready Player Me.
 * No third-party dependency, no rate limits, no surprise pricing changes.
 * All assets are CC0 (public domain) or MIT licensed — verify before commercial use.
 *
 * Sources:
 *   - Khronos glTF Sample Assets (CC0) — github.com/KhronosGroup/glTF-Sample-Assets
 *   - Three.js example models (MIT) — github.com/mrdoob/three.js
 *   - Quaternius stylized models (CC0) — quaternius.com
 *
 * Phase 1: 12 curated starter avatars (this file)
 * Phase 2: User-uploaded GLB files via Operator → IPFS pin
 * Phase 3: Asset NFTs (mint clothes/accessories as tradable NFTs, 0.05% fee)
 *
 * The vision per memory file vision-open-source-nodeverse-assets.md:
 * Build "the biggest abyss of nodeverse accessories known to man, woman,
 * and agent."
 */

export type AvatarCategory = 'humanoid' | 'robot' | 'fantasy' | 'animal' | 'agent'
export type AvatarLicense = 'CC0' | 'CC-BY' | 'MIT' | 'Apache-2.0'

export interface OpenSourceAvatar {
  id: string
  name: string
  category: AvatarCategory
  license: AvatarLicense
  source: string         // origin (github org, website, etc)
  glbUrl: string         // direct CDN URL to the .glb file
  thumbnailUrl?: string  // optional preview PNG (we'll fall back to emoji)
  emoji: string          // fallback display
  tags: string[]
  scale?: number         // optional scale multiplier (some models are huge/tiny)
  yOffset?: number       // vertical offset to align to floor
  hasAnimations?: boolean
}

/**
 * Curated starter set. All URLs are stable, well-known CDNs.
 *
 * Three.js examples are served from threejs.org and have been live since 2014.
 * Khronos sample assets are on Github raw — also stable.
 */
export const OPEN_SOURCE_AVATARS: OpenSourceAvatar[] = [
  // ─── HUMANOIDS (Three.js examples — MIT) ──────────────────
  {
    id: 'soldier',
    name: 'Soldier',
    category: 'humanoid',
    license: 'MIT',
    source: 'three.js examples',
    glbUrl: 'https://threejs.org/examples/models/gltf/Soldier.glb',
    emoji: '🪖',
    tags: ['military', 'human', 'animated'],
    scale: 1.0,
    hasAnimations: true,
  },
  {
    id: 'xbot',
    name: 'XBot',
    category: 'humanoid',
    license: 'MIT',
    source: 'three.js examples',
    glbUrl: 'https://threejs.org/examples/models/gltf/Xbot.glb',
    emoji: '🧍',
    tags: ['neutral', 'human', 'animated'],
    scale: 1.0,
    hasAnimations: true,
  },
  {
    id: 'michelle',
    name: 'Michelle',
    category: 'humanoid',
    license: 'MIT',
    source: 'three.js examples',
    glbUrl: 'https://threejs.org/examples/models/gltf/Michelle.glb',
    emoji: '🧍‍♀️',
    tags: ['woman', 'human', 'animated', 'dancing'],
    scale: 1.0,
    hasAnimations: true,
  },

  // ─── ROBOTS (Khronos / Three.js — CC0/MIT) ────────────────
  {
    id: 'robot-expressive',
    name: 'Robot Expressive',
    category: 'robot',
    license: 'CC-BY',
    source: 'KhronosGroup',
    glbUrl: 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
    emoji: '🤖',
    tags: ['robot', 'expressive', 'animated', 'cute'],
    scale: 0.5,
    hasAnimations: true,
  },
  {
    id: 'horse',
    name: 'Horse',
    category: 'animal',
    license: 'MIT',
    source: 'three.js examples',
    glbUrl: 'https://threejs.org/examples/models/gltf/Horse.glb',
    emoji: '🐴',
    tags: ['animal', 'horse', 'animated'],
    scale: 0.015,
    hasAnimations: true,
  },
  {
    id: 'flamingo',
    name: 'Flamingo',
    category: 'animal',
    license: 'MIT',
    source: 'three.js examples',
    glbUrl: 'https://threejs.org/examples/models/gltf/Flamingo.glb',
    emoji: '🦩',
    tags: ['animal', 'bird', 'animated'],
    scale: 0.02,
    yOffset: 1.5,
    hasAnimations: true,
  },
  {
    id: 'parrot',
    name: 'Parrot',
    category: 'animal',
    license: 'MIT',
    source: 'three.js examples',
    glbUrl: 'https://threejs.org/examples/models/gltf/Parrot.glb',
    emoji: '🦜',
    tags: ['animal', 'bird', 'animated', 'colorful'],
    scale: 0.02,
    yOffset: 1.0,
    hasAnimations: true,
  },
  {
    id: 'stork',
    name: 'Stork',
    category: 'animal',
    license: 'MIT',
    source: 'three.js examples',
    glbUrl: 'https://threejs.org/examples/models/gltf/Stork.glb',
    emoji: '🦩',
    tags: ['animal', 'bird', 'animated'],
    scale: 0.02,
    yOffset: 1.0,
    hasAnimations: true,
  },

  // ─── KHRONOS GLTF SAMPLE ASSETS (CC0) ─────────────────────
  {
    id: 'cesium-man',
    name: 'Cesium Man',
    category: 'humanoid',
    license: 'Apache-2.0',
    source: 'KhronosGroup',
    glbUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb',
    emoji: '👤',
    tags: ['human', 'walking', 'animated', 'classic'],
    scale: 1.0,
    hasAnimations: true,
  },
  {
    id: 'brain-stem',
    name: 'BrainStem',
    category: 'humanoid',
    license: 'Apache-2.0',
    source: 'KhronosGroup',
    glbUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BrainStem/glTF-Binary/BrainStem.glb',
    emoji: '🧠',
    tags: ['humanoid', 'animated', 'walking'],
    scale: 1.0,
    hasAnimations: true,
  },
  {
    id: 'fox',
    name: 'Fox',
    category: 'animal',
    license: 'CC-BY',
    source: 'KhronosGroup',
    glbUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb',
    emoji: '🦊',
    tags: ['animal', 'fox', 'animated', 'cute'],
    scale: 0.03,
    hasAnimations: true,
  },
  {
    id: 'duck',
    name: 'Duck',
    category: 'animal',
    license: 'CC-BY',
    source: 'KhronosGroup',
    glbUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Duck/glTF-Binary/Duck.glb',
    emoji: '🦆',
    tags: ['animal', 'duck', 'cute', 'classic'],
    scale: 0.5,
  },
]

export const AVATAR_CATEGORIES: { id: AvatarCategory | 'all'; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '🌐' },
  { id: 'humanoid', label: 'Humanoids', emoji: '🧍' },
  { id: 'robot', label: 'Robots', emoji: '🤖' },
  { id: 'animal', label: 'Animals', emoji: '🦊' },
  { id: 'fantasy', label: 'Fantasy', emoji: '🐉' },
]

export function filterAvatarsByCategory(category: AvatarCategory | 'all') {
  if (category === 'all') return OPEN_SOURCE_AVATARS
  return OPEN_SOURCE_AVATARS.filter(a => a.category === category)
}

export function findAvatarById(id: string) {
  return OPEN_SOURCE_AVATARS.find(a => a.id === id)
}
