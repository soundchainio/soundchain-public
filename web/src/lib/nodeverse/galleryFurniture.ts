/**
 * Gallery Furniture Catalog — decoratable gallery rooms
 *
 * Users can place furniture, plants, rugs, art objects in their gallery.
 * All rendered as Three.js procedural geometry (no external models needed).
 * Saved to localStorage per gallery owner.
 *
 * Frank: "i cant candy up my gallery yet! plants in pots, chairs, rugs,
 * sofas, etc"
 */

export type FurnitureCategory = 'seating' | 'plants' | 'rugs' | 'lighting' | 'decor' | 'tables'

export interface FurnitureItem {
  id: string
  name: string
  emoji: string
  category: FurnitureCategory
  color: string         // default color (user can customize)
  width: number         // x size in world units
  height: number        // y size
  depth: number         // z size
  yOffset: number       // vertical offset from floor
}

export const FURNITURE_CATALOG: FurnitureItem[] = [
  // Seating
  { id: 'sofa-modern', name: 'Modern Sofa', emoji: '🛋️', category: 'seating', color: '#4a4a5a', width: 2.5, height: 0.8, depth: 1, yOffset: 0 },
  { id: 'chair-accent', name: 'Accent Chair', emoji: '💺', category: 'seating', color: '#8b5cf6', width: 0.8, height: 0.9, depth: 0.8, yOffset: 0 },
  { id: 'bean-bag', name: 'Bean Bag', emoji: '🫘', category: 'seating', color: '#ec4899', width: 1, height: 0.6, depth: 1, yOffset: 0 },
  { id: 'bench', name: 'Gallery Bench', emoji: '🪑', category: 'seating', color: '#1a1a2e', width: 2, height: 0.5, depth: 0.6, yOffset: 0 },
  { id: 'stool', name: 'Bar Stool', emoji: '🪑', category: 'seating', color: '#22d3ee', width: 0.4, height: 0.8, depth: 0.4, yOffset: 0 },

  // Plants
  { id: 'potted-plant', name: 'Potted Plant', emoji: '🪴', category: 'plants', color: '#22c55e', width: 0.5, height: 1.2, depth: 0.5, yOffset: 0 },
  { id: 'tall-palm', name: 'Tall Palm', emoji: '🌴', category: 'plants', color: '#16a34a', width: 0.8, height: 2.5, depth: 0.8, yOffset: 0 },
  { id: 'cactus', name: 'Cactus', emoji: '🌵', category: 'plants', color: '#4ade80', width: 0.3, height: 0.8, depth: 0.3, yOffset: 0 },
  { id: 'bonsai', name: 'Bonsai Tree', emoji: '🌳', category: 'plants', color: '#15803d', width: 0.6, height: 0.7, depth: 0.6, yOffset: 0.6 },
  { id: 'flower-vase', name: 'Flower Vase', emoji: '🌸', category: 'plants', color: '#f472b6', width: 0.3, height: 0.6, depth: 0.3, yOffset: 0.6 },

  // Rugs
  { id: 'rug-round', name: 'Round Rug', emoji: '🟤', category: 'rugs', color: '#92400e', width: 3, height: 0.02, depth: 3, yOffset: 0.01 },
  { id: 'rug-rect', name: 'Area Rug', emoji: '🟫', category: 'rugs', color: '#78350f', width: 4, height: 0.02, depth: 2.5, yOffset: 0.01 },
  { id: 'rug-runner', name: 'Runner Rug', emoji: '🔲', category: 'rugs', color: '#1e1b4b', width: 1.2, height: 0.02, depth: 6, yOffset: 0.01 },

  // Lighting
  { id: 'floor-lamp', name: 'Floor Lamp', emoji: '🪔', category: 'lighting', color: '#fbbf24', width: 0.3, height: 1.8, depth: 0.3, yOffset: 0 },
  { id: 'neon-sign', name: 'Neon Sign', emoji: '💡', category: 'lighting', color: '#22d3ee', width: 1.5, height: 0.5, depth: 0.1, yOffset: 2 },
  { id: 'lava-lamp', name: 'Lava Lamp', emoji: '🫧', category: 'lighting', color: '#a855f7', width: 0.2, height: 0.5, depth: 0.2, yOffset: 0.6 },

  // Decor
  { id: 'sculpture', name: 'Abstract Sculpture', emoji: '🗿', category: 'decor', color: '#d4d4d8', width: 0.6, height: 1.5, depth: 0.6, yOffset: 0 },
  { id: 'globe', name: 'World Globe', emoji: '🌍', category: 'decor', color: '#3b82f6', width: 0.5, height: 0.8, depth: 0.5, yOffset: 0.6 },
  { id: 'vinyl-player', name: 'Vinyl Player', emoji: '🎵', category: 'decor', color: '#1a1a1a', width: 0.5, height: 0.3, depth: 0.4, yOffset: 0.6 },
  { id: 'speaker', name: 'Studio Monitor', emoji: '🔊', category: 'decor', color: '#111111', width: 0.3, height: 0.5, depth: 0.3, yOffset: 0 },
  { id: 'trophy', name: 'Trophy', emoji: '🏆', category: 'decor', color: '#eab308', width: 0.2, height: 0.4, depth: 0.2, yOffset: 0.6 },

  // Tables
  { id: 'coffee-table', name: 'Coffee Table', emoji: '🟰', category: 'tables', color: '#292524', width: 1.2, height: 0.4, depth: 0.6, yOffset: 0 },
  { id: 'pedestal', name: 'Display Pedestal', emoji: '🏛️', category: 'tables', color: '#e5e7eb', width: 0.5, height: 1, depth: 0.5, yOffset: 0 },
  { id: 'side-table', name: 'Side Table', emoji: '🔲', category: 'tables', color: '#44403c', width: 0.5, height: 0.55, depth: 0.5, yOffset: 0 },
]

export const FURNITURE_CATEGORIES: { id: FurnitureCategory | 'all'; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '🏠' },
  { id: 'seating', label: 'Seating', emoji: '🛋️' },
  { id: 'plants', label: 'Plants', emoji: '🪴' },
  { id: 'rugs', label: 'Rugs', emoji: '🟤' },
  { id: 'lighting', label: 'Lighting', emoji: '💡' },
  { id: 'decor', label: 'Decor', emoji: '🗿' },
  { id: 'tables', label: 'Tables', emoji: '🏛️' },
]

export interface PlacedFurniture {
  itemId: string
  x: number
  z: number
  rotation: number  // radians
  color: string     // customized color
}

const STORAGE_KEY = 'soundchain_gallery_furniture'

export function getPlacedFurniture(ownerHandle: string): PlacedFurniture[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${ownerHandle}`)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

export function savePlacedFurniture(ownerHandle: string, items: PlacedFurniture[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${STORAGE_KEY}_${ownerHandle}`, JSON.stringify(items))
  } catch {}
}

export function getFurnitureById(id: string) {
  return FURNITURE_CATALOG.find(f => f.id === id)
}

export function filterByCategory(category: FurnitureCategory | 'all') {
  if (category === 'all') return FURNITURE_CATALOG
  return FURNITURE_CATALOG.filter(f => f.category === category)
}
