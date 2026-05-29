/**
 * useLucyLocal — on-device Lucy fallback via WebLLM (Llama 3.2 1B in browser).
 *
 * Runs when anvil (norman.soundchain.io) is unreachable — e.g. anvil powered
 * down, off-grid, regulatory blackout. WebGPU-accelerated; first call lazy-
 * downloads ~800MB then caches in OPFS. Subsequent loads are instant.
 *
 * iOS Safari 18+ has WebGPU. Android Chrome has WebGPU. Older browsers fail
 * gracefully with a clear error.
 *
 * This is v0 of the phone-fallback story. v1 wraps Lucy in Capacitor and
 * bridges to Apple Foundation Models for true on-Neural-Engine inference.
 */

import { useCallback, useRef, useState } from 'react'

// 1B chosen for first-load weight. Two quantizations:
//   q4f16 (~700MB) — needs the WebGPU `shader-f16` feature. Fast where available.
//   q4f32 (~1.1GB) — no f16 requirement. The ONLY one that runs on iOS Safari,
//                    whose WebGPU does not expose shader-f16. Without this the
//                    weights download fine then the shader compile dies → the
//                    "device option doesn't work" hang on iPhone.
// We pick per-device at init time, and fall back f16→f32 if engine build fails.
const MODEL_F16 = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
const MODEL_F32 = 'Llama-3.2-1B-Instruct-q4f32_1-MLC'

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

  const init = useCallback(async () => {
    if (engineRef.current) return engineRef.current
    if (typeof window === 'undefined') throw new Error('Local Lucy is browser-only')
    if (!('gpu' in navigator)) {
      const msg = 'WebGPU not available on this browser. Try Safari 18+, Chrome, or Edge.'
      setState(s => ({ ...s, supported: false, error: msg }))
      throw new Error(msg)
    }

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
      let engine
      try {
        engine = await create(primary, { initProgressCallback: onProgress })
      } catch (buildErr) {
        // f16 can build-fail on a GPU that advertises shader-f16 but chokes on
        // the compile (some mobile drivers). Fall back to the universal f32.
        if (primary === MODEL_F16) {
          setState(s => ({ ...s, loadProgress: 0, loadStatus: 'Switching to compatible model…' }))
          engine = await create(MODEL_F32, { initProgressCallback: onProgress })
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

  const chatStream = useCallback(
    async function* (messages: LocalChatMessage[], signal?: AbortSignal): AsyncGenerator<string, void, unknown> {
      const engine = engineRef.current || (await init())
      const stream = await engine.chat.completions.create({
        messages,
        stream: true,
        temperature: 0.7,
        // No max_tokens cap. Standing directive: Lucy lives on the user's
        // device, so length shouldn't be artificially bounded. The model
        // stops naturally on EOS or when it runs into its own context
        // ceiling. Trade-off accepted: very long generations can push iOS
        // Safari into a memory-reclaim reload on some phones.
        max_tokens: -1,
      })
      for await (const chunk of stream) {
        if (signal?.aborted) break
        const token: string = chunk?.choices?.[0]?.delta?.content || ''
        if (token) yield token
      }
    },
    [init]
  )

  return { ...state, checkSupport, init, chatStream }
}
