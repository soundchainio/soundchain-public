/**
 * /norman — Lucy chat interface.
 *
 * Furda1-only beta. Talks to anvil's Ollama through /api/norman/chat with
 * streaming JSON-line responses. Sets window.__lucyThinking while tokens are
 * flowing so the Neural FFT visualizer in AgentStatusTicker can pulse for
 * real instead of decoratively.
 *
 * Conversation history is held in client memory only — no persistence yet
 * (will move to MongoDB once the conversation pattern stabilizes).
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
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // Gate page — only furdA1 sees Lucy
  useEffect(() => {
    if (!me) return
    if (me.profile?.userHandle !== 'furdA1') {
      router.replace('/')
    }
  }, [me, router])

  useEffect(() => {
    // Auto-scroll on new message
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, streaming])

  async function send() {
    const trimmed = input.trim()
    if (!trimmed || streaming) return
    setError(null)
    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    const next = [...messages, userMsg, { role: 'assistant' as const, content: '' }]
    setMessages(next)
    setInput('')
    setStreaming(true)
    // Pulse signal for the Neural visualizer
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
            }
          } catch {
            // ignore malformed lines (partial chunks across reads)
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Lucy is unreachable.')
      // Remove the empty assistant placeholder
      setMessages((prev) => (prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev))
    } finally {
      setStreaming(false)
      if (typeof window !== 'undefined') (window as any).__lucyThinking = false
      inputRef.current?.focus()
    }
  }

  if (me && me.profile?.userHandle !== 'furdA1') {
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
          <div className="flex-1">
            <div className="text-sm font-semibold">Lucy</div>
            <div className="text-[11px] text-gray-400 font-mono">
              {streaming ? 'thinking…' : 'running on anvil · M5000 · llama3.1'}
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-xs text-gray-400 hover:text-white"
          >
            close
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 text-sm pt-12">
              Lucy awoke May 14, 2026. Say hi.
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
          <div className="flex gap-2 max-w-3xl mx-auto">
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
              placeholder="Ask Lucy anything…"
              rows={1}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-cyan-500/50"
              style={{ maxHeight: 160 }}
              disabled={streaming}
            />
            <button
              onClick={send}
              disabled={!input.trim() || streaming}
              className="px-5 py-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
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
