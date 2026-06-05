/**
 * useLucyLocal — on-device Lucy via WebLLM (Llama 3.2 3B in browser).
 *
 * Runs when anvil (norman.soundchain.io) is unreachable — e.g. anvil powered
 * down, off-grid, regulatory blackout. WebGPU-accelerated; first call lazy-
 * downloads ~2.3–3GB then caches in OPFS. Subsequent loads are instant.
 *
 * iOS Safari 18+ has WebGPU. Android Chrome has WebGPU. Older browsers fail
 * gracefully with a clear error.
 *
 * This is v0 of the phone-fallback story. v1 wraps Lucy in Capacitor and
 * bridges to Apple Foundation Models for true on-Neural-Engine inference.
 */

import { useCallback, useRef, useState } from 'react'

// On-device model — Llama 3.2 3B (Frank, Jun 1 2026: "3B minimum, never lower").
// 3B is the realistic CEILING for a PWA: it's not the phone's RAM that limits us
// (modern iPhones have 8GB) — it's the BROWSER. iOS Safari's WebGPU sandbox caps
// buffer size + iOS jetsam kills any tab that uses too much memory, well under
// physical RAM. 3B@4bit (~2.3GB f16 / ~3GB f32) sits right at that edge and runs.
// 8B (~5–6GB) blows past the browser budget → Safari terminates the tab. The only
// way past 3B on a phone is a NATIVE app (full RAM + Neural Engine) — which is
// off the table by design: Lucy stays a PWA so no gatekeeper touches the vision.
//
// Two quantizations:
//   q4f16 (~2.3GB) — needs the WebGPU `shader-f16` feature. Fast where available.
//   q4f32 (~3.0GB) — no f16 requirement. The ONLY one that runs on iOS Safari,
//                    whose WebGPU does not expose shader-f16. Without this the
//                    weights download fine then the shader compile dies → the
//                    "device option doesn't work" hang on iPhone.
// Pick per-device at init time, fall back f16→f32 if engine build fails.
const MODEL_F16 = 'Llama-3.2-3B-Instruct-q4f16_1-MLC'
const MODEL_F32 = 'Llama-3.2-3B-Instruct-q4f32_1-MLC'

// Probe the actual GPU adapter for shader-f16. iOS Safari → false → use f32.
async function pickModelId(): Promise<string> {
  try {
    const adapter = await (navigator as any).gpu?.requestAdapter?.()
    if (adapter?.features?.has?.('shader-f16')) return MODEL_F16
  } catch {/* fall through to the safe choice */}
  return MODEL_F32
}

export type LocalChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export interface LocalLucyState {
  supported: boolean | null  // null = not checked yet
  ready: boolean
  loading: boolean
  loadProgress: number
  loadStatus: string
  error: string | null
}

export function useLucyLocal() {
  const engineRef = useRef<any>(null)
  const [state, setState] = useState<LocalLucyState>({
    supported: null,
    ready: false,
    loading: false,
    loadProgress: 0,
    loadStatus: '',
    error: null,
  })

  const checkSupport = useCallback((): boolean => {
    if (typeof window === 'undefined') return false
    const ok = 'gpu' in navigator
    setState(s => ({ ...s, supported: ok, error: ok ? s.error : 'WebGPU not available on this browser. Try Safari 18+, Chrome, or Edge.' }))
    return ok
  }, [])

  const init = useCallback(async (force = false) => {
    if (!force && engineRef.current) return engineRef.current
    if (force && engineRef.current) {
      // Dispose the stale engine before re-creating. WebLLM's engine releases
      // GPU resources on dispose; without this we leak per failed call.
      try { await engineRef.current.unload?.() } catch {/* best-effort */}
      engineRef.current = null
    }
    if (typeof window === 'undefined') throw new Error('Local Lucy is browser-only')
    if (!('gpu' in navigator)) {
      const msg = 'WebGPU not available on this browser. Try Safari 18+, Chrome, or Edge.'
      setState(s => ({ ...s, supported: false, error: msg }))
      throw new Error(msg)
    }

    // Make the cached model weights PERSISTENT before the ~3GB download lands.
    // WebLLM caches weights in the origin's Cache/OPFS storage so a downloaded
    // model runs fully offline forever (the "local app" feel). BUT iOS Safari
    // evicts script-written storage after ~7 days idle or under storage pressure
    // → without this the model silently re-downloads every visit ("Lucy keeps
    // re-loading on device"). navigator.storage.persist() requests the durable
    // bucket that's exempt from that eviction. Installed as a PWA (Add to Home
    // Screen) it's persistent by default — this covers the plain-tab case too.
    // Best-effort: never block the load if the API is missing or the user denies.
    try { await (navigator as any).storage?.persist?.() } catch {/* best-effort */}

    setState(s => ({ ...s, supported: true, loading: true, error: null, loadProgress: 0, loadStatus: 'Starting…' }))
    try {
      const mod: any = await import('@mlc-ai/web-llm')
      const create = mod.CreateMLCEngine || mod.default?.CreateMLCEngine
      if (!create) throw new Error('WebLLM CreateMLCEngine not found')
      const onProgress = (p: any) => {
        setState(s => ({
          ...s,
          loadProgress: typeof p?.progress === 'number' ? p.progress : s.loadProgress,
          loadStatus: typeof p?.text === 'string' ? p.text : s.loadStatus,
        }))
      }
      const primary = await pickModelId()
      // Cap the KV cache. The 3B weights are ~3GB (f32); WebLLM's DEFAULT context
      // window builds a multi-GB KV cache on top → total blows past iOS Safari's
      // jetsam budget → the tab crashes mid-load (the "tap local → loads → crash"
      // on iPhone). A 2048 window is plenty for chat (compact LOCAL prompt + a few
      // turns) and cuts the KV cache by 2-4×, keeping the 3B under the budget.
      const CHAT_OPTS = { context_window_size: 2048 }
      let engine
      try {
        engine = await create(primary, { initProgressCallback: onProgress }, CHAT_OPTS)
      } catch (buildErr) {
        // f16 can build-fail on a GPU that advertises shader-f16 but chokes on
        // the compile (some mobile drivers). Fall back to the universal f32.
        if (primary === MODEL_F16) {
          setState(s => ({ ...s, loadProgress: 0, loadStatus: 'Switching to compatible model…' }))
          engine = await create(MODEL_F32, { initProgressCallback: onProgress }, CHAT_OPTS)
        } else {
          throw buildErr
        }
      }
      engineRef.current = engine
      setState(s => ({ ...s, ready: true, loading: false, loadProgress: 1, loadStatus: 'Ready' }))
      return engine
    } catch (err: any) {
      const msg = err?.message || 'Local Lucy init failed'
      setState(s => ({ ...s, loading: false, error: msg }))
      throw new Error(msg)
    }
  }, [])

  // Detect a dead WebLLM engine (disposed by iOS memory reclaim, or never
  // finished loading). The model name + the literal error strings WebLLM
  // throws are the reliable signals.
  const isDeadEngineError = (err: any): boolean => {
    const msg = (err?.message || err?.toString?.() || '').toLowerCase()
    return (
      msg.includes('object has already been disposed') ||
      msg.includes('model not loaded') ||
      msg.includes('ensure you have called') ||
      msg.includes('reload(model)')
    )
  }

  const chatStream = useCallback(
    async function* (messages: LocalChatMessage[], signal?: AbortSignal): AsyncGenerator<string, void, unknown> {
      // Lazy init OR re-init if the engine got disposed underneath us (iOS
      // can dispose WebGPU resources between tabs / memory reclaim). One
      // automatic retry with a fresh engine before bubbling up.
      let engine = engineRef.current || (await init())
      let stream
      try {
        // No max_tokens param — WebLLM rejects -1 ("Make sure max_tokens > 0")
        // and treats an absent value as "let the model run to EOS or its own
        // context limit." That's the unbounded behavior we want on-device.
        stream = await engine.chat.completions.create({
          messages,
          stream: true,
          temperature: 0.7,
        })
      } catch (err: any) {
        if (!isDeadEngineError(err)) throw err
        // Stale engine — drop it and rebuild, then retry the call once.
        engineRef.current = null
        setState(s => ({ ...s, ready: false, loadStatus: 'Reloading model…' }))
        engine = await init(true)
        stream = await engine.chat.completions.create({
          messages,
          stream: true,
          temperature: 0.7,
        })
      }
      try {
        for await (const chunk of stream) {
          if (signal?.aborted) break
          const token: string = chunk?.choices?.[0]?.delta?.content || ''
          if (token) yield token
        }
      } catch (err: any) {
        // Mid-stream dispose — surface a useful message instead of leaking the
        // internal one. The next call will auto-reinit.
        if (isDeadEngineError(err)) {
          engineRef.current = null
          setState(s => ({ ...s, ready: false }))
          throw new Error('On-device model was unloaded mid-reply (likely iOS memory reclaim). Send the message again to retry.')
        }
        throw err
      }
    },
    [init]
  )

  return { ...state, checkSupport, init, chatStream }
}
