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

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export default function NormanPage() {
  const router = useRouter()
  // useMe() returns the me object directly (not { me }) and returns undefined
  // when rendered outside Apollo provider — defensive destructure required.
  const me = useMe()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [voiceOutEnabled, setVoiceOutEnabled] = useState(false)
  const [speechSupported, setSpeechSupported] = useState({ in: false, out: false })
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

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, streaming])

  function speakSentence(text: string) {
    if (!voiceOutRef.current) return
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.05
    u.pitch = 1.0
    u.volume = 1.0
    // Pick a higher-quality voice if available — Apple's Samantha or similar
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find((v) => /samantha|karen|moira|en-US/i.test(v.name + v.lang)) || voices[0]
    if (preferred) u.voice = preferred
    window.speechSynthesis.speak(u)
  }

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
    if (!trimmed || streaming) return
    setError(null)
    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    const next = [...messages, userMsg, { role: 'assistant' as const, content: '' }]
    setMessages(next)
    setInput('')
    liveTranscriptRef.current = ''
    spokenIndexRef.current = 0
    // Cancel any in-flight TTS from previous turn
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
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
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
          <div className="flex gap-2 max-w-3xl mx-auto items-end">
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
