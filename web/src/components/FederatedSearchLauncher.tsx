/**
 * FederatedSearchLauncher — mounts the SoundChain meta-search globally.
 *
 * - Floating 🔍 pill bottom-left (above the audio player) to click-open.
 * - Global `/` hotkey opens it from anywhere (ignored when typing in an input).
 * - Cmd+K / Ctrl+K also opens (familiar muscle memory).
 *
 * Kept tiny by design: state + launcher only; all UX lives in the modal.
 */
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { Search } from 'lucide-react'

const FederatedSearchModal = dynamic(() => import('./FederatedSearchModal'), { ssr: false })

// Routes where the global SoundChain search pill is hidden. Lucy's /norman
// page is the agent surface — she IS the search interface there, the
// cyan-magnifying-glass pill overlapping her reply bubbles was a months-long
// thorn (May 15 audit revealed this component was the actual culprit, not
// FURL as previously suspected).
const HIDDEN_ROUTES = ['/norman']

function shouldHideOnRoute(pathname: string): boolean {
  return HIDDEN_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export default function FederatedSearchLauncher() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return
      // Also disable global / shortcut on hidden routes — Lucy's textarea
      // captures '/' input as a literal character. The Cmd+K still works
      // for power users but doesn't render the pill.
      if (shouldHideOnRoute(router.pathname)) return
      const target = e.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, router.pathname])

  if (shouldHideOnRoute(router.pathname)) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open SoundChain search"
        title="Search  ·  /  or  ⌘K"
        className="fixed bottom-20 right-3 z-40 w-12 h-12 rounded-full bg-black/80 backdrop-blur-xl border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:shadow-[0_0_30px_rgba(6,182,212,0.55)] flex items-center justify-center transition"
      >
        <Search className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
      </button>
      <FederatedSearchModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
