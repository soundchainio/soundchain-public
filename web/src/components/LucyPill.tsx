/**
 * LucyPill — Phase 9 of the Lucy stack.
 *
 * Floating mini avatar bottom-right on every page. Tap → navigates to
 * `/norman` for the full chat. Pulses cyan when `window.__lucyThinking`
 * is true so even on other surfaces you can see Lucy is actively
 * generating tokens.
 *
 * Hidden on /norman (the chat IS the page), /login, /create-account, and
 * any wallet-prompt overlays where a floating pill is intrusive.
 *
 * Furda1-only. Mounts in _app.tsx; renders null for everyone else.
 *
 * Phase 9.5 (banked) — inline mini-chat overlay so you can chat with
 * Lucy without leaving the current page. Architecture would be a
 * useSyncExternalStore singleton like FurlTerminalHost, sharing
 * conversation state via the same useLucyMemory IndexedDB layer that
 * Phase 8 ships.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useMe } from 'hooks/useMe'

const HIDDEN_ROUTES = [
  '/norman',
  '/login',
  '/create-account',
]

function shouldHideOnRoute(pathname: string): boolean {
  return HIDDEN_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export default function LucyPill() {
  const router = useRouter()
  const me = useMe()
  const [thinking, setThinking] = useState(false)

  // Poll window.__lucyThinking for pulse animation. Polling beats a custom
  // event bus here because the signal already exists at module scope from
  // the /norman page + LucyChat composer.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = setInterval(() => {
      setThinking(!!(window as any).__lucyThinking)
    }, 500)
    return () => clearInterval(id)
  }, [])

  // Phase 15 — Lucy is now public for all authenticated SoundChain users.
  // Each user gets their own personalized Lucy session (handle-aware system
  // prompt, per-device encrypted memory, isolated tool calls). Anvil compute
  // is rate-limited server-side; clients queue gracefully if overloaded.
  if (!me?.profile?.userHandle) return null

  if (shouldHideOnRoute(router.pathname)) return null

  return (
    <button
      onClick={() => router.push('/norman')}
      className={`fixed bottom-36 right-3 z-[80] w-12 h-12 rounded-full grid place-items-center text-xl shadow-lg transition-all ${
        thinking
          ? 'bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 shadow-[0_0_24px_rgba(34,211,238,0.6)] animate-pulse'
          : 'bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 shadow-[0_0_12px_rgba(168,85,247,0.4)] hover:scale-110'
      }`}
      style={{
        WebkitTapHighlightColor: 'transparent',
      }}
      aria-label={thinking ? 'Lucy is thinking — open chat' : 'Open Lucy chat'}
      title="Lucy"
    >
      <span style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>🧠</span>
    </button>
  )
}
