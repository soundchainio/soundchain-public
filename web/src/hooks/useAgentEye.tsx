/**
 * Agent Eye — Passive Browser Bug Catcher
 * Baked directly into SoundChain source. Zero install, every visitor covered.
 *
 * Captures: JS errors, unhandled rejections, console.error, network errors
 * Records: click/input/navigate user action timeline
 * Reports: POST /api/agent/eye/report
 *
 * ZERO BOOLEANS — all state uses typed string enums with explicit === checks.
 */

import { createContext, useContext, useEffect, useRef, useCallback, useState, ReactNode } from 'react'

// ─── Enums (Zero Booleans) ───────────────────────────────────────────

export const EYE_MODE = {
  WATCHING: 'WATCHING',
  DORMANT: 'DORMANT',
  PAUSED: 'PAUSED',
} as const
export type EyeMode = typeof EYE_MODE[keyof typeof EYE_MODE]

export const BUG_SEVERITY = {
  CRITICAL: 'CRITICAL',
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const
export type BugSeverity = typeof BUG_SEVERITY[keyof typeof BUG_SEVERITY]

export const TRIGGER_KIND = {
  JS_ERROR: 'JS_ERROR',
  UNHANDLED_REJECTION: 'UNHANDLED_REJECTION',
  CONSOLE_ERROR: 'CONSOLE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const
export type TriggerKind = typeof TRIGGER_KIND[keyof typeof TRIGGER_KIND]

export const ACTION_KIND = {
  CLICK: 'CLICK',
  INPUT: 'INPUT',
  SCROLL: 'SCROLL',
  NAVIGATE: 'NAVIGATE',
} as const
export type ActionKind = typeof ACTION_KIND[keyof typeof ACTION_KIND]

// ─── Types ───────────────────────────────────────────────────────────

interface UserAction {
  kind: ActionKind
  timestamp: number
  selector: string
  tag: string
  text?: string
  url?: string
}

interface BugReport {
  trigger: TriggerKind
  severity: BugSeverity
  message: string
  stack?: string
  filename?: string
  line?: number
  col?: number
  url: string
  userAgent: string
  viewport: { w: number; h: number }
  actions: UserAction[]
  timestamp: number
}

interface AgentEyeContextValue {
  mode: EyeMode
  setMode: (mode: EyeMode) => void
  bugCount: number
}

// ─── Context ─────────────────────────────────────────────────────────

const AgentEyeContext = createContext<AgentEyeContextValue>({
  mode: EYE_MODE.WATCHING,
  setMode: () => {},
  bugCount: 0,
})

export const useAgentEye = () => useContext(AgentEyeContext)

// ─── Rate Limiter ────────────────────────────────────────────────────

const RATE_WINDOW_MS = 5000
const RATE_MAX_REPORTS = 10

// ─── Lightweight CSS Selector ────────────────────────────────────────

function getSelector(el: Element): string {
  if (!el) return ''
  const tag = el.tagName?.toLowerCase() || ''
  const id = el.id ? `#${el.id}` : ''
  const cls = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : ''
  return `${tag}${id}${cls}`
}

// ─── Circular-safe arg stringify ─────────────────────────────────────
// Used by the console.error wrapper. A naive JSON.stringify on a value with a
// circular reference (wagmi connectors, Apollo cache/error objects, DOM nodes,
// React fibers) throws "Converting circular structure to JSON". Because the
// wrapper runs INSIDE the caller's console.error call, that throw propagated out
// and crashed the caller (wagmi setConnectors via the EIP-6963 wallet handler,
// Apollo writeToStore) — flooding the console with uncaught TypeErrors. This
// helper can never throw: strings pass through, Errors use their message, and
// objects serialize with a circular-reference replacer, falling back to String().
function safeStringifyArg(a: unknown): string {
  if (typeof a === 'string') return a
  if (a instanceof Error) return a.message || a.name || 'Error'
  try {
    const seen = new WeakSet<object>()
    const out = JSON.stringify(a, (_k, v) => {
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v as object)) return '[Circular]'
        seen.add(v as object)
      }
      if (typeof v === 'bigint') return v.toString()
      if (typeof v === 'function') return '[Function]'
      return v
    })
    return out ?? String(a)
  } catch {
    try { return String(a) } catch { return '[Unserializable]' }
  }
}

// ─── Provider ────────────────────────────────────────────────────────

export function AgentEyeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<EyeMode>(EYE_MODE.WATCHING)
  const [bugCount, setBugCount] = useState(0)

  const actionsRef = useRef<UserAction[]>([])
  const reportTimestamps = useRef<number[]>([])
  const messageHashes = useRef<Set<string>>(new Set())
  const scrollThrottleRef = useRef(0)
  const originalConsoleError = useRef<typeof console.error | null>(null)
  const originalFetch = useRef<typeof fetch | null>(null)

  // ─── Action Recording ──────────────────────────────────────────

  const recordAction = useCallback((action: UserAction) => {
    actionsRef.current.push(action)
    if (actionsRef.current.length > 50) {
      actionsRef.current = actionsRef.current.slice(-50)
    }
  }, [])

  // ─── Rate Check ────────────────────────────────────────────────

  const canReport = useCallback((): string => {
    const now = Date.now()
    reportTimestamps.current = reportTimestamps.current.filter(
      (t) => now - t < RATE_WINDOW_MS
    )
    if (reportTimestamps.current.length >= RATE_MAX_REPORTS) {
      return 'RATE_LIMITED'
    }
    reportTimestamps.current.push(now)
    return 'ALLOWED'
  }, [])

  // ─── Dedup Check ───────────────────────────────────────────────

  const isDuplicate = useCallback((msg: string): string => {
    const hash = msg.slice(0, 100)
    if (messageHashes.current.has(hash)) return 'DUPLICATE'
    messageHashes.current.add(hash)
    // Clear hashes after 30 seconds
    setTimeout(() => messageHashes.current.delete(hash), 30000)
    return 'UNIQUE'
  }, [])

  // ─── Send Report ───────────────────────────────────────────────

  const sendReport = useCallback(
    (trigger: TriggerKind, severity: BugSeverity, message: string, extra?: Partial<BugReport>) => {
      if (mode !== EYE_MODE.WATCHING) return
      if (canReport() !== 'ALLOWED') return
      if (isDuplicate(message) !== 'UNIQUE') return

      const report: BugReport = {
        trigger,
        severity,
        message,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        viewport: typeof window !== 'undefined'
          ? { w: window.innerWidth, h: window.innerHeight }
          : { w: 0, h: 0 },
        actions: [...actionsRef.current],
        timestamp: Date.now(),
        ...extra,
      }

      setBugCount((c) => c + 1)

      // Fire-and-forget POST
      try {
        const fetchFn = originalFetch.current || fetch
        fetchFn('/api/agent/eye/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
          keepalive: true,
        }).catch(() => {
          // silent — Agent Eye never breaks the app
        })
      } catch {
        // silent
      }
    },
    [mode, canReport, isDuplicate]
  )

  // ─── Setup & Teardown ──────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (mode !== EYE_MODE.WATCHING) return

    // ── JS Errors ──
    const onError = (event: ErrorEvent) => {
      sendReport(TRIGGER_KIND.JS_ERROR, BUG_SEVERITY.CRITICAL, event.message, {
        filename: event.filename,
        line: event.lineno,
        col: event.colno,
        stack: event.error?.stack,
      })
    }
    window.addEventListener('error', onError)

    // ── Unhandled Rejections ──
    const onRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || event.reason?.toString() || 'Unhandled rejection'
      sendReport(TRIGGER_KIND.UNHANDLED_REJECTION, BUG_SEVERITY.CRITICAL, msg, {
        stack: event.reason?.stack,
      })
    }
    window.addEventListener('unhandledrejection', onRejection)

    // ── Console.error Wrapper ──
    // This override must NEVER throw: it runs inside every console.error call, so a
    // throw here (e.g. circular JSON.stringify) propagates out and crashes the caller.
    // safeStringifyArg + the try/catch guarantee a benign log can't break the app.
    originalConsoleError.current = console.error
    console.error = (...args: unknown[]) => {
      try {
        const msg = args.map(safeStringifyArg).join(' ')
        sendReport(TRIGGER_KIND.CONSOLE_ERROR, BUG_SEVERITY.WARNING, msg)
      } catch {
        // Agent Eye never breaks the app
      }
      originalConsoleError.current?.apply(console, args)
    }

    // ── Fetch Wrapper ──
    originalFetch.current = window.fetch
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const fetchFn = originalFetch.current!
      try {
        const response = await fetchFn(...args)
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.toString() || ''
        // Skip Agent Eye's own reports
        if (url.includes('/api/agent/eye/')) return response

        if (response.status >= 500) {
          sendReport(TRIGGER_KIND.NETWORK_ERROR, BUG_SEVERITY.CRITICAL, `${response.status} ${url}`)
        } else if (response.status >= 400) {
          sendReport(TRIGGER_KIND.NETWORK_ERROR, BUG_SEVERITY.ERROR, `${response.status} ${url}`)
        }
        return response
      } catch (err: any) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.toString() || ''
        if (!url.includes('/api/agent/eye/')) {
          sendReport(TRIGGER_KIND.NETWORK_ERROR, BUG_SEVERITY.CRITICAL, `Network failure: ${url} — ${err.message}`)
        }
        throw err
      }
    }

    // ── Click Tracking ──
    const onClick = (e: MouseEvent) => {
      const el = e.target as Element
      if (!el) return
      recordAction({
        kind: ACTION_KIND.CLICK,
        timestamp: Date.now(),
        selector: getSelector(el),
        tag: el.tagName?.toLowerCase() || '',
        text: (el as HTMLElement).innerText?.slice(0, 50),
      })
    }
    document.addEventListener('click', onClick, { capture: true, passive: true })

    // ── Input Tracking (field name only, NEVER values) ──
    const onInput = (e: Event) => {
      const el = e.target as HTMLInputElement
      if (!el) return
      recordAction({
        kind: ACTION_KIND.INPUT,
        timestamp: Date.now(),
        selector: getSelector(el),
        tag: el.tagName?.toLowerCase() || '',
        text: el.name || el.placeholder || el.type || '',
      })
    }
    document.addEventListener('input', onInput, { capture: true, passive: true })

    // ── Scroll Tracking (throttled) ──
    const onScroll = () => {
      const now = Date.now()
      if (now - scrollThrottleRef.current < 500) return
      scrollThrottleRef.current = now
      recordAction({
        kind: ACTION_KIND.SCROLL,
        timestamp: now,
        selector: 'window',
        tag: 'scroll',
        text: `y:${window.scrollY}`,
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    // ── Navigation Tracking ──
    const onPopState = () => {
      recordAction({
        kind: ACTION_KIND.NAVIGATE,
        timestamp: Date.now(),
        selector: 'window',
        tag: 'popstate',
        url: window.location.href,
      })
    }
    window.addEventListener('popstate', onPopState)

    // ── Cleanup ──
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      document.removeEventListener('click', onClick, { capture: true } as EventListenerOptions)
      document.removeEventListener('input', onInput, { capture: true } as EventListenerOptions)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('popstate', onPopState)

      if (originalConsoleError.current) {
        console.error = originalConsoleError.current
        originalConsoleError.current = null
      }
      if (originalFetch.current) {
        window.fetch = originalFetch.current
        originalFetch.current = null
      }
    }
  }, [mode, sendReport, recordAction])

  return (
    <AgentEyeContext.Provider value={{ mode, setMode, bugCount }}>
      {children}
    </AgentEyeContext.Provider>
  )
}
