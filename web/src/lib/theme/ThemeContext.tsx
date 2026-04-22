/**
 * ThemeContext — global light/dark/auto theme toggle.
 *
 * - Persists to localStorage under `soundchain_theme`
 * - `auto` resolves via `prefers-color-scheme` and live-updates on OS change
 * - Writes `data-theme` attribute on <html>; a pre-hydration script in
 *   `_document.tsx` sets the same attribute before first paint to avoid flash.
 * - Shape/default mirror the inline script in _document.tsx — keep in sync.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type ThemeChoice = 'dark' | 'light' | 'auto'
export type ResolvedTheme = 'dark' | 'light'

const STORAGE_KEY = 'soundchain_theme'
const DEFAULT_CHOICE: ThemeChoice = 'dark'

type ThemeContextValue = {
  choice: ThemeChoice
  resolved: ResolvedTheme
  setTheme: (next: ThemeChoice) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  choice: DEFAULT_CHOICE,
  resolved: 'dark',
  setTheme: () => {},
})

function resolveAuto(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function readStored(): ThemeChoice {
  if (typeof window === 'undefined') return DEFAULT_CHOICE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'dark' || raw === 'light' || raw === 'auto') return raw
  } catch {}
  return DEFAULT_CHOICE
}

function applyAttribute(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', resolved)
  document.documentElement.style.colorScheme = resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>(DEFAULT_CHOICE)
  const [resolved, setResolved] = useState<ResolvedTheme>('dark')

  // Hydrate from localStorage on mount (_document.tsx already painted the right bg)
  useEffect(() => {
    const stored = readStored()
    setChoice(stored)
    const next: ResolvedTheme = stored === 'auto' ? resolveAuto() : stored
    setResolved(next)
    applyAttribute(next)
  }, [])

  // Live-update when OS theme changes and user is on `auto`
  useEffect(() => {
    if (choice !== 'auto' || typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = () => {
      const next: ResolvedTheme = mq.matches ? 'light' : 'dark'
      setResolved(next)
      applyAttribute(next)
    }
    if (mq.addEventListener) mq.addEventListener('change', handler)
    else mq.addListener(handler)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler)
      else mq.removeListener(handler)
    }
  }, [choice])

  const setTheme = useCallback((next: ThemeChoice) => {
    setChoice(next)
    try { window.localStorage.setItem(STORAGE_KEY, next) } catch {}
    const r: ResolvedTheme = next === 'auto' ? resolveAuto() : next
    setResolved(r)
    applyAttribute(r)
  }, [])

  const value = useMemo(() => ({ choice, resolved, setTheme }), [choice, resolved, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
