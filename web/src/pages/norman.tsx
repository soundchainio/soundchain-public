/**
 * /norman — Lucy chat interface w/ voice in + voice out (Jarvis mode).
 *
 * Furda1-only beta. Talks to anvil's Ollama through /api/norman/chat with
 * streaming JSON-line responses. Sets window.__lucyThinking while tokens are
 * flowing so the Neural FFT visualizer in AgentStatusTicker pulses for real
 * instead of decoratively.
 *
 * Voice in: Web Speech Recognition (webkit-prefixed on iOS Safari) — tap mic,
 * speak, transcript fills textarea, auto-send when you stop speaking.
 *
 * Voice out (Phase 1 — robotic but works tonight): browser SpeechSynthesis.
 * Lucy speaks sentence-by-sentence as tokens arrive — she keeps talking while
 * she keeps thinking. Phase 2 swaps in Piper on anvil for natural voice.
 *
 * Audio routes to whatever bluetooth device the OS has paired (AirPods, Beats
 * Fit Pro, Galaxy Buds, etc.) — no code change needed.
 *
 * Conversation history is held in client memory only — IndexedDB persistence
 * + Lucy-as-FURL-singleton are next ships.
 */
import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useMe } from 'hooks/useMe'
import { useLucyMemory } from 'hooks/useLucyMemory'
import LucyVoicePicker, { getVoiceConfig } from 'components/LucyVoicePicker'
import dynamic from 'next/dynamic'

// Lazy-loaded — Live Mode is only mounted when Frank taps "Go Live", saves
// the rest of /norman's bundle from carrying the camera + STT continuous
// loop dead weight on initial chat load.
const LucyLiveMode = dynamic(() => import('components/LucyLiveMode'), { ssr: false })

type ChatMessage = { role: 'user' | 'assistant'; content: string; images?: string[] }

export default function NormanPage() {
  const router = useRouter()
  // useMe() returns the me object directly (not { me }) and returns undefined
  // when rendered outside Apollo provider — defensive destructure required.
  const me = useMe()
  // Phase 8: encrypted IndexedDB memory. Restores prior conversation on
  // mount, persists every assistant-complete turn. Local-only, never
  // touches a server.
  const { messages, setMessages, save: persistMessages, clear: clearMemory, ready: memoryReady } = useLucyMemory()
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [voiceOutEnabled, setVoiceOutEnabled] = useState(false)
  const [speechSupported, setSpeechSupported] = useState({ in: false, out: false })
  // Phase 11 — vision: pending image(s) attached to the next message. For
  // video files (Phase 11.2 — Lucy sees motion), we extract 5 evenly-spaced
  // keyframes and send them all as a chronological images array. LLaVA gets
  // a sense of motion across the clip without needing a true video-LM.
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [pendingImages, setPendingImages] = useState<string[]>([])
  const [pendingIsVideo, setPendingIsVideo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // Phase 11.5 — Lucy Live Mode (body-cam + Jarvis-style realtime). Tap the
  // 📡 GO LIVE button in the header to open the fullscreen FaceTime-style
  // session: continuous camera + continuous mic + Lucy narrates and answers.
  const [liveOpen, setLiveOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const recognitionRef = useRef<any>(null)
  // Live transcript while listening — onend reads this to auto-send the final
  // value, since useState closures capture stale `input` at handler-bind time.
  const liveTranscriptRef = useRef('')
  // Track how many chars of the in-flight assistant message have already been
  // spoken — TTS speaks the unspoken-tail at every sentence boundary.
  const spokenIndexRef = useRef(0)
  // Voice-out toggle as ref too, so streaming TTS doesn't capture stale state
  const voiceOutRef = useRef(false)
  useEffect(() => { voiceOutRef.current = voiceOutEnabled }, [voiceOutEnabled])

  // Managed sequential TTS queue. iOS Safari silently drops utterances
  // queued via consecutive speak() calls — the reliable pattern is to
  // chain each via onend. Kept in refs so streaming-token callbacks can
  // push without re-renders.
  const ttsQueueRef = useRef<string[]>([])
  const ttsActiveRef = useRef(false)

  // Detect SpeechRecognition + SpeechSynthesis support on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const synth = window.speechSynthesis
    setSpeechSupported({ in: !!SR, out: !!synth })

    if (SR) {
      const rec = new SR()
      rec.continuous = false
      rec.interimResults = true
      rec.lang = 'en-US'
      rec.onresult = (e: any) => {
        let txt = ''
        for (let i = 0; i < e.results.length; i++) {
          txt += e.results[i][0].transcript
        }
        liveTranscriptRef.current = txt
        setInput(txt)
      }
      rec.onerror = (e: any) => {
        // 'no-speech' / 'aborted' are user-initiated, ignore. Surface real errors.
        if (e.error && !/no-speech|aborted/.test(e.error)) {
          setError(`Voice: ${e.error}`)
        }
        setListening(false)
      }
      rec.onend = () => {
        setListening(false)
        // Auto-send if Lucy heard something
        const final = liveTranscriptRef.current.trim()
        if (final) {
          // Defer one tick so React state from onresult lands before send reads it
          setTimeout(() => sendWithText(final), 50)
        }
      }
      recognitionRef.current = rec
    }

    // Cleanup any in-flight TTS on unmount
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      try { recognitionRef.current?.stop() } catch {}
    }
  }, [])

  // Gate page — only furdA1 sees Lucy
  useEffect(() => {
    if (!me) return
    const handle = String(me.profile?.userHandle || '').toLowerCase()
    if (handle && handle !== 'furda1') {
      router.replace('/')
    }
  }, [me, router])

  // Hide the global FURL pill on /norman — Lucy IS the agent surface here,
  // FURL's mini search pill overlaps Lucy's reply bubbles in mid-screen.
  // Three-pronged defense + a final nuclear option: any iframe at fixed
  // position smaller than 100×100 on /norman is hidden, since the FURL
  // pill is the only such element and the title-attribute selector has
  // been unreliable in the field.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.add('lucy-active')

    const hideFurl = () => {
      const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe')
      iframes.forEach((f) => {
        const isFurl = f.title === 'FURL Terminal' || (f.src || '').includes('furl-terminal')
        if (isFurl) {
          f.style.setProperty('display', 'none', 'important')
          return
        }
        // Nuclear option — any small fixed-position iframe is suspect
        const rect = f.getBoundingClientRect()
        const style = window.getComputedStyle(f)
        if (style.position === 'fixed' && rect.width < 200 && rect.height < 200) {
          f.style.setProperty('display', 'none', 'important')
        }
      })
    }
    hideFurl()
    const observer = new MutationObserver(hideFurl)
    observer.observe(document.body, { childList: true, attributes: true, subtree: true, attributeFilter: ['style', 'src', 'title'] })
    // Also re-run periodically in case MutationObserver misses a re-mount
    const interval = setInterval(hideFurl, 2000)

    return () => {
      document.body.classList.remove('lucy-active')
      observer.disconnect()
      clearInterval(interval)
      const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe')
      iframes.forEach((f) => {
        const isFurl = f.title === 'FURL Terminal' || (f.src || '').includes('furl-terminal')
        if (isFurl) f.style.removeProperty('display')
      })
    }
  }, [])

  // iOS audio session reset — after using continuous SpeechRecognition
  // (Live Mode) or any getUserMedia call, iOS keeps the audio session
  // in "playAndRecord" mode, which routes TTS output through the tiny
  // earpiece speaker instead of the loud bottom speaker. Playing a
  // silent WAV on mount forces the session back to "playback" mode.
  // Triggered on every /norman mount as a safety net.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const silentWav = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
      const a = new Audio(silentWav)
      a.volume = 0
      const p = a.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } catch {}
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, streaming])

  function speakNext() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    // Bug B fix — iOS sometimes silently drops the onend callback, leaving
    // ttsActiveRef stuck at true forever. If we *think* we're active but
    // speechSynthesis itself reports neither speaking nor pending, the
    // utterance ended without firing onend — recover by clearing active.
    const synth = window.speechSynthesis
    if (ttsActiveRef.current && !synth.speaking && !synth.pending) {
      ttsActiveRef.current = false
    }
    if (ttsActiveRef.current) return
    if (!voiceOutRef.current) {
      ttsQueueRef.current = []
      return
    }
    const text = ttsQueueRef.current.shift()
    if (!text) return
    const u = new SpeechSynthesisUtterance(text)
    u.volume = 1.0
    const { voice, rate, pitch } = getVoiceConfig()
    if (voice) u.voice = voice
    u.rate = rate
    u.pitch = pitch
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

  function speakSentence(text: string) {
    if (!voiceOutRef.current) return
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    // Phase 10 — voice config (persona + rate + pitch) read inside speakNext
    // so each utterance picks up live persona changes mid-conversation.
    ttsQueueRef.current.push(text)
    speakNext()
  }

  // iOS Safari pauses speechSynthesis after ~15 seconds of utterance time.
  // Documented workaround: pause+resume periodically while voice is active.
  // Also runs a queue-flush pump every 1s as a safety net for dropped onend
  // callbacks (iOS bug — sometimes the callback never fires and we'd be
  // stuck at ttsActiveRef=true forever, blocking the next sentence).
  useEffect(() => {
    if (!voiceOutEnabled) return
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const keepalive = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }
    }, 10000)
    const pump = setInterval(() => {
      // If we have queued sentences and synth is idle, force-flush. speakNext
      // includes a state-mismatch detector that resets ttsActiveRef on idle.
      if (ttsQueueRef.current.length > 0) {
        speakNext()
      }
    }, 1000)
    return () => {
      clearInterval(keepalive)
      clearInterval(pump)
    }
  }, [voiceOutEnabled])

  function maybeSpeakNew(fullText: string) {
    if (!voiceOutRef.current) return
    const tail = fullText.slice(spokenIndexRef.current)
    // Find every complete sentence in the unspoken tail
    const sentenceRe = /[^.!?\n]+[.!?\n]+/g
    let match: RegExpExecArray | null
    let consumed = 0
    while ((match = sentenceRe.exec(tail)) !== null) {
      const sentence = match[0].trim()
      if (sentence.length > 1) speakSentence(sentence)
      consumed = match.index + match[0].length
    }
    if (consumed > 0) spokenIndexRef.current += consumed
  }

  async function sendWithText(text: string) {
    const trimmed = text.trim()
    // Phase 11 + 11.2 — allow send-with-image-only or video-only. For
    // videos we attach all keyframes and prepend a hint to the user
    // message so LLaVA knows these frames are chronological.
    const hasMedia = pendingImages.length > 0 || !!pendingImage
    const defaultText = pendingIsVideo
      ? 'These are 5 keyframes from a short video, in chronological order. Describe what happens.'
      : pendingImage
      ? 'What do you see?'
      : ''
    const effectiveText = trimmed || defaultText
    if (!effectiveText || streaming) return
    setError(null)
    const imagesForSend = pendingImages.length > 0 ? pendingImages : pendingImage ? [pendingImage] : []
    const userMsg: ChatMessage = {
      role: 'user',
      content: effectiveText,
      ...(imagesForSend.length > 0 ? { images: imagesForSend } : {}),
    }
    setPendingImage(null)
    setPendingImages([])
    setPendingIsVideo(false)
    const next = [...messages, userMsg, { role: 'assistant' as const, content: '' }]
    setMessages(next)
    setInput('')
    liveTranscriptRef.current = ''
    spokenIndexRef.current = 0
    // Cancel any in-flight TTS from previous turn (and clear our managed queue)
    ttsQueueRef.current = []
    ttsActiveRef.current = false
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setStreaming(true)
    if (typeof window !== 'undefined') (window as any).__lucyThinking = true

    try {
      const res = await fetch('/api/norman/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.images && m.images.length > 0 ? { images: m.images } : {}),
          })),
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
              setMessages((prev) => {
                const copy = [...prev]
                copy[copy.length - 1] = { role: 'assistant', content: accumulated }
                return copy
              })
              maybeSpeakNew(accumulated)
            }
          } catch {
            // ignore malformed lines (partial chunks across reads)
          }
        }
      }
      // Speak any final sentence-without-terminator
      const finalTail = accumulated.slice(spokenIndexRef.current).trim()
      if (finalTail.length > 1 && voiceOutRef.current) speakSentence(finalTail)
      // Phase 8: persist the now-complete turn to encrypted IndexedDB
      try {
        const completed = [...messages, userMsg, { role: 'assistant' as const, content: accumulated }]
        await persistMessages(completed)
      } catch {
        // memory persistence is best-effort — never block chat on it
      }
    } catch (err: any) {
      setError(err?.message || 'Lucy is unreachable.')
      setMessages((prev) => (prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev))
    } finally {
      setStreaming(false)
      if (typeof window !== 'undefined') (window as any).__lucyThinking = false
      inputRef.current?.focus()
    }
  }

  function send() { sendWithText(input) }

  // iOS native file picker — accept=image/* without a capture attribute opens
  // the action sheet (Take Photo / Photo Library / Choose Files). The picked
  // file is downscaled to 768px longest side + JPEG-encoded to keep the
  // base64 payload small enough for LLaVA on M5000 to handle quickly.
  function openImagePicker() {
    fileInputRef.current?.click()
  }

  async function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const isVideo = file.type.startsWith('video/')
    try {
      if (isVideo) {
        // Phase 11.2 — extract 5 evenly-spaced keyframes from the video.
        // LLaVA can take multiple images per message; we send them in
        // chronological order so Lucy can reason about motion + change
        // across the clip even without a true video-language model.
        const url = URL.createObjectURL(file)
        const video = document.createElement('video')
        video.src = url
        video.muted = true
        video.playsInline = true
        await new Promise<void>((res, rej) => {
          video.onloadedmetadata = () => res()
          video.onerror = () => rej(new Error('video decode failed'))
        })
        const duration = video.duration
        if (!isFinite(duration) || duration <= 0) {
          URL.revokeObjectURL(url)
          throw new Error('video has no duration')
        }
        const frames: string[] = []
        const FRAME_COUNT = 5
        for (let i = 0; i < FRAME_COUNT; i++) {
          // Seek evenly across the clip — 10%, 30%, 50%, 70%, 90%
          const t = duration * (0.1 + (0.8 * i) / (FRAME_COUNT - 1))
          await new Promise<void>((res, rej) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked)
              try {
                const w = video.videoWidth
                const h = video.videoHeight
                const scale = Math.min(1, 768 / Math.max(w, h))
                const canvas = document.createElement('canvas')
                canvas.width = Math.round(w * scale)
                canvas.height = Math.round(h * scale)
                const ctx = canvas.getContext('2d')
                if (!ctx) return rej(new Error('canvas ctx'))
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                const out = canvas.toDataURL('image/jpeg', 0.78)
                frames.push(out.replace(/^data:image\/[^;]+;base64,/, ''))
                res()
              } catch (err: any) {
                rej(err)
              }
            }
            video.addEventListener('seeked', onSeeked, { once: true })
            video.currentTime = t
          })
        }
        URL.revokeObjectURL(url)
        setPendingImages(frames)
        setPendingImage(frames[0]) // also set primary so single-image UI shows preview
        setPendingIsVideo(true)
      } else {
        // Image path — downscale via canvas to 768px longest side
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(reader.error || new Error('read failed'))
          reader.readAsDataURL(file)
        })
        const img = new Image()
        img.src = dataUrl
        await new Promise<void>((res, rej) => {
          img.onload = () => res()
          img.onerror = () => rej(new Error('image decode failed'))
        })
        const w = img.naturalWidth
        const h = img.naturalHeight
        const scale = Math.min(1, 768 / Math.max(w, h))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(w * scale)
        canvas.height = Math.round(h * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('canvas 2d ctx unavailable')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const out = canvas.toDataURL('image/jpeg', 0.85)
        const b64 = out.replace(/^data:image\/[^;]+;base64,/, '')
        setPendingImage(b64)
        setPendingImages([])
        setPendingIsVideo(false)
      }
    } catch (err: any) {
      setError(`${isVideo ? 'Video' : 'Image'}: ${err?.message || 'failed to load'}`)
    }
  }

  function toggleMic() {
    if (!recognitionRef.current) return
    if (listening) {
      try { recognitionRef.current.stop() } catch {}
      setListening(false)
    } else {
      // Cancel any in-flight TTS so Lucy isn't talking over you
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      liveTranscriptRef.current = ''
      setInput('')
      try {
        recognitionRef.current.start()
        setListening(true)
      } catch (err: any) {
        setError(`Mic: ${err?.message || 'failed to start'}`)
      }
    }
  }

  function toggleVoiceOut() {
    const next = !voiceOutEnabled
    setVoiceOutEnabled(next)
    // First tap-to-enable doubles as iOS audio-unlock — fire a silent utterance
    // so the rest of the conversation can speak without further user gestures.
    if (next && typeof window !== 'undefined' && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      window.speechSynthesis.speak(u)
    } else if (!next && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }

  if (me && String(me.profile?.userHandle || '').toLowerCase() !== 'furda1') {
    return null
  }

  return (
    <>
      <Head>
        <title>Lucy · SoundChain</title>
      </Head>
      {/*
        h-[100dvh] (dynamic viewport height) shrinks when iOS keyboard opens so
        the header stays pinned at the visible viewport top instead of being
        pushed off-screen with 100vh. overflow-hidden on the outer flex column
        confines scroll to the messages list — header + composer are flex
        children that can't be displaced. Standard mobile-chat layout.
      */}
      <div className="h-[100dvh] bg-black text-white flex flex-col overflow-hidden">
        {/* Phase 11.5 — Lucy Live Mode overlay (body-cam + JARVIS) */}
        {liveOpen && <LucyLiveMode onClose={() => setLiveOpen(false)} />}

        {/* Hidden native file picker — tap 📷 to trigger. iOS action sheet:
            Take Photo / Take Video / Photo Library / Choose Files. accept
            covers both image and video; on video pick we extract 5 keyframes
            and send as chronological images array (Phase 11.2). */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFilePicked}
          className="hidden"
          aria-hidden="true"
        />
        <header className="px-4 py-3 border-b border-white/10 flex items-center gap-3 bg-black/95 backdrop-blur z-10 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 grid place-items-center text-xl">
            🧠
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Lucy</div>
            <div className="text-[11px] text-gray-400 font-mono truncate">
              {listening
                ? 'listening…'
                : streaming
                ? 'thinking…'
                : 'running on anvil · M5000 · llama3.1'}
            </div>
          </div>
          {/* Phase 11.5 — Go Live with Lucy (body-cam + JARVIS-style realtime) */}
          <button
            onClick={() => setLiveOpen(true)}
            className="text-xs px-2 py-1 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 text-white font-semibold border border-red-400/50 shadow-[0_0_12px_rgba(239,68,68,0.5)] hover:shadow-[0_0_16px_rgba(239,68,68,0.7)] transition-all"
            title="Go Live with Lucy — body-cam mode, she sees + speaks in real time"
            aria-label="go live with Lucy"
          >
            📡 LIVE
          </button>
          {speechSupported.out && <LucyVoicePicker />}
          {speechSupported.out && (
            <button
              onClick={toggleVoiceOut}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                voiceOutEnabled
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
              }`}
              title={voiceOutEnabled ? 'voice on — tap to mute' : 'voice off — tap to enable'}
              aria-label="toggle Lucy's voice"
            >
              {voiceOutEnabled ? '🔊' : '🔇'}
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={async () => {
                if (confirm('Clear this conversation? Lucy will forget what we talked about. This only affects this device.')) {
                  await clearMemory()
                  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
                }
              }}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1"
              title="Clear conversation memory on this device"
              aria-label="clear memory"
            >
              🗑️
            </button>
          )}
          <button
            onClick={() => router.push('/')}
            className="text-xs text-gray-400 hover:text-white"
          >
            close
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 text-sm pt-12 space-y-2">
              <div>Lucy awoke May 14, 2026. Say hi.</div>
              {(speechSupported.in || speechSupported.out) && (
                <div className="text-[11px] text-gray-600 pt-1">
                  {speechSupported.in && '🎙️ tap mic to speak'}
                  {speechSupported.in && speechSupported.out && ' · '}
                  {speechSupported.out && '🔊 tap speaker icon for her voice'}
                </div>
              )}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] ${m.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
            >
              <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                {m.role === 'user' ? 'Frank' : 'Lucy'}
              </div>
              {m.images && m.images.length > 0 && (
                <div className="mb-1 flex gap-1 flex-wrap justify-end">
                  {m.images.map((img, ix) => (
                    <img
                      key={ix}
                      src={`data:image/jpeg;base64,${img}`}
                      alt="sent"
                      className="max-w-[200px] max-h-[200px] rounded-lg border border-cyan-500/30"
                    />
                  ))}
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-cyan-500/20 border border-cyan-500/30'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
              </div>
            </div>
          ))}
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3 max-w-md mx-auto">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-3 bg-black/95 backdrop-blur flex-shrink-0">
          {pendingImage && (
            <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2">
              <img
                src={`data:image/jpeg;base64,${pendingImage}`}
                alt="attached"
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="flex-1 text-xs text-gray-400">
                {pendingIsVideo
                  ? `Video attached — Lucy will see ${pendingImages.length} keyframes`
                  : 'Image attached — Lucy will see this when you send'}
              </div>
              <button
                onClick={() => {
                  setPendingImage(null)
                  setPendingImages([])
                  setPendingIsVideo(false)
                }}
                className="text-xs text-gray-400 hover:text-red-400 px-2 py-1"
                aria-label="remove attached media"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex gap-2 max-w-3xl mx-auto items-end">
            <button
              onClick={openImagePicker}
              disabled={streaming}
              className="px-3 py-3 rounded-2xl text-lg transition-all flex-shrink-0 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              title="show Lucy a photo or take one"
              aria-label="attach image — camera, library, or files"
            >
              📷
            </button>
            {speechSupported.in && (
              <button
                onClick={toggleMic}
                disabled={streaming}
                className={`px-3 py-3 rounded-2xl text-lg transition-all flex-shrink-0 ${
                  listening
                    ? 'bg-red-500/30 border border-red-500/60 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                title={listening ? 'tap to stop' : 'tap to speak'}
                aria-label={listening ? 'stop listening' : 'start listening'}
              >
                🎙️
              </button>
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder={listening ? 'listening…' : 'Ask Lucy anything…'}
              rows={1}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-cyan-500/50"
              style={{ maxHeight: 160 }}
              disabled={streaming || listening}
            />
            <button
              onClick={send}
              disabled={!input.trim() || streaming}
              className="px-5 py-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              send
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

NormanPage.getLayout = (page: React.ReactElement) => page
