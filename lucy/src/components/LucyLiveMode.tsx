/**
 * LucyLiveMode — Phase 11.5 of the Lucy stack.
 *
 * "Go Live" with Lucy. FaceTime-style fullscreen view where the iPhone
 * camera streams continuously to anvil, Lucy describes what she sees
 * and answers questions in real-time via voice.
 *
 * Architecture:
 *   - getUserMedia rear camera at 720p (live <video> preview, no recording)
 *   - Frame capture every CAPTURE_INTERVAL_MS (default 6s) — paced for
 *     M5000's LLaVA throughput (~3-5s per inference). Scene-diff detection
 *     skips identical frames so she doesn't re-narrate static views.
 *   - Continuous SpeechRecognition (always listening like a phone call) —
 *     when Frank speaks, transcript bumps the next frame to Lucy with
 *     the question as context.
 *   - TTS sentence-by-sentence playback (managed queue + iOS keepalive,
 *     same pattern as /norman). Audio routes to whatever BT device is
 *     paired (Beats Fit Pro / AirPods / etc).
 *
 * UX states (visible in top status bar):
 *   - WATCHING — camera live, Lucy idle
 *   - LISTENING — Frank's voice detected, transcript in flight
 *   - THINKING — frame + question sent to anvil, awaiting tokens
 *   - SPEAKING — Lucy generating audio, words playing in earbuds
 *
 * Phase 11.6 (banked) — WebSocket streaming to anvil for sub-second
 * response, MiniCPM-V or PaliGemma instead of LLaVA for ~1s inference.
 */
import { useEffect, useRef, useState } from 'react'
import { getVoiceConfig } from 'components/LucyVoicePicker'

type LiveStatus = 'watching' | 'listening' | 'thinking' | 'speaking'

interface LucyLiveModeProps {
  onClose: () => void
  /** ms between auto-captures when no question is in flight */
  captureIntervalMs?: number
}

// LLaVA/llama.cpp special tokens occasionally leak into the stream when the
// model destabilizes (e.g. confusing visual input → fallback to CJK glyphs or
// raw control tokens). Strip them before display + TTS so the bubble never
// shows `<unk>`/`<s>`/`<|im_start|>` etc, and we don't speak garbage glyphs.
const SPECIAL_TOKEN_RE = /<\/?s>|<unk>|<\|[^|]*?\|>|\[\/?INST\]|\[\/?SYS\]|<\|endoftext\|>/gi
// CJK ideographs, Hangul, box-drawing, geometric shapes — Lucy speaks English.
// A short run is benign; collapse longer corrupted runs to a single ellipsis.
const GARBAGE_RUN_RE = /[　-鿿가-힯─-▟■-◿-]{3,}/g
function sanitizeNarration(text: string): string {
  return text
    .replace(SPECIAL_TOKEN_RE, '')
    .replace(GARBAGE_RUN_RE, '…')
    .replace(/\s{3,}/g, ' ')
}

/**
 * iOS audio quirk: while SpeechRecognition runs continuously, the audio
 * session is locked in voice-chat mode and TTS playback gets attenuated
 * or routed weirdly through BT earbuds. The reliable fix is to PAUSE
 * recognition while Lucy speaks, then resume after. This module-level
 * helper is shared between the continuous-listener and the TTS pump.
 */

export default function LucyLiveMode({ onClose, captureIntervalMs = 6000 }: LucyLiveModeProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const ttsQueueRef = useRef<string[]>([])
  const ttsActiveRef = useRef(false)
  const inFlightRef = useRef(false)
  const lastFrameHashRef = useRef('')
  const captureTimerRef = useRef<any>(null)
  const pendingQuestionRef = useRef<string>('')
  const lastNarrationRef = useRef<string>('')

  const [status, setStatus] = useState<LiveStatus>('watching')
  const [latestNarration, setLatestNarration] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [showBubbles, setShowBubbles] = useState(true)
  const mutedRef = useRef(false)
  const sttPausedRef = useRef(false)
  useEffect(() => { mutedRef.current = muted }, [muted])

  // ───────── Camera startup
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        // Audible greeting on Live Mode start — confirms audio chain is
        // routing correctly to Frank's earbuds BEFORE the first inference
        // roundtrip. If he doesn't hear this, audio is muted/broken and
        // he knows immediately. Doubles as iOS audio session unlock from
        // within the page's user-gesture-initiated mount.
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          // First cancel any in-flight TTS from prior session
          window.speechSynthesis.cancel()
          // Silent unlock utterance first
          const unlock = new SpeechSynthesisUtterance(' ')
          unlock.volume = 0
          window.speechSynthesis.speak(unlock)
          // Then audible greeting at full volume in selected persona voice
          const greet = new SpeechSynthesisUtterance("I'm with you Frank. Show me what you're looking at.")
          greet.volume = 1.0
          const { voice, rate, pitch } = getVoiceConfig()
          if (voice) greet.voice = voice
          greet.rate = rate
          greet.pitch = pitch
          // Force playback session — play via Audio element too as belt-and-suspenders
          try {
            const silentWav = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
            const a = new Audio(silentWav)
            a.volume = 0
            a.play().catch(() => {})
          } catch {}
          window.speechSynthesis.speak(greet)
        }
        // Kick off the first capture after greeting starts (slight delay
        // so the greeting isn't drowned out by a same-time inference)
        setTimeout(() => captureAndAsk(''), 1500)
      } catch (err: any) {
        setError(`Camera: ${err?.message || 'permission denied'}`)
      }
    })()
    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (captureTimerRef.current) clearTimeout(captureTimerRef.current)
      try { recognitionRef.current?.stop() } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ───────── Continuous SpeechRecognition (like a phone call)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    let finalText = ''
    let restartTimer: any = null

    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalText = (finalText + ' ' + t).trim()
        } else {
          interim += t
        }
      }
      // Show "listening" state any time speech is detected
      if (interim || finalText) {
        setStatus((s) => (s === 'speaking' || s === 'thinking' ? s : 'listening'))
      }
    }
    rec.onerror = (e: any) => {
      // 'no-speech' fires constantly during silence — ignore
      if (!/no-speech|aborted/.test(e.error || '')) {
        // eslint-disable-next-line no-console
        console.warn('[LucyLive] speech error:', e.error)
      }
    }
    rec.onend = () => {
      // On a complete utterance, send the question with the next frame
      if (finalText) {
        pendingQuestionRef.current = finalText
        finalText = ''
        captureAndAsk(pendingQuestionRef.current)
        pendingQuestionRef.current = ''
      }
      // Auto-restart so the call stays "open" continuously — but ONLY if
      // we haven't been paused for TTS playback. sttPausedRef means Lucy
      // is speaking; mic stays off until she's done so iOS audio session
      // can stay in playback mode and BT earbuds hear her clearly.
      if (!sttPausedRef.current) {
        restartTimer = setTimeout(() => {
          try { rec.start() } catch {}
        }, 200)
      }
    }
    recognitionRef.current = rec
    try { rec.start() } catch {}

    return () => {
      try { rec.abort?.() } catch {}
      try { rec.stop() } catch {}
      if (restartTimer) clearTimeout(restartTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ───────── iOS TTS keepalive + flush pump
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const keepalive = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }
    }, 10000)
    const pump = setInterval(() => {
      if (ttsQueueRef.current.length > 0) speakNext()
    }, 1000)
    return () => {
      clearInterval(keepalive)
      clearInterval(pump)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function speakNext() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    if (mutedRef.current) {
      ttsQueueRef.current = []
      sttPausedRef.current = false
      // Mic can resume now that we're not speaking
      try { recognitionRef.current?.start() } catch {}
      return
    }
    const synth = window.speechSynthesis
    if (ttsActiveRef.current && !synth.speaking && !synth.pending) {
      ttsActiveRef.current = false
    }
    if (ttsActiveRef.current) return
    const text = ttsQueueRef.current.shift()
    if (!text) {
      // No more queued — back to WATCHING when nothing else in flight
      if (!inFlightRef.current) setStatus('watching')
      // Resume mic now that Lucy's done speaking
      if (sttPausedRef.current) {
        sttPausedRef.current = false
        try { recognitionRef.current?.start() } catch {}
      }
      return
    }
    // Pause continuous mic during TTS so iOS audio session stays in
    // playback mode — otherwise voice-chat mode attenuates Lucy's voice
    // through BT earbuds and Frank can't hear her.
    if (!sttPausedRef.current) {
      sttPausedRef.current = true
      try { recognitionRef.current?.stop() } catch {}
    }
    const u = new SpeechSynthesisUtterance(text)
    u.volume = 1.0
    const { voice, rate, pitch } = getVoiceConfig()
    if (voice) u.voice = voice
    u.rate = rate
    u.pitch = pitch
    u.onstart = () => setStatus('speaking')
    u.onend = () => {
      ttsActiveRef.current = false
      speakNext()
    }
    u.onerror = () => {
      ttsActiveRef.current = false
      speakNext()
    }
    ttsActiveRef.current = true
    synth.speak(u)
  }

  // ───────── Frame capture + Lucy roundtrip
  async function captureAndAsk(question: string) {
    if (inFlightRef.current) return
    if (!videoRef.current || !streamRef.current) return
    const video = videoRef.current
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) {
      // video not ready yet — retry shortly
      captureTimerRef.current = setTimeout(() => captureAndAsk(question), 500)
      return
    }
    const scale = Math.min(1, 768 / Math.max(w, h))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    const b64 = dataUrl.replace(/^data:image\/[^;]+;base64,/, '')

    // Phase 11.6.1 — smarter scene-diff. Sample 64 bytes evenly across the
    // base64 string instead of just head+tail; cheap perceptual-ish hash that
    // catches camera drift without re-narrating identical-ish views. Threshold
    // counts mismatched samples — needs at least 8 differences (12.5%) to
    // count as a scene change worth narrating.
    const sampleStride = Math.max(1, Math.floor(b64.length / 64))
    let sampled = ''
    for (let i = 0; i < 64; i++) sampled += b64[i * sampleStride] || ''
    const prevSamples = lastFrameHashRef.current
    let diffCount = 0
    if (prevSamples && prevSamples.length === sampled.length) {
      for (let i = 0; i < sampled.length; i++) {
        if (sampled[i] !== prevSamples[i]) diffCount++
      }
    }
    const SCENE_DIFF_THRESHOLD = 8 // out of 64
    if (!question && prevSamples && diffCount < SCENE_DIFF_THRESHOLD) {
      scheduleNextCapture()
      return
    }
    lastFrameHashRef.current = sampled

    inFlightRef.current = true
    setStatus('thinking')

    const userText = question || (lastNarrationRef.current
      ? 'Has anything significant changed in the scene?'
      : 'What do you see right now?')

    try {
      const res = await fetch('/api/norman/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: userText, images: [b64] },
          ],
        }),
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''
      let spokenIndex = 0
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const obj = JSON.parse(line)
            const token = obj?.message?.content || ''
            if (token) {
              accumulated += token
              setLatestNarration(sanitizeNarration(accumulated))
              // Speak completed sentences as they arrive
              const tail = accumulated.slice(spokenIndex)
              const sentenceRe = /[^.!?\n]+[.!?\n]+/g
              let m: RegExpExecArray | null
              let consumed = 0
              while ((m = sentenceRe.exec(tail)) !== null) {
                const s = sanitizeNarration(m[0]).trim()
                if (s.length > 1) {
                  ttsQueueRef.current.push(s)
                  speakNext()
                }
                consumed = m.index + m[0].length
              }
              if (consumed > 0) spokenIndex += consumed
            }
          } catch {
            // ignore partial lines
          }
        }
      }
      const finalTail = sanitizeNarration(accumulated.slice(spokenIndex)).trim()
      if (finalTail.length > 1) {
        ttsQueueRef.current.push(finalTail)
        speakNext()
      }
      lastNarrationRef.current = sanitizeNarration(accumulated)
    } catch (err: any) {
      setError(err?.message || 'Lucy is unreachable')
    } finally {
      inFlightRef.current = false
      // Schedule the next auto-capture after the response settles
      scheduleNextCapture()
    }
  }

  function scheduleNextCapture() {
    if (captureTimerRef.current) clearTimeout(captureTimerRef.current)
    captureTimerRef.current = setTimeout(() => {
      captureAndAsk('')
    }, captureIntervalMs)
  }

  function endCall() {
    // Full teardown — without this, the audio session stays locked in
    // voice-chat mode after Live closes and TTS playback on the regular
    // /norman page comes out attenuated or silent. Order matters: stop
    // mic FIRST (releases iOS audio session), then cancel TTS, then
    // release camera.
    sttPausedRef.current = true
    try { recognitionRef.current?.abort?.() } catch {}
    try { recognitionRef.current?.stop() } catch {}
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    ttsQueueRef.current = []
    ttsActiveRef.current = false
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (captureTimerRef.current) clearTimeout(captureTimerRef.current)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      {/* Live video preview fills the screen */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Top status strip — Phase 11.6.1 polish: bigger pulsing indicator,
          status word in larger font, clear visual hierarchy so Frank knows at
          a glance whether Lucy is watching, hearing him, thinking, or
          speaking. */}
      <div className="relative z-10 px-4 pt-[max(env(safe-area-inset-top,12px),12px)] pb-3 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-3">
        <div className={`w-4 h-4 rounded-full transition-all ${
          status === 'watching' ? 'bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.7)]' :
          status === 'listening' ? 'bg-amber-400 animate-pulse shadow-[0_0_14px_rgba(251,191,36,0.9)]' :
          status === 'thinking' ? 'bg-purple-400 animate-pulse shadow-[0_0_14px_rgba(168,85,247,0.9)]' :
          'bg-pink-500 animate-pulse shadow-[0_0_18px_rgba(236,72,153,1)]'
        }`} />
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-semibold flex items-center gap-2">
            Live with Lucy
            <span className={`text-[11px] font-mono uppercase tracking-wider ${
              status === 'watching' ? 'text-cyan-300' :
              status === 'listening' ? 'text-amber-300' :
              status === 'thinking' ? 'text-purple-300' :
              'text-pink-300'
            }`}>
              {status === 'watching' ? '· watching' :
               status === 'listening' ? '· hearing you' :
               status === 'thinking' ? '· thinking…' :
               '· speaking'}
            </span>
          </div>
          <div className="text-[10px] text-white/60 font-mono">
            anvil · M5000 · minicpm-v
          </div>
        </div>
        <button
          onClick={endCall}
          className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold shadow-[0_0_16px_rgba(239,68,68,0.6)]"
        >
          end
        </button>
      </div>

      {/* Lucy's latest narration overlay (closed-caption style) — togglable */}
      <div className="flex-1" />

      {showBubbles && latestNarration && (
        <div className="relative z-10 mx-4 mb-3 p-3 rounded-2xl bg-black/70 backdrop-blur-sm border border-white/10 max-h-[40vh] overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wide text-cyan-400 mb-1">Lucy</div>
          <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">{latestNarration}</div>
        </div>
      )}

      {error && (
        <div className="relative z-10 mx-4 mb-3 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Bottom controls */}
      <div className="relative z-10 pb-[max(env(safe-area-inset-bottom,16px),16px)] pt-3 px-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-around gap-4">
        <button
          onClick={() => setMuted((m) => !m)}
          className={`flex flex-col items-center gap-1 ${muted ? 'opacity-60' : ''}`}
          aria-label={muted ? 'unmute Lucy' : 'mute Lucy'}
        >
          <div className={`w-12 h-12 rounded-full grid place-items-center text-xl ${
            muted ? 'bg-white/10 border border-white/20' : 'bg-cyan-500/20 border border-cyan-500/40'
          }`}>
            {muted ? '🔇' : '🔊'}
          </div>
          <div className="text-[10px] text-white/70">{muted ? 'muted' : 'voice'}</div>
        </button>
        <button
          onClick={() => setShowBubbles((b) => !b)}
          className={`flex flex-col items-center gap-1 ${showBubbles ? '' : 'opacity-60'}`}
          aria-label={showBubbles ? 'hide subtitles' : 'show subtitles'}
        >
          <div className={`w-12 h-12 rounded-full grid place-items-center text-xl ${
            showBubbles ? 'bg-cyan-500/20 border border-cyan-500/40' : 'bg-white/10 border border-white/20'
          }`}>
            {showBubbles ? '💬' : '🚫'}
          </div>
          <div className="text-[10px] text-white/70">{showBubbles ? 'subtitles' : 'voice only'}</div>
        </button>
        <button
          onClick={() => captureAndAsk('What do you see right now? Describe in detail.')}
          className="flex flex-col items-center gap-1"
          aria-label="ask Lucy now"
        >
          <div className="w-16 h-16 rounded-full bg-white grid place-items-center text-2xl shadow-[0_0_20px_rgba(255,255,255,0.4)] active:scale-95 transition-transform">
            🧠
          </div>
          <div className="text-[10px] text-white/70">describe now</div>
        </button>
        <button
          onClick={endCall}
          className="flex flex-col items-center gap-1"
          aria-label="end call"
        >
          <div className="w-12 h-12 rounded-full bg-red-500 grid place-items-center text-xl shadow-[0_0_16px_rgba(239,68,68,0.6)]">
            ✕
          </div>
          <div className="text-[10px] text-white/70">end</div>
        </button>
      </div>
    </div>
  )
}
