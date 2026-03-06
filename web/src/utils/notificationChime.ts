/**
 * Notification Chime — Web Audio API oscillator-based notification sound.
 *
 * Uses two ascending tones to create a pleasant "ding-ding" chime.
 * Works on iOS PWA (unlike navigator.vibrate which iOS ignores).
 *
 * iOS requires AudioContext to be created/resumed during a user gesture.
 * Call warmUpAudio() on first user interaction (tap/click) so that
 * later calls to playNotificationChime() can fire without gesture.
 */

let audioCtx: AudioContext | null = null
let warmedUp = false

function getOrCreateContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    audioCtx = new AC()
  }
  return audioCtx
}

/**
 * Call this once during any user gesture (click/tap) to unlock
 * the AudioContext on iOS. Safe to call multiple times.
 */
export function warmUpAudio() {
  if (warmedUp) return
  const ctx = getOrCreateContext()
  if (!ctx) return
  // Play a silent buffer to unlock the context
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  const buf = ctx.createBuffer(1, 1, ctx.sampleRate)
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(ctx.destination)
  src.start(0)
  warmedUp = true
}

/**
 * Play a two-tone ascending notification chime.
 * Safe to call anytime — silently fails if audio unavailable.
 */
export function playNotificationChime() {
  const ctx = getOrCreateContext()
  if (!ctx) return

  // Try to resume if suspended (best-effort without gesture)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  // If still suspended after resume attempt, skip
  if (ctx.state !== 'running') return

  const now = ctx.currentTime

  // Tone 1: C6 (1047 Hz) — short ping
  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.type = 'sine'
  osc1.frequency.value = 1047
  gain1.gain.setValueAtTime(0.18, now)
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
  osc1.connect(gain1)
  gain1.connect(ctx.destination)
  osc1.start(now)
  osc1.stop(now + 0.18)

  // Tone 2: E6 (1319 Hz) — ascending follow-up
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.type = 'sine'
  osc2.frequency.value = 1319
  gain2.gain.setValueAtTime(0.18, now + 0.12)
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.start(now + 0.12)
  osc2.stop(now + 0.35)
}
