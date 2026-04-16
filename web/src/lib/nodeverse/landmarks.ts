/**
 * Famous landmarks pre-marked as Tier S premium parcels in Earth Mode.
 * Mapped to real lat/lng. When Earth Mode is active, these show as gold pins.
 *
 * Pricing tier: Tier S (capitals + landmarks): 5000 OGUN
 * (Phase 4 of the Earth-shaped Nodeverse vision)
 */

export interface Landmark {
  name: string
  city: string
  country: string
  lat: number
  lng: number
  emoji: string
  tier: 'S'
  price: 5000
}

export const FAMOUS_LANDMARKS: Landmark[] = [
  // North America
  { name: 'Times Square', city: 'New York', country: 'USA', lat: 40.758, lng: -73.985, emoji: '🗽', tier: 'S', price: 5000 },
  { name: 'Hollywood Sign', city: 'Los Angeles', country: 'USA', lat: 34.134, lng: -118.322, emoji: '🎬', tier: 'S', price: 5000 },
  { name: 'Space Needle', city: 'Seattle', country: 'USA', lat: 47.620, lng: -122.349, emoji: '🛸', tier: 'S', price: 5000 },
  { name: 'White House', city: 'Washington DC', country: 'USA', lat: 38.898, lng: -77.037, emoji: '🏛️', tier: 'S', price: 5000 },
  { name: 'CN Tower', city: 'Toronto', country: 'Canada', lat: 43.642, lng: -79.387, emoji: '🍁', tier: 'S', price: 5000 },

  // South America
  { name: 'Christ the Redeemer', city: 'Rio', country: 'Brazil', lat: -22.952, lng: -43.211, emoji: '🗿', tier: 'S', price: 5000 },
  { name: 'Machu Picchu', city: 'Cusco', country: 'Peru', lat: -13.163, lng: -72.545, emoji: '🏔️', tier: 'S', price: 5000 },

  // Europe
  { name: 'Eiffel Tower', city: 'Paris', country: 'France', lat: 48.858, lng: 2.295, emoji: '🗼', tier: 'S', price: 5000 },
  { name: 'Big Ben', city: 'London', country: 'UK', lat: 51.500, lng: -0.124, emoji: '🇬🇧', tier: 'S', price: 5000 },
  { name: 'Colosseum', city: 'Rome', country: 'Italy', lat: 41.890, lng: 12.492, emoji: '🏟️', tier: 'S', price: 5000 },
  { name: 'Brandenburg Gate', city: 'Berlin', country: 'Germany', lat: 52.516, lng: 13.378, emoji: '🇩🇪', tier: 'S', price: 5000 },
  { name: 'Sagrada Família', city: 'Barcelona', country: 'Spain', lat: 41.404, lng: 2.174, emoji: '⛪', tier: 'S', price: 5000 },
  { name: 'Acropolis', city: 'Athens', country: 'Greece', lat: 37.971, lng: 23.726, emoji: '🏛️', tier: 'S', price: 5000 },
  { name: 'Red Square', city: 'Moscow', country: 'Russia', lat: 55.754, lng: 37.620, emoji: '🇷🇺', tier: 'S', price: 5000 },

  // Africa
  { name: 'Pyramids of Giza', city: 'Cairo', country: 'Egypt', lat: 29.979, lng: 31.134, emoji: '🔺', tier: 'S', price: 5000 },
  { name: 'Table Mountain', city: 'Cape Town', country: 'South Africa', lat: -33.962, lng: 18.404, emoji: '⛰️', tier: 'S', price: 5000 },

  // Asia
  { name: 'Tokyo Tower', city: 'Tokyo', country: 'Japan', lat: 35.659, lng: 139.745, emoji: '🗾', tier: 'S', price: 5000 },
  { name: 'Akihabara', city: 'Tokyo', country: 'Japan', lat: 35.702, lng: 139.774, emoji: '🎮', tier: 'S', price: 5000 },
  { name: 'Great Wall', city: 'Beijing', country: 'China', lat: 40.432, lng: 116.570, emoji: '🐉', tier: 'S', price: 5000 },
  { name: 'Marina Bay Sands', city: 'Singapore', country: 'Singapore', lat: 1.283, lng: 103.860, emoji: '🌆', tier: 'S', price: 5000 },
  { name: 'Taj Mahal', city: 'Agra', country: 'India', lat: 27.175, lng: 78.042, emoji: '🕌', tier: 'S', price: 5000 },
  { name: 'Burj Khalifa', city: 'Dubai', country: 'UAE', lat: 25.197, lng: 55.274, emoji: '🏗️', tier: 'S', price: 5000 },
  { name: 'Mount Fuji', city: 'Honshu', country: 'Japan', lat: 35.361, lng: 138.728, emoji: '🗻', tier: 'S', price: 5000 },

  // Oceania
  { name: 'Sydney Opera House', city: 'Sydney', country: 'Australia', lat: -33.857, lng: 151.215, emoji: '🎭', tier: 'S', price: 5000 },
  { name: 'Auckland Sky Tower', city: 'Auckland', country: 'New Zealand', lat: -36.848, lng: 174.762, emoji: '🇳🇿', tier: 'S', price: 5000 },
]

/**
 * Equirectangular projection — maps lat/lng to canvas x/y.
 * @param lng -180 to 180 (longitude)
 * @param lat -85 to 85 (latitude, capped for Mercator-friendly view)
 * @param scale pixels per degree
 * @param cx center X of canvas
 * @param cy center Y of canvas
 */
export function projectLngLat(lng: number, lat: number, scale: number, cx: number, cy: number) {
  return {
    x: cx + lng * scale,
    y: cy - lat * scale, // invert: north = up
  }
}

/**
 * Inverse projection — canvas x/y back to lat/lng.
 */
export function unprojectXY(x: number, y: number, scale: number, cx: number, cy: number) {
  return {
    lng: (x - cx) / scale,
    lat: -(y - cy) / scale,
  }
}

/**
 * Map parcel x/z to lat/lng for Earth Mode display.
 * Parcel grid: x ±250, z ±250 → spread across the world
 * z → lat (north positive), x → lng
 */
export function parcelToLngLat(x: number, z: number) {
  return {
    lng: (x / 250) * 180,
    lat: -(z / 250) * 85,
  }
}

/**
 * Inverse — lat/lng to parcel x/z.
 */
export function lngLatToParcel(lng: number, lat: number) {
  return {
    x: Math.round((lng / 180) * 250),
    z: Math.round(-(lat / 85) * 250),
  }
}
