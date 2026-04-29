import { useEffect, useState } from 'react'
import {
  DisplayMode,
  detectDisplayMode,
  isLargeLandscape,
  TV_BODY_ATTR,
  DISPLAY_MODE_ATTR,
  DISPLAY_MODE_OVERRIDE_EVENT,
  DISPLAY_MODE_OVERRIDE_KEY,
  getOverride,
  resolveViewport,
} from 'lib/tvMode'

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
      const override = getOverride()
      const detected = detectDisplayMode() // already honors override
      setMode(detected)
      const root = document.documentElement

      root.setAttribute(`data-${DISPLAY_MODE_ATTR}`, detected)

      if (isLargeLandscape(detected)) root.setAttribute(`data-${TV_BODY_ATTR}`, 'true')
      else root.removeAttribute(`data-${TV_BODY_ATTR}`)

      // Mark when an explicit override is active so the reset pill + CSS branches can target it.
      if (override && override !== 'auto') root.setAttribute('data-display-override', override)
      else root.removeAttribute('data-display-override')

      applyViewport(resolveViewport(detected, override))
    }

    apply()
    window.addEventListener('resize', apply)
    window.addEventListener(DISPLAY_MODE_OVERRIDE_EVENT, apply as EventListener)
    // Cross-tab sync: another tab flipping the override pushes a `storage` event here.
    const onStorage = (e: StorageEvent) => { if (e.key === DISPLAY_MODE_OVERRIDE_KEY) apply() }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('resize', apply)
      window.removeEventListener(DISPLAY_MODE_OVERRIDE_EVENT, apply as EventListener)
      window.removeEventListener('storage', onStorage)
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
