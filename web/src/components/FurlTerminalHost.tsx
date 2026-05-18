import { useEffect, useRef } from 'react'
import { useFurlTerminal, furlTerminal } from 'lib/furlTerminalStore'

// Singleton iframe owner. Mounted once in _app.tsx so the iframe lives on
// document.body and survives every Next.js route change. AgentStatusTicker
// publishes target rect + mode into the store; this component repositions the
// iframe accordingly. When AgentStatusTicker unmounts, the store falls back to
// 'mini' mode (floating PiP) so the terminal stays visible across the app.

const MINI_WIDTH = 360
const MINI_HEIGHT = 240
const FULLSCREEN_Z = 100
const EMBEDDED_Z = 60
const MINI_Z = 90

function positionIframe(iframe: HTMLIFrameElement, mode: string, targetRect: { x: number; y: number; w: number; h: number } | null) {
  iframe.style.position = 'fixed'
  iframe.style.border = 'none'
  iframe.style.background = '#0a0a0a'
  iframe.style.display = 'block'
  iframe.style.overflow = 'hidden'

  if (mode === 'fullscreen') {
    iframe.style.left = '0'
    iframe.style.top = '0'
    iframe.style.right = 'auto'
    iframe.style.bottom = 'auto'
    iframe.style.width = '100vw'
    // 100vh on iOS Safari extends behind the collapsing URL bar + home indicator,
    // cropping the xterm input row. 100dvh follows the actually-visible viewport.
    iframe.style.height = '100dvh'
    iframe.style.borderRadius = '0'
    iframe.style.boxShadow = 'none'
    iframe.style.zIndex = String(FULLSCREEN_Z)
    return
  }

  if (mode === 'embedded' && targetRect && targetRect.w > 0 && targetRect.h > 0) {
    iframe.style.left = targetRect.x + 'px'
    iframe.style.top = targetRect.y + 'px'
    iframe.style.right = 'auto'
    iframe.style.bottom = 'auto'
    iframe.style.width = targetRect.w + 'px'
    iframe.style.height = targetRect.h + 'px'
    iframe.style.borderRadius = '0'
    iframe.style.boxShadow = 'none'
    iframe.style.zIndex = String(EMBEDDED_Z)
    return
  }

  // mini — floating PiP bottom-right. Survives route changes.
  const w = Math.min(MINI_WIDTH, window.innerWidth - 24)
  iframe.style.left = 'auto'
  iframe.style.top = 'auto'
  iframe.style.right = '12px'
  iframe.style.bottom = '80px'
  iframe.style.width = w + 'px'
  iframe.style.height = MINI_HEIGHT + 'px'
  iframe.style.borderRadius = '12px'
  iframe.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,211,238,0.3)'
  iframe.style.zIndex = String(MINI_Z)
}

export function FurlTerminalHost() {
  const { isConnected, tunnelUrl, mode, targetRect } = useFurlTerminal()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  // Iframe lifecycle: create on connect, destroy on disconnect. Identity stays
  // stable as long as connection persists, so route changes don't touch it.
  useEffect(() => {
    if (!isConnected || !tunnelUrl) {
      if (iframeRef.current) {
        try { iframeRef.current.contentWindow?.postMessage({ type: 'furl-disconnect' }, '*') } catch {}
        try { iframeRef.current.remove() } catch {}
        iframeRef.current = null
        furlTerminal.registerIframe(null)
      }
      return
    }

    if (iframeRef.current) return

    const cleanUrl = tunnelUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')
    const iframe = document.createElement('iframe')
    iframe.src = `/furl-terminal.html?tunnel=${encodeURIComponent(cleanUrl)}`
    iframe.title = 'FURL Terminal'
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write')
    positionIframe(iframe, furlTerminal.getState().mode, furlTerminal.getState().targetRect)
    document.body.appendChild(iframe)
    iframeRef.current = iframe
    furlTerminal.registerIframe(iframe)

    // Click anywhere on the iframe → tell terminal to focus its input.
    // The listener is auto-removed when iframe.remove() is called on disconnect.
    const onClick = () => {
      try { iframe.contentWindow?.postMessage({ type: 'furl-focus' }, '*') } catch {}
    }
    iframe.addEventListener('click', onClick)
  }, [isConnected, tunnelUrl])

  // Unregister iframe handle when this component unmounts (only happens on
  // full app teardown — not on any normal route change).
  useEffect(() => {
    return () => {
      furlTerminal.registerIframe(null)
    }
  }, [])

  // Reposition + refit on mode/rect change.
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    positionIframe(iframe, mode, targetRect)
    // xterm needs a fit signal when its container resizes.
    setTimeout(() => {
      try { iframe.contentWindow?.postMessage({ type: 'furl-fit' }, '*') } catch {}
    }, 50)
  }, [mode, targetRect])

  // Re-fit + reposition on window resize (mini mode hugs the viewport edge).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => {
      const iframe = iframeRef.current
      if (!iframe) return
      const s = furlTerminal.getState()
      positionIframe(iframe, s.mode, s.targetRect)
      try { iframe.contentWindow?.postMessage({ type: 'furl-fit' }, '*') } catch {}
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return null
}
