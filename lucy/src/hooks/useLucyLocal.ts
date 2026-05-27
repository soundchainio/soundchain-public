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

// 1B chosen for first-load weight (~700MB q4f16). Bumps to 3B once we're sure
// iPhones tolerate the download — model identifier swap, nothing else.
const DEFAULT_MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'

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
      const engine = await create(DEFAULT_MODEL_ID, {
        initProgressCallback: (p: any) => {
          setState(s => ({
            ...s,
            loadProgress: typeof p?.progress === 'number' ? p.progress : s.loadProgress,
            loadStatus: typeof p?.text === 'string' ? p.text : s.loadStatus,
          }))
        },
      })
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
        max_tokens: 1024,
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
