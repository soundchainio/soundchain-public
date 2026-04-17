/**
 * Nodeverse Buildables Catalog
 *
 * Objects users can place on their parcel: walls, floors, furniture,
 * plants, lamps, NFT frames, vehicles. Phase 2 ships procedural meshes
 * (Three.js primitives). Future phase swaps for GLB asset library.
 *
 * Each buildable is footprint-aware (widthUnits × depthUnits) so the
 * builder can snap to grid and prevent overlap. A parcel is 16×16 units;
 * a standard wall is 4×0.2, a sofa is 2×1, etc.
 *
 * Frame buildables (nft_frame, scid_frame, post_frame) carry an optional
 * `boundAssetId` and `boundAssetType` so the renderer knows to load
 * the artwork as a texture and handle click → asset modal.
 */
import * as THREE from 'three'

export type BuildableCategory =
  | 'wall'
  | 'floor'
  | 'furniture'
  | 'decor'
  | 'lighting'
  | 'frame'
  | 'vehicle'

export type BuildableId = string

export interface BuildableItem {
  id: BuildableId
  category: BuildableCategory
  name: string
  emoji: string
  widthUnits: number   // x footprint in world units
  depthUnits: number   // z footprint
  heightUnits: number  // y height for collision / camera
  defaultColor: string
  ogunPrice?: number   // 0 = free (Phase 2 all free; Phase 3 paid items)
  // Frames only: what asset types they can be bound to
  acceptsAssetTypes?: Array<'nft' | 'scid' | 'post'>
  // Vehicles only: how fast (units/s) when driven in Phase 4
  driveSpeed?: number
}

/**
 * An instance of a buildable placed on a parcel. Serialized to Mongo.
 */
export interface PlacedBuildable {
  _id?: string
  id: string                 // unique per instance (client-generated cuid-ish)
  buildableId: BuildableId   // reference to catalog item
  ownerId: string            // profile._id of parcel owner
  parcelX: number            // parcel coordinates (same as nodeverse_squares)
  parcelZ: number
  localX: number             // position within parcel [-8..8]
  localY: number             // height above ground (0 for floor-anchored)
  localZ: number             // [-8..8]
  rotY: number               // radians, yaw only
  color?: string             // hex override
  scale?: number             // 0.5 – 2.0 multiplier
  // Frame bindings
  boundAssetType?: 'nft' | 'scid' | 'post'
  boundAssetId?: string      // NFT edition id, SCID, or post id
  boundAssetImageUrl?: string // denormalized thumb URL for texture load
  boundAssetTitle?: string    // for click modal
  placedAt?: string | Date
}

// ─── Catalog ────────────────────────────────────────────────────────────────
export const BUILDABLE_CATALOG: BuildableItem[] = [
  // Walls (4 units wide, 3 tall — Minecraft style)
  { id: 'wall_plain', category: 'wall', name: 'Wall', emoji: '🧱', widthUnits: 4, depthUnits: 0.2, heightUnits: 3, defaultColor: '#6b7280' },
  { id: 'wall_glass', category: 'wall', name: 'Glass Wall', emoji: '🪟', widthUnits: 4, depthUnits: 0.15, heightUnits: 3, defaultColor: '#22d3ee' },
  { id: 'wall_neon', category: 'wall', name: 'Neon Wall', emoji: '💡', widthUnits: 4, depthUnits: 0.2, heightUnits: 3, defaultColor: '#ec4899' },

  // Floors / foundations (stackable tiles)
  { id: 'floor_tile', category: 'floor', name: 'Floor Tile', emoji: '⬛', widthUnits: 2, depthUnits: 2, heightUnits: 0.1, defaultColor: '#374151' },
  { id: 'floor_grass', category: 'floor', name: 'Grass Patch', emoji: '🌿', widthUnits: 2, depthUnits: 2, heightUnits: 0.1, defaultColor: '#22c55e' },
  { id: 'floor_neon', category: 'floor', name: 'Neon Floor', emoji: '✨', widthUnits: 2, depthUnits: 2, heightUnits: 0.1, defaultColor: '#a855f7' },

  // Furniture — the "dope your crib up" layer
  { id: 'sofa', category: 'furniture', name: 'Sofa', emoji: '🛋️', widthUnits: 2.4, depthUnits: 0.9, heightUnits: 0.9, defaultColor: '#ef4444' },
  { id: 'chair', category: 'furniture', name: 'Chair', emoji: '🪑', widthUnits: 0.7, depthUnits: 0.7, heightUnits: 1.0, defaultColor: '#92400e' },
  { id: 'table', category: 'furniture', name: 'Table', emoji: '🧱', widthUnits: 1.6, depthUnits: 0.9, heightUnits: 0.75, defaultColor: '#78350f' },
  { id: 'bed', category: 'furniture', name: 'Bed', emoji: '🛏️', widthUnits: 2.2, depthUnits: 1.5, heightUnits: 0.6, defaultColor: '#f472b6' },
  { id: 'pedestal', category: 'furniture', name: 'Pedestal', emoji: '📦', widthUnits: 0.6, depthUnits: 0.6, heightUnits: 1.2, defaultColor: '#1f2937' },
  { id: 'dj_booth', category: 'furniture', name: 'DJ Booth', emoji: '🎛️', widthUnits: 2, depthUnits: 0.8, heightUnits: 1.1, defaultColor: '#000000' },

  // Decor
  { id: 'plant', category: 'decor', name: 'Plant', emoji: '🪴', widthUnits: 0.6, depthUnits: 0.6, heightUnits: 1.4, defaultColor: '#16a34a' },
  { id: 'speaker', category: 'decor', name: 'Speaker', emoji: '🔊', widthUnits: 0.8, depthUnits: 0.6, heightUnits: 1.8, defaultColor: '#111827' },
  { id: 'statue', category: 'decor', name: 'Statue', emoji: '🗿', widthUnits: 0.8, depthUnits: 0.8, heightUnits: 2.2, defaultColor: '#d4d4d4' },

  // Lighting
  { id: 'lamp_floor', category: 'lighting', name: 'Floor Lamp', emoji: '💡', widthUnits: 0.3, depthUnits: 0.3, heightUnits: 2.2, defaultColor: '#fef3c7' },
  { id: 'lamp_neon', category: 'lighting', name: 'Neon Sign', emoji: '🌈', widthUnits: 1.5, depthUnits: 0.2, heightUnits: 0.8, defaultColor: '#ec4899' },

  // Frames — the killer SoundChain feature. Bind NFT, SCID, or post.
  { id: 'nft_frame', category: 'frame', name: 'NFT Frame', emoji: '🖼️', widthUnits: 1.6, depthUnits: 0.1, heightUnits: 1.6, defaultColor: '#fbbf24', acceptsAssetTypes: ['nft'] },
  { id: 'scid_frame', category: 'frame', name: 'Track Frame', emoji: '🎵', widthUnits: 1.6, depthUnits: 0.1, heightUnits: 1.6, defaultColor: '#22d3ee', acceptsAssetTypes: ['scid'] },
  { id: 'post_frame', category: 'frame', name: 'Post Frame', emoji: '📝', widthUnits: 1.6, depthUnits: 0.1, heightUnits: 1.6, defaultColor: '#a855f7', acceptsAssetTypes: ['post'] },
  { id: 'multi_frame', category: 'frame', name: 'Multi Frame', emoji: '🎨', widthUnits: 2, depthUnits: 0.1, heightUnits: 2, defaultColor: '#ec4899', acceptsAssetTypes: ['nft', 'scid', 'post'] },

  // Vehicles — cosmetic first, driveable in Phase 4
  { id: 'car', category: 'vehicle', name: 'Car', emoji: '🚗', widthUnits: 1.8, depthUnits: 4, heightUnits: 1.4, defaultColor: '#ef4444', driveSpeed: 8 },
  { id: 'truck', category: 'vehicle', name: 'Truck', emoji: '🚚', widthUnits: 2.2, depthUnits: 5, heightUnits: 2.4, defaultColor: '#1e40af', driveSpeed: 6 },
  { id: 'bike', category: 'vehicle', name: 'Bike', emoji: '🏍️', widthUnits: 0.7, depthUnits: 2, heightUnits: 1.2, defaultColor: '#000000', driveSpeed: 12 },
  { id: 'hoverboard', category: 'vehicle', name: 'Hoverboard', emoji: '🛹', widthUnits: 0.8, depthUnits: 1.2, heightUnits: 0.3, defaultColor: '#22d3ee', driveSpeed: 10 },
]

export function getBuildable(id: BuildableId): BuildableItem | undefined {
  return BUILDABLE_CATALOG.find(b => b.id === id)
}

export function buildablesByCategory(cat: BuildableCategory): BuildableItem[] {
  return BUILDABLE_CATALOG.filter(b => b.category === cat)
}

export const BUILDABLE_CATEGORIES: BuildableCategory[] = [
  'wall', 'floor', 'furniture', 'decor', 'lighting', 'frame', 'vehicle',
]

// ─── Procedural mesh builders ───────────────────────────────────────────────

/**
 * Build a Three.js mesh for a placed buildable. Returned group is positioned
 * at (0,0,0) with correct rotation — caller places it in world space.
 *
 * Optional texture is used for frame buildables (NFT/SCID/post artwork).
 */
export function buildBuildableMesh(
  item: BuildableItem,
  overrideColor?: string,
  scale = 1,
  texture?: THREE.Texture | null,
): THREE.Group {
  const group = new THREE.Group()
  const colorHex = overrideColor || item.defaultColor
  const color = new THREE.Color(colorHex)

  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: item.category === 'frame' ? 0.3 : 0.4,
    roughness: item.category === 'frame' ? 0.5 : 0.6,
    transparent: item.id === 'wall_glass',
    opacity: item.id === 'wall_glass' ? 0.35 : 1,
    emissive: item.category === 'lighting' || item.id === 'wall_neon' || item.id === 'floor_neon' ? color : new THREE.Color(0x000000),
    emissiveIntensity: item.category === 'lighting' ? 0.8 : (item.id === 'wall_neon' || item.id === 'floor_neon' ? 0.5 : 0),
  })

  switch (item.id) {
    case 'wall_plain':
    case 'wall_glass':
    case 'wall_neon': {
      const box = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, item.heightUnits, item.depthUnits), mat)
      box.position.y = item.heightUnits / 2
      box.castShadow = true
      box.receiveShadow = true
      group.add(box)
      break
    }
    case 'floor_tile':
    case 'floor_grass':
    case 'floor_neon': {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, item.heightUnits, item.depthUnits), mat)
      tile.position.y = item.heightUnits / 2
      tile.receiveShadow = true
      group.add(tile)
      break
    }
    case 'sofa': {
      // Base + back + two armrests
      const base = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, 0.4, item.depthUnits), mat)
      base.position.y = 0.2
      base.castShadow = true
      group.add(base)
      const back = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, 0.6, 0.2), mat)
      back.position.set(0, 0.7, -item.depthUnits / 2 + 0.1)
      group.add(back)
      ;[-1, 1].forEach(s => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, item.depthUnits), mat)
        arm.position.set(s * (item.widthUnits / 2 - 0.1), 0.45, 0)
        group.add(arm)
      })
      break
    }
    case 'chair': {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, 0.1, item.depthUnits), mat)
      seat.position.y = 0.5
      group.add(seat)
      const back = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, 0.5, 0.1), mat)
      back.position.set(0, 0.8, -item.depthUnits / 2 + 0.05)
      group.add(back)
      const legMat = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.5), metalness: 0.3, roughness: 0.7 })
      ;[[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), legMat)
        leg.position.set(sx * (item.widthUnits / 2 - 0.05), 0.25, sz * (item.depthUnits / 2 - 0.05))
        group.add(leg)
      })
      break
    }
    case 'table': {
      const top = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, 0.08, item.depthUnits), mat)
      top.position.y = 0.7
      group.add(top)
      const legMat = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.6) })
      ;[[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), legMat)
        leg.position.set(sx * (item.widthUnits / 2 - 0.08), 0.35, sz * (item.depthUnits / 2 - 0.08))
        group.add(leg)
      })
      break
    }
    case 'bed': {
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, 0.35, item.depthUnits), mat)
      mattress.position.y = 0.25
      group.add(mattress)
      const frame = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits + 0.1, 0.15, item.depthUnits + 0.1), new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.4) }))
      frame.position.y = 0.075
      group.add(frame)
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits * 0.4, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0xffffff }))
      pillow.position.set(0, 0.48, -item.depthUnits / 2 + 0.3)
      group.add(pillow)
      break
    }
    case 'pedestal': {
      const box = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, item.heightUnits, item.depthUnits), mat)
      box.position.y = item.heightUnits / 2
      box.castShadow = true
      group.add(box)
      break
    }
    case 'dj_booth': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, item.heightUnits, item.depthUnits), mat)
      base.position.y = item.heightUnits / 2
      group.add(base)
      // Two "turntables" on top
      ;[-1, 1].forEach(s => {
        const tt = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 24), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 }))
        tt.position.set(s * 0.5, item.heightUnits + 0.025, 0)
        group.add(tt)
      })
      break
    }
    case 'plant': {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0x78350f }))
      pot.position.y = 0.2
      group.add(pot)
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), mat)
      leaves.position.y = 0.9
      leaves.scale.y = 1.4
      group.add(leaves)
      break
    }
    case 'speaker': {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, item.heightUnits, item.depthUnits), mat)
      cab.position.y = item.heightUnits / 2
      group.add(cab)
      const coneMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
      ;[0.45, 1.25].forEach(y => {
        const cone = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), coneMat)
        cone.position.set(0, y, item.depthUnits / 2 + 0.01)
        group.add(cone)
      })
      break
    }
    case 'statue': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.7), new THREE.MeshStandardMaterial({ color: 0x333333 }))
      base.position.y = 0.15
      group.add(base)
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.3, 12), mat)
      body.position.y = 1
      group.add(body)
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), mat)
      head.position.y = 1.8
      group.add(head)
      break
    }
    case 'lamp_floor': {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 8), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 }))
      pole.position.y = 1
      group.add(pole)
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.3, 16, 1, true), mat)
      shade.position.y = 2.05
      group.add(shade)
      // Actual point light
      const light = new THREE.PointLight(color, 0.8, 6)
      light.position.y = 2
      group.add(light)
      break
    }
    case 'lamp_neon': {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, item.heightUnits, item.depthUnits), mat)
      sign.position.y = 1 + item.heightUnits / 2
      group.add(sign)
      const light = new THREE.PointLight(color, 1.5, 4)
      light.position.set(0, 1 + item.heightUnits / 2, 0.3)
      group.add(light)
      break
    }
    case 'nft_frame':
    case 'scid_frame':
    case 'post_frame':
    case 'multi_frame': {
      // Frame border
      const frameMat = new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.4 })
      const frame = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, item.heightUnits, item.depthUnits), frameMat)
      frame.position.y = item.heightUnits / 2 + 0.5 // mounted at eye level
      group.add(frame)
      // Inner canvas with texture (or placeholder)
      const canvasW = item.widthUnits * 0.9
      const canvasH = item.heightUnits * 0.9
      const canvasMat = texture
        ? new THREE.MeshBasicMaterial({ map: texture })
        : new THREE.MeshStandardMaterial({ color: 0x1a1a1a, emissive: color, emissiveIntensity: 0.3 })
      const canvas = new THREE.Mesh(new THREE.PlaneGeometry(canvasW, canvasH), canvasMat)
      canvas.position.set(0, item.heightUnits / 2 + 0.5, item.depthUnits / 2 + 0.001)
      group.add(canvas)
      // Back side (black)
      const back = new THREE.Mesh(new THREE.PlaneGeometry(canvasW, canvasH), new THREE.MeshStandardMaterial({ color: 0x0a0a0a }))
      back.position.set(0, item.heightUnits / 2 + 0.5, -item.depthUnits / 2 - 0.001)
      back.rotation.y = Math.PI
      group.add(back)
      break
    }
    case 'car': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, 0.6, item.depthUnits), mat)
      body.position.y = 0.6
      body.castShadow = true
      group.add(body)
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits * 0.9, 0.5, item.depthUnits * 0.55), new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.2 }))
      cabin.position.set(0, 1.15, 0)
      group.add(cabin)
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
      ;[[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16), wheelMat)
        wheel.rotation.z = Math.PI / 2
        wheel.position.set(sx * (item.widthUnits / 2 - 0.05), 0.35, sz * (item.depthUnits / 2 - 0.7))
        group.add(wheel)
      })
      break
    }
    case 'truck': {
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, 1.3, 1.8), mat)
      cabin.position.set(0, 0.95, item.depthUnits / 2 - 0.9)
      group.add(cabin)
      const bed = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, 1.6, 3), mat)
      bed.position.set(0, 1.1, -item.depthUnits / 2 + 1.5)
      group.add(bed)
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
      ;[[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]].forEach(([sx, sz]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16), wheelMat)
        wheel.rotation.z = Math.PI / 2
        wheel.position.set(sx * (item.widthUnits / 2 - 0.1), 0.45, sz * (item.depthUnits / 2 - 1))
        group.add(wheel)
      })
      break
    }
    case 'bike': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, item.depthUnits * 0.8), mat)
      body.position.y = 0.8
      group.add(body)
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.5), new THREE.MeshStandardMaterial({ color: 0x111827 }))
      seat.position.set(0, 1.1, -0.3)
      group.add(seat)
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
      ;[-1, 1].forEach(sz => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16), wheelMat)
        wheel.rotation.z = Math.PI / 2
        wheel.position.set(0, 0.4, sz * (item.depthUnits / 2 - 0.3))
        group.add(wheel)
      })
      break
    }
    case 'hoverboard': {
      const board = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, 0.1, item.depthUnits), mat)
      board.position.y = 0.2
      group.add(board)
      // Glow underneath
      const glow = new THREE.PointLight(color, 1, 1.5)
      glow.position.y = 0.05
      group.add(glow)
      break
    }
    default: {
      // Generic box fallback
      const box = new THREE.Mesh(new THREE.BoxGeometry(item.widthUnits, item.heightUnits, item.depthUnits), mat)
      box.position.y = item.heightUnits / 2
      group.add(box)
    }
  }

  if (scale !== 1) group.scale.setScalar(scale)
  return group
}
