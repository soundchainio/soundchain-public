// Agent Eye — the fast PERCEPTION layer (the "retina").
//
// Zero-dependency perceptual hashing (downscale → grayscale → dHash → Hamming
// distance). Sub-millisecond, runs at realtime FPS. Its only job: decide WHEN
// the scene has meaningfully changed and settled, so the slow/heavy anvil
// `llava` "cognition" call fires only on real keyframes.
//
// This is the human-eye split: fast cheap continuous perception (here) + slow
// selective deep cognition (llava). See lucy.md "Agent Eye — TIERED VISION".
// Increment 1: no model, no transformers.js, no Next-build risk. Increment 2
// (later, device-tested): swap/augment the hash for a CLIP semantic embedding.

const HASH_SIDE = 8 // dHash compares each pixel to its right neighbor → 64 bits

/** Downscale any video/canvas/image to a 64-bit difference-hash (Uint8Array of 0/1). Browser-only. */
export function perceptualHash(source: CanvasImageSource): Uint8Array {
  const w = HASH_SIDE + 1
  const h = HASH_SIDE
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('no-2d-context')
  ctx.drawImage(source, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)
  const gray = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  }
  const bits = new Uint8Array(HASH_SIDE * HASH_SIDE)
  let k = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < HASH_SIDE; x++) {
      bits[k++] = gray[y * w + x] > gray[y * w + x + 1] ? 1 : 0
    }
  }
  return bits
}

/** Number of differing bits (0–64). */
export function hammingDistance(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length) return Math.max(a.length, b.length)
  let d = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++
  return d
}

export interface AgentEyeOptions {
  /** Hamming distance (of 64) from the last keyframe before the scene counts as "new". */
  changeThreshold?: number
  /** Consecutive near-still frames required before a changed scene is a keyframe (motion debounce). */
  settleFrames?: number
  /** Max per-frame motion still considered "holding still". */
  stillMotion?: number
}

export type EyeState = 'watching' | 'changing'

/**
 * Feed frames at any FPS via observe(). Returns keyframe:true ONLY when a NEW
 * scene (changed from the last thing cognition saw) has settled — i.e. the
 * moment to spend a slow llava call. Cheap enough for a high-FPS loop.
 */
export class AgentEye {
  private lastKeyframe: Uint8Array | null = null // baseline cognition actually looked at
  private prev: Uint8Array | null = null // previous frame (motion)
  private stable = 0
  private changeThreshold: number
  private settleFrames: number
  private stillMotion: number
  state: EyeState = 'watching'

  constructor(opts: AgentEyeOptions = {}) {
    this.changeThreshold = opts.changeThreshold ?? 10 // ~16% of 64 bits
    this.settleFrames = opts.settleFrames ?? 2
    this.stillMotion = opts.stillMotion ?? 2
  }

  reset(): void {
    this.lastKeyframe = null
    this.prev = null
    this.stable = 0
    this.state = 'watching'
  }

  /** Pure assessment given a frame hash. Separated from DOM for testability. */
  observeHash(hash: Uint8Array): { keyframe: boolean; distance: number; motion: number } {
    const motion = this.prev ? hammingDistance(this.prev, hash) : 64
    this.prev = hash
    const distance = this.lastKeyframe ? hammingDistance(this.lastKeyframe, hash) : 64

    if (motion <= this.stillMotion) {
      this.stable++
    } else {
      this.stable = 0
      this.state = 'changing'
    }

    const changedEnough = distance >= this.changeThreshold
    const settled = this.stable >= this.settleFrames

    if (changedEnough && settled) {
      this.lastKeyframe = hash
      this.stable = 0
      this.state = 'watching'
      return { keyframe: true, distance, motion }
    }
    if (settled) this.state = 'watching'
    return { keyframe: false, distance, motion }
  }

  /** Observe a live frame. Safe: returns keyframe:false if hashing isn't possible. */
  observe(source: CanvasImageSource): { keyframe: boolean; distance: number; motion: number } {
    let hash: Uint8Array
    try {
      hash = perceptualHash(source)
    } catch {
      return { keyframe: false, distance: 0, motion: 0 }
    }
    return this.observeHash(hash)
  }
}

/** Adaptive perception cadence — fast on desktop, throttled on mobile/reduced-motion. */
export function perceptionIntervalMs(): number {
  if (typeof window === 'undefined') return 800
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduced) return 1200
  if (coarse || window.innerWidth < 768) return 700 // ~1.4 FPS perception on phones
  return 350 // ~3 FPS on desktop — the realtime "eye"
}
