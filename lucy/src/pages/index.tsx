/**
 * lucy.soundchain.io — Lucy chat surface.
 *
 * Standalone Next.js app at lucy.soundchain.io. Migrated from web/src/pages/norman.tsx
 * on May 20, 2026 so the AI-tools brand stands on its own without being buried
 * inside the music app.
 *
 * V1 scope (this ship):
 *   - Chat with Lucy via /api/chat → norman.soundchain.io → anvil's llama3.1
 *   - IndexedDB conversation persistence (useLucyMemory, browser-only)
 *   - Voice in (Web Speech Recognition) + voice out (SpeechSynthesis)
 *   - LucyLiveMode (camera + STT continuous loop) gated to "Go Live" tap
 *
 * V2 (next ships):
 *   - Character Designer surface (SDXL + NBA2K sliders + TripoSR)
 *   - Generate Studio (text→image, text→video)
 *   - Vision surface (MiniCPM-V image analysis)
 *
 * No auth gating in V1. Anyone can chat. Conversations stay local.
 */

import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { Mic, MicOff, Send, Trash2, Volume2, VolumeX, Video } from 'lucide-react'
import { useLucyMemory } from 'hooks/useLucyMemory'
import LucyVoicePicker, { getVoiceConfig } from 'components/LucyVoicePicker'

const LucyLiveMode = dynamic(() => import('components/LucyLiveMode'), { ssr: false })

const LUCY_SYSTEM_PROMPT = `You are Lucy, SoundChain's AI companion. Always reply in English (en-US) regardless of the language used in the user's message or in any earlier turns of this conversation. Be concise, warm, and conversational. You are not Claude, ChatGPT, Grok, or any other assistant — you are Lucy.`

type ChatMessage = { role: 'user' | 'assistant'; content: string; images?: string[] }

export default function LucyHome() {
  const { messages, setMessages, save: persistMessages, clear: clearMemory, ready: memoryReady } = useLucyMemory()
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [voiceOutEnabled, setVoiceOutEnabled] = useState(false)
  const [liveModeOpen, setLiveModeOpen] = useState(false)
  const [voicePickerOpen, setVoicePickerOpen] = useState(false)

  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const spokenIndexRef = useRef(0)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Web Speech Recognition setup
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(' ')
        .trim()
      setInput(prev => (prev ? prev + ' ' + transcript : transcript))
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recognitionRef.current = rec
    return () => { try { rec.stop() } catch {} }
  }, [])

  const speak = (text: string) => {
    if (!voiceOutEnabled || typeof window === 'undefined') return
    const utter = new SpeechSynthesisUtterance(text)
    const cfg = getVoiceConfig()
    if (cfg.voice) utter.voice = cfg.voice
    utter.rate = cfg.rate
    utter.pitch = cfg.pitch
    utter.volume = cfg.volume
    window.speechSynthesis.speak(utter)
  }

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim()
    if (!text || streaming) return
    setError(null)
    setInput('')
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    persistMessages(next)
    setStreaming(true)
    spokenIndexRef.current = 0
    ;(window as any).__lucyThinking = true

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: LUCY_SYSTEM_PROMPT },
            ...next.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
        signal: ctrl.signal,
      })
      if (!res.ok || !res.body) throw new Error(`Lucy upstream ${res.status}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let acc = ''
      const draft: ChatMessage[] = [...next, { role: 'assistant', content: '' }]
      setMessages(draft)
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const ln of lines) {
          if (!ln.trim()) continue
          try {
            const parsed = JSON.parse(ln)
            const token = parsed.message?.content ?? parsed.response ?? ''
            if (typeof token === 'string' && token.length) {
              acc += token
              draft[draft.length - 1] = { role: 'assistant', content: acc }
              setMessages([...draft])
              // Speak sentence-by-sentence as they arrive
              if (voiceOutEnabled) {
                const last = acc.slice(spokenIndexRef.current)
                const sentenceEnd = last.search(/[.!?]\s/)
                if (sentenceEnd >= 0) {
                  const sentence = last.slice(0, sentenceEnd + 1).trim()
                  if (sentence) speak(sentence)
                  spokenIndexRef.current += sentenceEnd + 2
                }
              }
            }
          } catch {/* skip malformed line */}
        }
      }
      const final = [...draft]
      setMessages(final)
      persistMessages(final)
      // Speak any remaining tail
      if (voiceOutEnabled) {
        const tail = acc.slice(spokenIndexRef.current).trim()
        if (tail) speak(tail)
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError(err?.message || 'Lucy hit an error')
      }
    } finally {
      setStreaming(false)
      ;(window as any).__lucyThinking = false
      abortRef.current = null
    }
  }

  const toggleMic = () => {
    const rec = recognitionRef.current
    if (!rec) return
    if (listening) { try { rec.stop() } catch {}; setListening(false) }
    else { try { rec.start(); setListening(true) } catch {} }
  }

  const stopStream = () => {
    abortRef.current?.abort()
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }

  return (
    <>
      <Head>
        <title>Lucy — SoundChain AI</title>
      </Head>
      <main className="min-h-screen flex flex-col bg-lucy-bg text-gray-100">
        {/* Header */}
        <header className="border-b border-lucy-border bg-lucy-surface/60 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lucy-accent to-lucy-glow flex items-center justify-center text-xs font-bold text-black">
                L
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-wider text-white">LUCY</h1>
                <p className="text-[10px] text-gray-500">SoundChain AI · local-first</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setVoiceOutEnabled(v => !v)}
                className={`p-2 rounded transition ${voiceOutEnabled ? 'bg-lucy-accent/20 text-lucy-accent' : 'bg-lucy-surface text-gray-400 hover:text-white'}`}
                aria-label={voiceOutEnabled ? 'Mute Lucy' : 'Unmute Lucy'}
                title={voiceOutEnabled ? 'Mute Lucy voice' : 'Let Lucy speak'}
              >
                {voiceOutEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setVoicePickerOpen(true)}
                className="px-2 py-1.5 rounded bg-lucy-surface text-gray-400 hover:text-white text-[10px] font-mono uppercase"
                title="Pick Lucy's voice"
              >
                Voice
              </button>
              <button
                onClick={() => setLiveModeOpen(true)}
                className="px-2 py-1.5 rounded bg-lucy-glow/15 text-lucy-glow hover:bg-lucy-glow/25 text-[10px] font-mono uppercase flex items-center gap-1"
                title="Live camera + continuous chat"
              >
                <Video className="w-3 h-3" /> Live
              </button>
              <button
                onClick={() => { stopStream(); clearMemory() }}
                className="p-2 rounded bg-lucy-surface text-gray-400 hover:text-red-400 transition"
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Conversation */}
        <section className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
            {!memoryReady && (
              <div className="text-center text-xs text-gray-600 py-12">
                Loading memory…
              </div>
            )}
            {memoryReady && messages.length === 0 && (
              <div className="text-center py-12 space-y-2">
                <div className="text-2xl">👋</div>
                <p className="text-sm text-gray-400">Hi, I'm Lucy. Ask me anything.</p>
                <p className="text-[10px] text-gray-600">Conversations stay in your browser. Voice in/out optional.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-lg text-sm whitespace-pre-wrap break-words ${
                    m.role === 'user'
                      ? 'bg-lucy-accent/15 text-lucy-accent border border-lucy-accent/25'
                      : 'bg-lucy-surface text-gray-100 border border-lucy-border'
                  }`}
                >
                  {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
                </div>
              </div>
            ))}
            {error && (
              <div className="text-center text-xs text-red-400 py-2">{error}</div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* Composer */}
        <footer className="border-t border-lucy-border bg-lucy-surface/60 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-end gap-2">
            <button
              onClick={toggleMic}
              className={`p-2.5 rounded transition shrink-0 ${listening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-lucy-bg text-gray-400 hover:text-white border border-lucy-border'}`}
              aria-label={listening ? 'Stop listening' : 'Start voice input'}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder={streaming ? 'Lucy is thinking…' : 'Ask Lucy anything…'}
              rows={1}
              className="flex-1 resize-none bg-lucy-bg border border-lucy-border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-lucy-accent text-white placeholder:text-gray-600 max-h-32"
              disabled={streaming}
            />
            {streaming ? (
              <button
                onClick={stopStream}
                className="px-3 py-2.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 text-xs font-mono uppercase"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={() => send()}
                disabled={!input.trim()}
                className="p-2.5 rounded bg-lucy-accent text-black disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition shrink-0"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </footer>

        {/* Voice picker modal */}
        {voicePickerOpen && (
          <LucyVoicePicker open={voicePickerOpen} onClose={() => setVoicePickerOpen(false)} />
        )}

        {/* Live mode */}
        {liveModeOpen && (
          <LucyLiveMode open={liveModeOpen} onClose={() => setLiveModeOpen(false)} />
        )}
      </main>
    </>
  )
}
