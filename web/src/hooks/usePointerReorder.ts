/**
 * usePointerReorder — tiny drag-to-reorder for a list of `{ id }` items, built on
 * Pointer Events so ONE code path covers desktop (mouse hold + drag) and mobile
 * (tap-hold + move). No external DnD/motion dependency.
 *
 * How it works:
 *  - getItemProps(id) is spread onto each item's wrapper. It adds `data-reorder-id`,
 *    an `onPointerDown`, and `touch-action:none` so the browser doesn't steal the
 *    gesture for scrolling while reordering.
 *  - Mouse/pen: drag starts after a small move threshold (so a plain click still works).
 *  - Touch: drag starts after a long-press (so vertical scrolling still works); if the
 *    finger moves before the press fires, it's treated as a scroll and the gesture aborts.
 *  - Hit-testing uses document.elementFromPoint — the floating "ghost" the caller renders
 *    must be `pointer-events:none` so we see the item underneath.
 *  - onReorder fires live (every time the dragged item crosses another) for instant visual
 *    feedback; onCommit fires once on drop (persist there).
 *
 * Listeners are only attached while `enabled` is true (edit mode), so there is zero
 * global cost when the user isn't actively reordering.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

type DragState = { id: string; x: number; y: number }

type Gesture = {
  id: string
  startX: number
  startY: number
  active: boolean
  working: string[]
  timer: ReturnType<typeof setTimeout> | null
  pointerType: string
}

export function usePointerReorder({
  enabled,
  order,
  onReorder,
  onCommit,
  longPressMs = 200,
}: {
  enabled: boolean
  order: string[]
  onReorder: (next: string[]) => void
  onCommit: (final: string[]) => void
  longPressMs?: number
}) {
  const [drag, setDrag] = useState<DragState | null>(null)

  // Refs so the window-level handlers always read the latest values.
  const orderRef = useRef(order)
  orderRef.current = order
  const cbRef = useRef({ onReorder, onCommit })
  cbRef.current = { onReorder, onCommit }

  const g = useRef<Gesture | null>(null)
  const startRef = useRef<(id: string, e: React.PointerEvent) => void>(() => {})

  useEffect(() => {
    if (!enabled) return

    const clearTimer = () => {
      if (g.current?.timer) {
        clearTimeout(g.current.timer)
        g.current.timer = null
      }
    }

    const beginActive = (x: number, y: number) => {
      if (!g.current) return
      g.current.active = true
      setDrag({ id: g.current.id, x, y })
    }

    const reorderToPoint = (x: number, y: number) => {
      const cur = g.current
      if (!cur) return
      const el = document.elementFromPoint(x, y) as HTMLElement | null
      const overId = el?.closest('[data-reorder-id]')?.getAttribute('data-reorder-id') || null
      if (!overId || overId === cur.id) return
      const from = cur.working.indexOf(cur.id)
      const to = cur.working.indexOf(overId)
      if (from < 0 || to < 0 || from === to) return
      const next = cur.working.slice()
      next.splice(from, 1)
      next.splice(to, 0, cur.id)
      cur.working = next
      cbRef.current.onReorder(next)
    }

    const end = (commit: boolean) => {
      const cur = g.current
      clearTimer()
      if (cur && cur.active && commit) cbRef.current.onCommit(cur.working)
      g.current = null
      setDrag(null)
    }

    const onMove = (e: PointerEvent) => {
      const cur = g.current
      if (!cur) return
      const dx = e.clientX - cur.startX
      const dy = e.clientY - cur.startY
      if (!cur.active) {
        if (cur.pointerType === 'touch') {
          // Moved before the long-press fired → user is scrolling, not reordering.
          if (Math.hypot(dx, dy) > 12) end(false)
        } else if (Math.hypot(dx, dy) > 5) {
          beginActive(e.clientX, e.clientY)
        }
        return
      }
      e.preventDefault() // stop scroll/text-select while actively dragging
      setDrag({ id: cur.id, x: e.clientX, y: e.clientY })
      reorderToPoint(e.clientX, e.clientY)
    }

    const onUp = () => end(true)
    const onCancel = () => end(false)

    startRef.current = (id, e) => {
      // Don't hijack the remove (×) button or any opt-out control.
      if ((e.target as HTMLElement)?.closest('[data-no-drag]')) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const sx = e.clientX
      const sy = e.clientY
      const pt = e.pointerType
      g.current = { id, startX: sx, startY: sy, active: false, working: orderRef.current.slice(), timer: null, pointerType: pt }
      if (pt === 'touch') g.current.timer = setTimeout(() => beginActive(sx, sy), longPressMs)
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      clearTimer()
      g.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [enabled, longPressMs])

  const getItemProps = useCallback(
    (id: string): Record<string, any> => {
      if (!enabled) return {}
      return {
        'data-reorder-id': id,
        onPointerDown: (e: React.PointerEvent) => startRef.current(id, e),
        style: { touchAction: 'none', cursor: drag?.id === id ? 'grabbing' : 'grab' },
      }
    },
    [enabled, drag],
  )

  return {
    dragId: drag?.id ?? null,
    dragPos: drag ? { x: drag.x, y: drag.y } : null,
    getItemProps,
  }
}
