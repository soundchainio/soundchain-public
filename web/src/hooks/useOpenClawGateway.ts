/**
 * useOpenClawGateway — WebSocket hook for real-time messaging & call signaling.
 *
 * Connects to the Pulse signaling relay at tunnel.soundchain.io for:
 * - call.signal — WebRTC call signaling (invite, answer, ICE, hangup)
 * - message.received — new DM from another user
 * - message.sent — confirmation of sent message
 * - notification — follow/like/comment/tip alerts
 * - typing — typing indicator from other user
 * - presence — online/offline status updates
 *
 * Falls back to GraphQL polling when relay is unreachable.
 */

import { useEffect, useRef, useCallback, useState } from 'react'

const PULSE_RELAY_URL = process.env.NEXT_PUBLIC_PULSE_RELAY_URL || 'https://tunnel.soundchain.io'

export interface GatewayMessage {
  type: 'message.received' | 'message.sent' | 'notification' | 'typing' | 'presence' | 'call.signal'
  payload: Record<string, unknown>
}

export function useOpenClawGateway(userId: string | undefined) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const reconnectAttemptRef = useRef(0)
  const [connected, setConnected] = useState(false)
  const [fallbackPolling, setFallbackPolling] = useState(false)
  const listenersRef = useRef<Map<string, Set<(payload: Record<string, unknown>) => void>>>(new Map())

  const connect = useCallback(() => {
    if (!userId || !PULSE_RELAY_URL) {
      setFallbackPolling(true)
      return
    }

    const protocol = PULSE_RELAY_URL.startsWith('https') ? 'wss' : 'ws'
    const host = PULSE_RELAY_URL.replace(/^https?:\/\//, '')
    const url = `${protocol}://${host}/?role=pulse&userId=${encodeURIComponent(userId)}`

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        setFallbackPolling(false)
        reconnectAttemptRef.current = 0
        console.debug('[Pulse] Signaling relay connected')
      }

      ws.onmessage = (event) => {
        try {
          const msg: GatewayMessage = JSON.parse(event.data)
          const handlers = listenersRef.current.get(msg.type)
          if (handlers) {
            handlers.forEach((fn) => fn(msg.payload))
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        setConnected(false)
        scheduleReconnect()
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      setFallbackPolling(true)
    }
  }, [userId])

  const scheduleReconnect = useCallback(() => {
    const attempt = reconnectAttemptRef.current
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
    reconnectAttemptRef.current = attempt + 1

    // BUG-CALL-005: After 5 failed attempts, switch to polling fallback
    // but schedule a recovery attempt after 60 seconds instead of permanent failure
    if (attempt >= 5) {
      setFallbackPolling(true)
      reconnectTimerRef.current = setTimeout(() => {
        reconnectAttemptRef.current = 0 // Reset retry counter
        connect()
      }, 60000)
      return
    }

    reconnectTimerRef.current = setTimeout(() => {
      connect()
    }, delay)
  }, [connect])

  const on = useCallback((event: string, handler: (payload: Record<string, unknown>) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set())
    }
    listenersRef.current.get(event)!.add(handler)

    return () => {
      listenersRef.current.get(event)?.delete(handler)
    }
  }, [])

  const emit = useCallback((event: string, payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: event, payload }))
    }
  }, [])

  const sendTyping = useCallback((recipientId: string) => {
    emit('typing.start', { recipientId })
  }, [emit])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return {
    connected,
    fallbackPolling,
    on,
    emit,
    sendTyping,
  }
}
