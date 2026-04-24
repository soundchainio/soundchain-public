import { useEffect, useState } from 'react'
import { detectTvMode, TV_BODY_ATTR } from 'lib/tvMode'

/**
 * useTvMode — runs detection once on mount + on every viewport resize, writes
 * `data-tv="true"` to <html> when active. CSS branches on that attribute the
 * same way it does for `data-theme`.
 *
 * Safe on SSR (returns false, does nothing until mount).
 */
export const useTvMode = (): boolean => {
  const [isTv, setIsTv] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') return

    const apply = () => {
      const detected = detectTvMode()
      setIsTv(detected)
      const root = document.documentElement
      if (detected) {
        root.setAttribute(`data-${TV_BODY_ATTR}`, 'true')
      } else {
        root.removeAttribute(`data-${TV_BODY_ATTR}`)
      }
    }

    apply()
    // viewport change (e.g. remote-driven orientation swap, Chromecast mirror)
    window.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('resize', apply)
    }
  }, [])

  return isTv
}

/**
 * Mountable component form — drop into _app.tsx provider tree like CapacitorInit.
 * Renders nothing, just applies the side effect.
 */
export const TvModeInit = () => {
  useTvMode()
  return null
}

export default useTvMode
