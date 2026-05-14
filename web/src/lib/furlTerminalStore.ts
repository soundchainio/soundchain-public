// Singleton store for the FURL terminal iframe. Lives at module scope so the
// iframe's connection state survives any React tree remount — including
// Next.js client-side route changes that destroy AgentStatusTicker.
//
// Why this exists: the previous design attached the iframe to a DOM ref inside
// AgentStatusTicker. Navigating to a page that uses a different navbar variant
// (or no navbar) unmounted the component → ref-attached iframe destroyed →
// ttyd WebSocket dropped mid-Claude-session. FurlTerminalHost (mounted once in
// _app.tsx) owns the iframe on document.body and reads from this store.

import { useSyncExternalStore } from 'react'

export type FurlTerminalMode = 'embedded' | 'mini' | 'fullscreen'

export interface TargetRect {
  x: number
  y: number
  w: number
  h: number
}

export interface FurlTerminalState {
  isConnected: boolean
  tunnelUrl: string | null
  mode: FurlTerminalMode
  targetRect: TargetRect | null
}

const listeners = new Set<() => void>()
let state: FurlTerminalState = {
  isConnected: false,
  tunnelUrl: null,
  mode: 'mini',
  targetRect: null,
}

// Iframe element handle — registered by FurlTerminalHost so other components
// (AgentStatusTicker's chat input) can forward keystrokes without owning the
// iframe themselves. Not part of reactive state — purely an imperative escape.
let iframeEl: HTMLIFrameElement | null = null

function emit() {
  listeners.forEach(l => l())
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

function getSnapshot() {
  return state
}

// Server snapshot must match initial client state to avoid hydration mismatch.
const initialServerSnapshot: FurlTerminalState = {
  isConnected: false,
  tunnelUrl: null,
  mode: 'mini',
  targetRect: null,
}

export function useFurlTerminal(): FurlTerminalState {
  return useSyncExternalStore(subscribe, getSnapshot, () => initialServerSnapshot)
}

export const furlTerminal = {
  getState(): FurlTerminalState {
    return state
  },
  connect(tunnelUrl: string) {
    state = { ...state, isConnected: true, tunnelUrl }
    emit()
  },
  disconnect() {
    state = { ...state, isConnected: false, tunnelUrl: null, targetRect: null }
    emit()
  },
  setMode(mode: FurlTerminalMode) {
    if (state.mode === mode) return
    state = { ...state, mode }
    emit()
  },
  setTargetRect(targetRect: TargetRect | null) {
    const prev = state.targetRect
    if (
      prev && targetRect &&
      prev.x === targetRect.x && prev.y === targetRect.y &&
      prev.w === targetRect.w && prev.h === targetRect.h
    ) return
    if (!prev && !targetRect) return
    state = { ...state, targetRect }
    emit()
  },
  registerIframe(iframe: HTMLIFrameElement | null) {
    iframeEl = iframe
  },
  postMessage(payload: { type: string; [k: string]: unknown }): boolean {
    if (!iframeEl?.contentWindow) return false
    try {
      iframeEl.contentWindow.postMessage(payload, '*')
      return true
    } catch {
      return false
    }
  },
  sendInput(text: string): boolean {
    if (!iframeEl?.contentWindow) return false
    try {
      iframeEl.contentWindow.postMessage({ type: 'furl-input', text }, '*')
      iframeEl.contentWindow.postMessage({ type: 'furl-focus' }, '*')
      return true
    } catch {
      return false
    }
  },
}
