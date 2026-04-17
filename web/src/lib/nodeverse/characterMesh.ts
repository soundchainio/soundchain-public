/**
 * Shared character-mesh builders
 *
 * Face features + outfit rendering extracted so the CharacterDesigner preview
 * AND the Explore3DScene player avatar render from the same code. DRY — if we
 * tweak beard geometry here, both places get it.
 *
 * Procedural Three.js primitives. Zero asset load. GLB upgrade later.
 */

import * as THREE from 'three'
import {
  getWearable,
  buildWearableMesh,
  type Outfit,
  type OutfitColors,
  type AnchorPoints,
  type WearableSlot,
} from './wearables'

// ─── Face config ─────────────────────────────────────────────
export interface FaceConfig {
  skinTone?: string
  eyeColor?: string
  eyeStyle?: 'normal' | 'glow' | 'cyber' | 'narrow' | 'wide' | 'closed'
  mouthStyle?: 'neutral' | 'smile' | 'frown' | 'smirk' | 'open'
  mouthColor?: string
  beard?: 'none' | 'stubble' | 'goatee' | 'full' | 'mustache'
  beardColor?: string
  facePaint?: 'none' | 'warrior' | 'cyber' | 'tribal' | 'tear' | 'scar'
  paintColor?: string
}

export const DEFAULT_FACE: FaceConfig = {
  eyeColor: '#ffffff',
  eyeStyle: 'normal',
  mouthStyle: 'neutral',
  mouthColor: '#ef4444',
  beard: 'none',
  beardColor: '#1a1a1a',
  facePaint: 'none',
  paintColor: '#22d3ee',
}

// ─── Anchors ─────────────────────────────────────────────────
export function computeAgentAnchors(height: number): AnchorPoints {
  const headY = 1.5 + (height - 1) * 1
  const headRadius = 0.3
  return {
    headY,
    headRadius,
    bodyTopY: headY - headRadius,
    bodyBottomY: 0.3 + (height - 1) * 0.5,
    bodyRadius: 0.4,
    feetY: 0,
  }
}

// ─── Face features → Group ──────────────────────────────────
export function buildFaceGroup(
  faceInput: FaceConfig | undefined,
  headY: number,
): THREE.Group {
  const group = new THREE.Group()
  const face = { ...DEFAULT_FACE, ...(faceInput || {}) }
  const faceZ = 0.28

  // Eyes
  const eyeColor = new THREE.Color(face.eyeColor || '#ffffff')
  const eyeMat = (face.eyeStyle === 'glow' || face.eyeStyle === 'cyber')
    ? new THREE.MeshStandardMaterial({ color: eyeColor, emissive: eyeColor, emissiveIntensity: 1.2, metalness: 0.9, roughness: 0.1 })
    : new THREE.MeshStandardMaterial({ color: eyeColor, metalness: 0.5, roughness: 0.3 })
  if (face.eyeStyle !== 'closed') {
    const eyeSep = 0.11
    const eyeY = 0.05
    if (face.eyeStyle === 'cyber') {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.02), eyeMat)
      bar.position.set(0, eyeY, faceZ)
      group.add(bar)
    } else if (face.eyeStyle === 'narrow') {
      ;[-1, 1].forEach(side => {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), eyeMat)
        eye.position.set(side * eyeSep, eyeY, faceZ)
        group.add(eye)
      })
    } else {
      const eyeRad = face.eyeStyle === 'wide' ? 0.055 : 0.04
      ;[-1, 1].forEach(side => {
        const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(eyeRad, 12, 12), eyeMat)
        eyeWhite.position.set(side * eyeSep, eyeY, faceZ)
        group.add(eyeWhite)
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeRad * 0.5, 12, 12), new THREE.MeshStandardMaterial({ color: 0x000000 }))
        pupil.position.set(side * eyeSep, eyeY, faceZ + eyeRad * 0.6)
        group.add(pupil)
      })
    }
  }

  // Mouth
  const mouthMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(face.mouthColor || '#ef4444'), metalness: 0.2, roughness: 0.7 })
  const mouthY = -0.1
  switch (face.mouthStyle) {
    case 'smile': {
      const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 16, Math.PI), mouthMat)
      mouth.position.set(0, mouthY, faceZ)
      mouth.rotation.z = Math.PI
      group.add(mouth)
      break
    }
    case 'frown': {
      const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 16, Math.PI), mouthMat)
      mouth.position.set(0, mouthY - 0.02, faceZ)
      group.add(mouth)
      break
    }
    case 'smirk': {
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.02), mouthMat)
      mouth.position.set(0.02, mouthY, faceZ)
      mouth.rotation.z = 0.2
      group.add(mouth)
      break
    }
    case 'open': {
      const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), new THREE.MeshStandardMaterial({ color: 0x1a0000 }))
      mouth.position.set(0, mouthY, faceZ)
      group.add(mouth)
      break
    }
    case 'neutral':
    default: {
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.02), mouthMat)
      mouth.position.set(0, mouthY, faceZ)
      group.add(mouth)
    }
  }

  // Beard
  const beardMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(face.beardColor || '#1a1a1a'), metalness: 0.1, roughness: 0.95 })
  switch (face.beard) {
    case 'stubble': {
      for (let i = 0; i < 30; i++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 4, 4), beardMat)
        const angle = (Math.random() - 0.5) * Math.PI
        const radius = 0.22 + Math.random() * 0.04
        dot.position.set(Math.sin(angle) * radius, mouthY + (Math.random() - 0.2) * 0.1, Math.cos(angle) * radius * 0.9)
        group.add(dot)
      }
      break
    }
    case 'goatee': {
      const goatee = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), beardMat)
      goatee.scale.set(0.7, 1, 0.4)
      goatee.position.set(0, mouthY - 0.09, faceZ - 0.02)
      group.add(goatee)
      break
    }
    case 'mustache': {
      const mus = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.03), beardMat)
      mus.position.set(0, mouthY + 0.04, faceZ)
      group.add(mus)
      break
    }
    case 'full': {
      const beard = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 16, 12, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.5),
        beardMat,
      )
      beard.position.set(0, -0.05, 0)
      beard.scale.z = 0.75
      group.add(beard)
      break
    }
  }

  // Face paint
  if (face.facePaint && face.facePaint !== 'none') {
    const paintColor = new THREE.Color(face.paintColor || '#22d3ee')
    const paintMat = new THREE.MeshStandardMaterial({ color: paintColor, emissive: paintColor, emissiveIntensity: 0.6, metalness: 0.3, roughness: 0.5, transparent: true, opacity: 0.9 })
    switch (face.facePaint) {
      case 'warrior': {
        ;[-1, 1].forEach(side => {
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.01), paintMat)
          stripe.position.set(side * 0.11, 0.05, faceZ + 0.005)
          group.add(stripe)
        })
        break
      }
      case 'cyber': {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.01), paintMat)
        line.position.set(0.11, -0.03, faceZ + 0.005)
        group.add(line)
        const dot = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), paintMat)
        dot.position.set(-0.13, -0.04, faceZ + 0.005)
        group.add(dot)
        break
      }
      case 'tribal': {
        ;[-1, 1].forEach(side => {
          for (let i = 0; i < 3; i++) {
            const mark = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.008, 0.01), paintMat)
            mark.position.set(side * (0.13 + i * 0.015), -0.02 - i * 0.02, faceZ + 0.005)
            mark.rotation.z = side * 0.3
            group.add(mark)
          }
        })
        break
      }
      case 'tear': {
        const tear = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), paintMat)
        tear.position.set(-0.11, -0.02, faceZ + 0.005)
        group.add(tear)
        break
      }
      case 'scar': {
        const scarMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(face.paintColor || '#ef4444'), metalness: 0.1, roughness: 0.8 })
        const scar = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.12, 0.008), scarMat)
        scar.position.set(0.09, 0.02, faceZ + 0.003)
        scar.rotation.z = 0.15
        group.add(scar)
        break
      }
    }
  }

  group.position.y = headY
  return group
}

// ─── Outfit → Group ────────────────────────────────────────
export function buildOutfitGroup(
  outfit: Outfit | undefined,
  colors: OutfitColors | undefined,
  anchors: AnchorPoints,
): THREE.Group {
  const group = new THREE.Group()
  if (!outfit) return group
  ;(Object.entries(outfit) as Array<[WearableSlot, string | undefined]>).forEach(([slot, id]) => {
    if (!id) return
    const item = getWearable(id)
    if (!item) return
    const color = colors?.[slot]
    const mesh = buildWearableMesh(item, anchors, color)
    group.add(mesh)
  })
  return group
}

// ─── Skin-tone head material helper ─────────────────────────
export function buildHeadMaterial(
  skinTone: string | undefined,
  fallbackBodyColor: string,
  glowColor: string,
  glowIntensity: number,
): THREE.MeshStandardMaterial {
  if (skinTone) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(skinTone),
      emissive: new THREE.Color(glowColor),
      emissiveIntensity: glowIntensity * 0.5,
      metalness: 0.2,
      roughness: 0.6,
    })
  }
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(fallbackBodyColor),
    emissive: new THREE.Color(glowColor),
    emissiveIntensity: glowIntensity,
    metalness: 0.5,
    roughness: 0.3,
  })
}
