/**
 * Nodeverse Wearables Catalog
 *
 * Global atlas of clothing/accessory items that can be equipped to an avatar.
 * Phase 1 ships procedural (Three.js primitives, zero asset load) — lets us
 * fill slots instantly while GLB-model library is sourced for Phase 2.
 *
 * Slots are independent — an avatar can wear a hat AND sunglasses AND hoodie
 * etc. without conflict. Each slot has a "none" option to go bare.
 *
 * Future: add `glbUrl` and `ipfsCid` fields, lazy-load models the same way
 * openSourceAvatars.ts does.
 */

import * as THREE from 'three'

// ─── Slot system ────────────────────────────────────────────
export type WearableSlot =
  | 'hat'         // baseball cap, beanie, top hat, cowboy...
  | 'hair'        // buzz, shag, afro, mohawk... (future)
  | 'sunglasses'  // aviator, round, wayfarer, cyber
  | 'face'        // beard, tattoo, mask... (future)
  | 'hoodie'      // plain, zip, oversized
  | 'shirt'       // tee, tank, button-up... (future)
  | 'pants'       // jeans, cargo, shorts
  | 'shoes'       // sneaker, boot, sandal
  | 'backpack'    // (future)

export const WEARABLE_SLOTS: WearableSlot[] = [
  'hat', 'sunglasses', 'hoodie', 'pants', 'shoes',
]

// ─── Catalog item ───────────────────────────────────────────
export interface WearableItem {
  id: string
  slot: WearableSlot
  name: string
  emoji: string              // grid preview glyph
  defaultColor: string       // hex; user can override
  procedural: ProceduralSpec // how to draw it in Three.js (Phase 1)
  glbUrl?: string            // Phase 2+
  ipfsCid?: string           // Phase 2+
  ogunPrice?: number         // future: paid items
}

export type ProceduralSpec =
  | { kind: 'cap'; brimLength?: number }
  | { kind: 'beanie' }
  | { kind: 'tophat' }
  | { kind: 'cowboy' }
  | { kind: 'crown' }
  | { kind: 'sunglasses_aviator' }
  | { kind: 'sunglasses_round' }
  | { kind: 'sunglasses_wayfarer' }
  | { kind: 'sunglasses_cyber' }
  | { kind: 'hoodie'; zip?: boolean; oversized?: boolean }
  | { kind: 'pants'; style: 'jeans' | 'cargo' | 'shorts' }
  | { kind: 'shoes'; style: 'sneaker' | 'boot' | 'sandal' }

// ─── The Catalog ────────────────────────────────────────────
export const WEARABLE_CATALOG: WearableItem[] = [
  // ── HATS ──
  { id: 'cap_classic',   slot: 'hat', name: 'Ball Cap',     emoji: '🧢', defaultColor: '#1f2937', procedural: { kind: 'cap' } },
  { id: 'cap_snapback',  slot: 'hat', name: 'Snapback',     emoji: '🧢', defaultColor: '#ec4899', procedural: { kind: 'cap', brimLength: 0.42 } },
  { id: 'beanie',        slot: 'hat', name: 'Beanie',       emoji: '🎩', defaultColor: '#a855f7', procedural: { kind: 'beanie' } },
  { id: 'tophat',        slot: 'hat', name: 'Top Hat',      emoji: '🎩', defaultColor: '#111111', procedural: { kind: 'tophat' } },
  { id: 'cowboy',        slot: 'hat', name: 'Cowboy',       emoji: '🤠', defaultColor: '#92400e', procedural: { kind: 'cowboy' } },
  { id: 'crown',         slot: 'hat', name: 'Crown',        emoji: '👑', defaultColor: '#facc15', procedural: { kind: 'crown' } },

  // ── SUNGLASSES ──
  { id: 'aviator',       slot: 'sunglasses', name: 'Aviator',   emoji: '🕶️', defaultColor: '#1a1a1a', procedural: { kind: 'sunglasses_aviator' } },
  { id: 'round',         slot: 'sunglasses', name: 'Round',     emoji: '🕶️', defaultColor: '#1a1a1a', procedural: { kind: 'sunglasses_round' } },
  { id: 'wayfarer',      slot: 'sunglasses', name: 'Wayfarer',  emoji: '🕶️', defaultColor: '#1a1a1a', procedural: { kind: 'sunglasses_wayfarer' } },
  { id: 'cyber',         slot: 'sunglasses', name: 'Cyber Visor', emoji: '😎', defaultColor: '#22d3ee', procedural: { kind: 'sunglasses_cyber' } },

  // ── HOODIES ──
  { id: 'hoodie_plain',  slot: 'hoodie', name: 'Hoodie',        emoji: '🧥', defaultColor: '#374151', procedural: { kind: 'hoodie' } },
  { id: 'hoodie_zip',    slot: 'hoodie', name: 'Zip Hoodie',    emoji: '🧥', defaultColor: '#22d3ee', procedural: { kind: 'hoodie', zip: true } },
  { id: 'hoodie_oversized', slot: 'hoodie', name: 'Oversized', emoji: '🧥', defaultColor: '#000000', procedural: { kind: 'hoodie', oversized: true } },

  // ── PANTS ──
  { id: 'pants_jeans',   slot: 'pants', name: 'Jeans',     emoji: '👖', defaultColor: '#1e3a8a', procedural: { kind: 'pants', style: 'jeans' } },
  { id: 'pants_cargo',   slot: 'pants', name: 'Cargo',     emoji: '👖', defaultColor: '#4b5563', procedural: { kind: 'pants', style: 'cargo' } },
  { id: 'pants_shorts',  slot: 'pants', name: 'Shorts',    emoji: '🩳', defaultColor: '#fb923c', procedural: { kind: 'pants', style: 'shorts' } },

  // ── SHOES ──
  { id: 'shoes_sneaker', slot: 'shoes', name: 'Sneakers',  emoji: '👟', defaultColor: '#ffffff', procedural: { kind: 'shoes', style: 'sneaker' } },
  { id: 'shoes_boot',    slot: 'shoes', name: 'Boots',     emoji: '🥾', defaultColor: '#78350f', procedural: { kind: 'shoes', style: 'boot' } },
  { id: 'shoes_sandal',  slot: 'shoes', name: 'Sandals',   emoji: '👡', defaultColor: '#92400e', procedural: { kind: 'shoes', style: 'sandal' } },
]

export function wearablesForSlot(slot: WearableSlot): WearableItem[] {
  return WEARABLE_CATALOG.filter(w => w.slot === slot)
}

export function getWearable(id: string | undefined): WearableItem | null {
  if (!id) return null
  return WEARABLE_CATALOG.find(w => w.id === id) || null
}

// ─── Outfit = slot → wearable id map ────────────────────────
export type Outfit = Partial<Record<WearableSlot, string>>
export type OutfitColors = Partial<Record<WearableSlot, string>>

// ─── Three.js renderer ──────────────────────────────────────
// Given a wearable + avatar anchor info, build a mesh group.
// Anchors are normalized to the agent-capsule preview; scale applied later.
export interface AnchorPoints {
  headY: number       // world-Y of head center
  headRadius: number  // rough sphere radius of head
  bodyTopY: number    // top of torso (shoulders)
  bodyBottomY: number // bottom of torso / top of legs
  bodyRadius: number  // torso thickness
  feetY: number       // floor contact Y
}

export function buildWearableMesh(
  item: WearableItem,
  anchors: AnchorPoints,
  color?: string,
): THREE.Group {
  const group = new THREE.Group()
  const c = new THREE.Color(color || item.defaultColor)
  const mat = new THREE.MeshStandardMaterial({ color: c, metalness: 0.3, roughness: 0.6 })
  const glowMat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.4, metalness: 0.9, roughness: 0.1 })

  switch (item.procedural.kind) {
    // ── HATS ──
    case 'cap': {
      const brimLen = item.procedural.brimLength ?? 0.35
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(anchors.headRadius * 1.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        mat,
      )
      crown.position.y = anchors.headY + anchors.headRadius * 0.1
      group.add(crown)
      const brim = new THREE.Mesh(new THREE.BoxGeometry(anchors.headRadius * 2, 0.04, brimLen), mat)
      brim.position.set(0, anchors.headY + anchors.headRadius * 0.1, brimLen * 0.5)
      group.add(brim)
      break
    }
    case 'beanie': {
      const beanie = new THREE.Mesh(
        new THREE.SphereGeometry(anchors.headRadius * 1.1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
        mat,
      )
      beanie.position.y = anchors.headY + anchors.headRadius * 0.2
      group.add(beanie)
      break
    }
    case 'tophat': {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(anchors.headRadius * 1.3, anchors.headRadius * 1.3, 0.04, 24), mat)
      base.position.y = anchors.headY + anchors.headRadius * 0.5
      group.add(base)
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(anchors.headRadius * 0.95, anchors.headRadius * 0.95, anchors.headRadius * 1.6, 24), mat)
      crown.position.y = anchors.headY + anchors.headRadius * 1.3
      group.add(crown)
      break
    }
    case 'cowboy': {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(anchors.headRadius * 1.7, anchors.headRadius * 1.7, 0.05, 24), mat)
      brim.position.y = anchors.headY + anchors.headRadius * 0.45
      // subtle upturn by scaling along z
      brim.scale.z = 1.1
      group.add(brim)
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(anchors.headRadius * 0.9, anchors.headRadius * 1.0, anchors.headRadius * 1.2, 24), mat)
      crown.position.y = anchors.headY + anchors.headRadius * 1.1
      group.add(crown)
      break
    }
    case 'crown': {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(anchors.headRadius * 1.15, anchors.headRadius * 1.15, anchors.headRadius * 0.4, 8), glowMat)
      ring.position.y = anchors.headY + anchors.headRadius * 1.1
      group.add(ring)
      break
    }

    // ── SUNGLASSES ──
    case 'sunglasses_aviator': {
      const frameMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 })
      const lensMat = new THREE.MeshStandardMaterial({ color: c, metalness: 0.7, roughness: 0.1, transparent: true, opacity: 0.75 })
      const lensOffset = anchors.headRadius * 0.45
      ;[-1, 1].forEach(side => {
        const lens = new THREE.Mesh(new THREE.SphereGeometry(anchors.headRadius * 0.32, 16, 8), lensMat)
        lens.scale.z = 0.35
        lens.position.set(side * lensOffset, anchors.headY + anchors.headRadius * 0.1, anchors.headRadius * 0.9)
        group.add(lens)
        const frame = new THREE.Mesh(new THREE.TorusGeometry(anchors.headRadius * 0.32, 0.015, 8, 16), frameMat)
        frame.position.copy(lens.position)
        frame.rotation.y = Math.PI / 2
        group.add(frame)
      })
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(anchors.headRadius * 0.25, 0.03, 0.03), frameMat)
      bridge.position.set(0, anchors.headY + anchors.headRadius * 0.1, anchors.headRadius * 0.9)
      group.add(bridge)
      break
    }
    case 'sunglasses_round': {
      const lensMat = new THREE.MeshStandardMaterial({ color: c, metalness: 0.7, roughness: 0.1, transparent: true, opacity: 0.75 })
      const lensOffset = anchors.headRadius * 0.4
      ;[-1, 1].forEach(side => {
        const lens = new THREE.Mesh(new THREE.CircleGeometry(anchors.headRadius * 0.3, 24), lensMat)
        lens.position.set(side * lensOffset, anchors.headY + anchors.headRadius * 0.1, anchors.headRadius * 0.92)
        group.add(lens)
        const frame = new THREE.Mesh(new THREE.TorusGeometry(anchors.headRadius * 0.3, 0.02, 8, 24), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.3 }))
        frame.position.copy(lens.position)
        group.add(frame)
      })
      break
    }
    case 'sunglasses_wayfarer': {
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.3 })
      const lensMat = new THREE.MeshStandardMaterial({ color: c, metalness: 0.7, roughness: 0.1, transparent: true, opacity: 0.8 })
      const lensOffset = anchors.headRadius * 0.42
      ;[-1, 1].forEach(side => {
        const lens = new THREE.Mesh(new THREE.BoxGeometry(anchors.headRadius * 0.55, anchors.headRadius * 0.35, 0.04), lensMat)
        lens.position.set(side * lensOffset, anchors.headY + anchors.headRadius * 0.1, anchors.headRadius * 0.9)
        group.add(lens)
        const frame = new THREE.Mesh(new THREE.BoxGeometry(anchors.headRadius * 0.6, anchors.headRadius * 0.4, 0.05), frameMat)
        frame.position.copy(lens.position)
        frame.position.z -= 0.01
        group.add(frame)
      })
      break
    }
    case 'sunglasses_cyber': {
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(anchors.headRadius * 1.9, anchors.headRadius * 0.35, 0.06),
        new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.85 }),
      )
      visor.position.set(0, anchors.headY + anchors.headRadius * 0.15, anchors.headRadius * 0.9)
      group.add(visor)
      break
    }

    // ── HOODIES ──
    case 'hoodie': {
      const oversized = item.procedural.oversized ?? false
      const widthScale = oversized ? 1.25 : 1.05
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(
          anchors.bodyRadius * widthScale,
          anchors.bodyRadius * widthScale * 1.1,
          (anchors.bodyTopY - anchors.bodyBottomY) * (oversized ? 1.15 : 1.02),
          16,
        ),
        mat,
      )
      torso.position.y = (anchors.bodyTopY + anchors.bodyBottomY) / 2
      group.add(torso)
      // Hood
      const hood = new THREE.Mesh(
        new THREE.SphereGeometry(anchors.headRadius * 1.3, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65),
        mat,
      )
      hood.position.y = anchors.bodyTopY + 0.05
      hood.position.z = -anchors.headRadius * 0.15
      group.add(hood)
      // Zipper line
      if (item.procedural.zip) {
        const zipper = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, (anchors.bodyTopY - anchors.bodyBottomY) * 0.95, 0.01),
          new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9, roughness: 0.2 }),
        )
        zipper.position.set(0, (anchors.bodyTopY + anchors.bodyBottomY) / 2, anchors.bodyRadius * widthScale + 0.01)
        group.add(zipper)
      }
      break
    }

    // ── PANTS ──
    case 'pants': {
      const style = item.procedural.style
      const legLen = style === 'shorts' ? (anchors.bodyBottomY - anchors.feetY) * 0.4 : (anchors.bodyBottomY - anchors.feetY) * 0.9
      const legTopY = anchors.bodyBottomY
      const legBottomY = legTopY - legLen
      const legRadius = anchors.bodyRadius * 0.35
      const cargoPocketMat = new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.85), metalness: 0.2, roughness: 0.8 })
      ;[-1, 1].forEach(side => {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(legRadius, legRadius * (style === 'cargo' ? 1.15 : 1.0), legLen, 16),
          mat,
        )
        leg.position.set(side * legRadius * 1.1, (legTopY + legBottomY) / 2, 0)
        group.add(leg)
        if (style === 'cargo') {
          const pocket = new THREE.Mesh(new THREE.BoxGeometry(legRadius * 0.8, legLen * 0.3, 0.02), cargoPocketMat)
          pocket.position.set(side * legRadius * 1.5, (legTopY + legBottomY) / 2, legRadius + 0.01)
          group.add(pocket)
        }
      })
      break
    }

    // ── SHOES ──
    case 'shoes': {
      const style = item.procedural.style
      const shoeLen = 0.32
      const shoeWidth = 0.14
      const shoeHeight = style === 'boot' ? 0.22 : 0.1
      const soleMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.1, roughness: 0.9 })
      ;[-1, 1].forEach(side => {
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(shoeWidth, shoeHeight, shoeLen), mat)
        shoe.position.set(side * anchors.bodyRadius * 0.35, anchors.feetY + shoeHeight / 2, 0.05)
        group.add(shoe)
        // Sole
        const sole = new THREE.Mesh(new THREE.BoxGeometry(shoeWidth * 1.05, 0.03, shoeLen * 1.02), soleMat)
        sole.position.set(side * anchors.bodyRadius * 0.35, anchors.feetY + 0.015, 0.05)
        group.add(sole)
        // Laces for sneakers
        if (style === 'sneaker') {
          for (let i = 0; i < 3; i++) {
            const lace = new THREE.Mesh(new THREE.BoxGeometry(shoeWidth * 0.9, 0.01, 0.008), new THREE.MeshStandardMaterial({ color: 0xffffff }))
            lace.position.set(side * anchors.bodyRadius * 0.35, anchors.feetY + shoeHeight * 0.6, 0.05 - shoeLen * 0.15 + i * 0.05)
            group.add(lace)
          }
        }
      })
      break
    }
  }

  return group
}

// ─── Default/empty outfit ───────────────────────────────────
export const EMPTY_OUTFIT: Outfit = {}
