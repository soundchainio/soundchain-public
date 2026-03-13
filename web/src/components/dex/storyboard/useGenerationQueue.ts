import { useState, useRef, useCallback, useEffect } from 'react'
import type { StoryboardFrame, StoryboardAction, GenerateResult, FaceBankEntry } from './storyboardTypes'
import { STYLE_PRESETS, DEFAULT_NEGATIVE } from './storyboardConstants'

interface QueueProgress {
  running: boolean
  currentIndex: number
  totalCount: number
  elapsedSeconds: number
}

export function useGenerationQueue(
  frames: StoryboardFrame[],
  faceBank: FaceBankEntry[],
  dispatch: React.Dispatch<StoryboardAction>,
) {
  const [progress, setProgress] = useState<QueueProgress>({
    running: false,
    currentIndex: 0,
    totalCount: 0,
    elapsedSeconds: 0,
  })

  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Elapsed timer
  useEffect(() => {
    if (progress.running) {
      timerRef.current = setInterval(() => {
        setProgress((p) => ({ ...p, elapsedSeconds: p.elapsedSeconds + 1 }))
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [progress.running])

  const generateSingleFrame = useCallback(
    async (frame: StoryboardFrame, signal: AbortSignal): Promise<GenerateResult> => {
      const preset = STYLE_PRESETS.find((p) => p.label === frame.preset)
      const fullPrompt = preset ? preset.prefix + frame.prompt : frame.prompt
      const negativePrompt = frame.negativePrompt || (preset ? preset.negative + ', ' + DEFAULT_NEGATIVE : DEFAULT_NEGATIVE)

      // Resolve face references
      const assignedFaceEntries = frame.assignedFaces
        .map((fid) => faceBank.find((f) => f.id === fid))
        .filter(Boolean) as FaceBankEntry[]

      const useIpAdapter = assignedFaceEntries.length >= 1
      const body: Record<string, unknown> = {
        prompt: fullPrompt,
        backend: 'imagine',
        model: frame.model,
        negativePrompt,
        width: frame.width,
        height: frame.height,
        steps: frame.steps,
        seed: frame.seed,
        cfg: frame.cfg,
      }

      if (useIpAdapter) {
        body.referenceImages = assignedFaceEntries.map((f) => f.dataUrl)
        body.faceMode = true
        body.ipScale = frame.ipScale
      }

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      })

      const text = await res.text()
      let data: GenerateResult
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(
          res.status === 413
            ? 'Images too large — try fewer reference images or a faster model'
            : res.status === 504 || res.status === 408
            ? 'Generation timed out — try a faster model or smaller dimensions'
            : `Server error: ${text.slice(0, 200)}`
        )
      }
      if (!res.ok) {
        throw new Error((data as any).error || 'Generation failed')
      }
      return data
    },
    [faceBank],
  )

  const generateFrame = useCallback(
    async (frame: StoryboardFrame) => {
      if (!frame.prompt.trim()) return

      abortRef.current = new AbortController()
      dispatch({ type: 'FRAME_GENERATING', id: frame.id })

      setProgress({ running: true, currentIndex: 0, totalCount: 1, elapsedSeconds: 0 })

      try {
        const result = await generateSingleFrame(frame, abortRef.current.signal)
        dispatch({ type: 'FRAME_DONE', id: frame.id, result })
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          dispatch({ type: 'FRAME_ERROR', id: frame.id, error: err.message || 'Generation failed' })
        }
      } finally {
        setProgress((p) => ({ ...p, running: false }))
      }
    },
    [dispatch, generateSingleFrame],
  )

  const generateAll = useCallback(
    async (frameIds?: string[]) => {
      const framesToGenerate = frameIds
        ? frames.filter((f) => frameIds.includes(f.id) && f.prompt.trim())
        : frames.filter((f) => f.prompt.trim() && f.status !== 'done')

      if (framesToGenerate.length === 0) return

      abortRef.current = new AbortController()
      setProgress({ running: true, currentIndex: 0, totalCount: framesToGenerate.length, elapsedSeconds: 0 })

      for (let i = 0; i < framesToGenerate.length; i++) {
        if (abortRef.current.signal.aborted) break

        const frame = framesToGenerate[i]
        dispatch({ type: 'FRAME_GENERATING', id: frame.id })
        setProgress((p) => ({ ...p, currentIndex: i }))

        try {
          const result = await generateSingleFrame(frame, abortRef.current.signal)
          dispatch({ type: 'FRAME_DONE', id: frame.id, result })
        } catch (err: any) {
          if (err.name === 'AbortError') break
          dispatch({ type: 'FRAME_ERROR', id: frame.id, error: err.message || 'Generation failed' })
        }
      }

      setProgress((p) => ({ ...p, running: false }))
    },
    [frames, dispatch, generateSingleFrame],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setProgress((p) => ({ ...p, running: false }))
    // Reset any frames still in generating state
    frames.forEach((f) => {
      if (f.status === 'generating') {
        dispatch({ type: 'UPDATE_FRAME', id: f.id, changes: { status: 'empty' } })
      }
    })
  }, [frames, dispatch])

  return { progress, generateFrame, generateAll, cancel }
}
