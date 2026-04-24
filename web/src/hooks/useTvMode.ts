import { useEffect, useState } from 'react'
import {
  DisplayMode,
  detectDisplayMode,
  isLargeLandscape,
  TV_BODY_ATTR,
  DISPLAY_MODE_ATTR,
  LARGE_LANDSCAPE_VIEWPORT,
} from 'lib/tvMode'

const STANDARD_VIEWPORT =
  'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'

const applyViewport = (content: string) => {
  if (typeof document === 'undefined') return
  let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'viewport')
    document.head.appendChild(meta)
  }
  if (meta.getAttribute('content') !== content) {
    meta.setAttribute('content', content)
  }
}

/**
 * useDisplayMode — runs detection once on mount + on every resize, writes:
 *   <html data-display-mode="tv|projector|vr|kiosk|standard">
 *   <html data-tv="true">                  ← legacy; fires on tv OR projector
 * and rewrites the viewport meta to width=1920 on tv/projector so Tailwind
 * breakpoints lay the page out as desktop, not scaled-up mobile.
 *
 * Safe on SSR (returns 'standard', does nothing until mount).
 */
export const useDisplayMode = (): DisplayMode => {
  const [mode, setMode] = useState<DisplayMode>('standard')

  useEffect(() => {
    if (typeof document === 'undefined') return

    const apply = () => {
      const detected = detectDisplayMode()
      setMode(detected)
      const root = document.documentElement

      root.setAttribute(`data-${DISPLAY_MODE_ATTR}`, detected)

      if (isLargeLandscape(detected)) {
        root.setAttribute(`data-${TV_BODY_ATTR}`, 'true')
        applyViewport(LARGE_LANDSCAPE_VIEWPORT)
      } else {
        root.removeAttribute(`data-${TV_BODY_ATTR}`)
        applyViewport(STANDARD_VIEWPORT)
      }
    }

    apply()
    window.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('resize', apply)
    }
  }, [])

  return mode
}

/**
 * Legacy boolean hook. True for tv OR projector (both get the TV CSS block and
 * forced-desktop viewport). Kept so existing callers don't have to change.
 */
export const useTvMode = (): boolean => {
  const mode = useDisplayMode()
  return isLargeLandscape(mode)
}

/**
 * Mountable component form — drop into _app.tsx provider tree like CapacitorInit.
 * Renders nothing, just applies the side effect.
 */
export const DisplayModeInit = () => {
  useDisplayMode()
  return null
}

/** Legacy alias — same component, back-compat name for existing _app.tsx imports. */
export const TvModeInit = DisplayModeInit

export default useTvMode
