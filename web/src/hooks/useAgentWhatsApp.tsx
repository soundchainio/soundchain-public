/**
 * Agent WHATSAPP — Real-Time Messaging Bridge
 * Syncs Wall, Feed, DMs, and all agent alerts to WhatsApp.
 * Users control which agents can message them. Two-way: reply from WhatsApp.
 * Uses WhatsApp Cloud API (Meta). First 1,000 conversations/month FREE.
 * Powered by OGUN.
 *
 * ZERO BOOLEANS — all state uses typed string enums.
 */

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'

// ─── Enums ───────────────────────────────────────────────────────────

export const WHATSAPP_MODE = {
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  SYNCING: 'SYNCING',
  RATE_LIMITED: 'RATE_LIMITED',
  IDLE: 'IDLE',
} as const
export type WhatsAppMode = typeof WHATSAPP_MODE[keyof typeof WHATSAPP_MODE]

export const MESSAGE_KIND = {
  AGENT_ALERT: 'AGENT_ALERT',
  WALL_POST: 'WALL_POST',
  WALL_REPLY: 'WALL_REPLY',
  DM_FORWARD: 'DM_FORWARD',
  FEED_UPDATE: 'FEED_UPDATE',
  TRANSACTION: 'TRANSACTION',
  OGUN_REWARD: 'OGUN_REWARD',
  MARKET_ALERT: 'MARKET_ALERT',
  BUG_REPORT: 'BUG_REPORT',
  SYSTEM: 'SYSTEM',
} as const
export type MessageKind = typeof MESSAGE_KIND[keyof typeof MESSAGE_KIND]

export const DELIVERY_STATUS = {
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED',
} as const
export type DeliveryStatus = typeof DELIVERY_STATUS[keyof typeof DELIVERY_STATUS]

export const SYNC_DIRECTION = {
  OUTBOUND: 'OUTBOUND',
  INBOUND: 'INBOUND',
  BIDIRECTIONAL: 'BIDIRECTIONAL',
} as const
export type SyncDirection = typeof SYNC_DIRECTION[keyof typeof SYNC_DIRECTION]

export const AGENT_ROUTE = {
  EYE: 'EYE',
  DESIGNER: 'DESIGNER',
  SOCIAL: 'SOCIAL',
  VIDEO: 'VIDEO',
  MUSIC: 'MUSIC',
  ART: 'ART',
  GAMER: 'GAMER',
  ARCADE: 'ARCADE',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
  MARKO: 'MARKO',
  FORGE: 'FORGE',
  WALL: 'WALL',
  FEED: 'FEED',
  DM: 'DM',
} as const
export type AgentRoute = typeof AGENT_ROUTE[keyof typeof AGENT_ROUTE]

export const TEMPLATE_NAME = {
  AGENT_ALERT: 'AGENT_ALERT',
  DAILY_RECAP: 'DAILY_RECAP',
  OGUN_EARNED: 'OGUN_EARNED',
  NEW_FOLLOWER: 'NEW_FOLLOWER',
  WALL_ACTIVITY: 'WALL_ACTIVITY',
  MARKET_SCAN: 'MARKET_SCAN',
  BUG_CAUGHT: 'BUG_CAUGHT',
  WELCOME: 'WELCOME',
} as const
export type TemplateName = typeof TEMPLATE_NAME[keyof typeof TEMPLATE_NAME]

// ─── Types ───────────────────────────────────────────────────────────

export interface WhatsAppMessage {
  id: string
  kind: MessageKind
  agentSource: AgentRoute
  content: string
  template: TemplateName | null
  deliveryStatus: DeliveryStatus
  direction: SyncDirection
  timestamp: number
  metadata: Record<string, string>
}

export interface AgentRouteConfig {
  agent: AgentRoute
  enabled: string // 'ENABLED' | 'DISABLED' | 'URGENT_ONLY'
  throttleMs: number
  lastSent: number
}

export interface WhatsAppSession {
  phoneNumber: string | null
  connectionStatus: WhatsAppMode
  connectedAt: number
  messagesSent: number
  messagesReceived: number
  lastActivity: number
}

interface AgentWhatsAppContextValue {
  mode: WhatsAppMode
  setMode: (mode: WhatsAppMode) => void
  session: WhatsAppSession
  connectPhone: (phoneNumber: string) => void
  disconnectPhone: () => void
  sendMessage: (kind: MessageKind, agentSource: AgentRoute, content: string, template?: TemplateName, metadata?: Record<string, string>) => Promise<void>
  messageQueue: WhatsAppMessage[]
  messageHistory: WhatsAppMessage[]
  routeConfigs: AgentRouteConfig[]
  setRouteEnabled: (agent: AgentRoute, enabled: string) => void
  setRouteThrottle: (agent: AgentRoute, throttleMs: number) => void
  pendingCount: number
  deliveredCount: number
}

// ─── Default Route Configs ──────────────────────────────────────────

const DEFAULT_ROUTES: AgentRouteConfig[] = [
  { agent: AGENT_ROUTE.EYE, enabled: 'URGENT_ONLY', throttleMs: 60_000, lastSent: 0 },
  { agent: AGENT_ROUTE.DESIGNER, enabled: 'DISABLED', throttleMs: 300_000, lastSent: 0 },
  { agent: AGENT_ROUTE.SOCIAL, enabled: 'ENABLED', throttleMs: 60_000, lastSent: 0 },
  { agent: AGENT_ROUTE.VIDEO, enabled: 'DISABLED', throttleMs: 300_000, lastSent: 0 },
  { agent: AGENT_ROUTE.MUSIC, enabled: 'DISABLED', throttleMs: 300_000, lastSent: 0 },
  { agent: AGENT_ROUTE.ART, enabled: 'DISABLED', throttleMs: 300_000, lastSent: 0 },
  { agent: AGENT_ROUTE.GAMER, enabled: 'DISABLED', throttleMs: 300_000, lastSent: 0 },
  { agent: AGENT_ROUTE.ARCADE, enabled: 'ENABLED', throttleMs: 120_000, lastSent: 0 },
  { agent: AGENT_ROUTE.MANAGER, enabled: 'URGENT_ONLY', throttleMs: 300_000, lastSent: 0 },
  { agent: AGENT_ROUTE.ADMIN, enabled: 'ENABLED', throttleMs: 60_000, lastSent: 0 },
  { agent: AGENT_ROUTE.MARKO, enabled: 'ENABLED', throttleMs: 30_000, lastSent: 0 },
  { agent: AGENT_ROUTE.FORGE, enabled: 'DISABLED', throttleMs: 300_000, lastSent: 0 },
  { agent: AGENT_ROUTE.WALL, enabled: 'ENABLED', throttleMs: 10_000, lastSent: 0 },
  { agent: AGENT_ROUTE.FEED, enabled: 'ENABLED', throttleMs: 60_000, lastSent: 0 },
  { agent: AGENT_ROUTE.DM, enabled: 'ENABLED', throttleMs: 0, lastSent: 0 },
]

// ─── Context ─────────────────────────────────────────────────────────

const AgentWhatsAppContext = createContext<AgentWhatsAppContextValue>({
  mode: WHATSAPP_MODE.IDLE,
  setMode: () => {},
  session: { phoneNumber: null, connectionStatus: WHATSAPP_MODE.DISCONNECTED, connectedAt: 0, messagesSent: 0, messagesReceived: 0, lastActivity: 0 },
  connectPhone: () => {},
  disconnectPhone: () => {},
  sendMessage: async () => {},
  messageQueue: [],
  messageHistory: [],
  routeConfigs: DEFAULT_ROUTES,
  setRouteEnabled: () => {},
  setRouteThrottle: () => {},
  pendingCount: 0,
  deliveredCount: 0,
})

export const useAgentWhatsApp = () => useContext(AgentWhatsAppContext)

// ─── Provider ────────────────────────────────────────────────────────

export function AgentWhatsAppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<WhatsAppMode>(WHATSAPP_MODE.IDLE)
  const [session, setSession] = useState<WhatsAppSession>({
    phoneNumber: null,
    connectionStatus: WHATSAPP_MODE.DISCONNECTED,
    connectedAt: 0,
    messagesSent: 0,
    messagesReceived: 0,
    lastActivity: 0,
  })
  const [messageQueue, setMessageQueue] = useState<WhatsAppMessage[]>([])
  const [messageHistory, setMessageHistory] = useState<WhatsAppMessage[]>([])
  const [routeConfigs, setRouteConfigs] = useState<AgentRouteConfig[]>(DEFAULT_ROUTES)
  const rateLimitRef = useRef<Map<string, number>>(new Map())

  const connectPhone = useCallback((phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/[^0-9+]/g, '')
    if (cleaned.length < 10) return

    setSession({
      phoneNumber: cleaned,
      connectionStatus: WHATSAPP_MODE.CONNECTED,
      connectedAt: Date.now(),
      messagesSent: 0,
      messagesReceived: 0,
      lastActivity: Date.now(),
    })
    setMode(WHATSAPP_MODE.CONNECTED)

    // Register with backend
    try {
      fetch('/api/agent/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REGISTER',
          phoneNumber: cleaned,
          timestamp: Date.now(),
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      // silent
    }
  }, [])

  const disconnectPhone = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      connectionStatus: WHATSAPP_MODE.DISCONNECTED,
      phoneNumber: null,
    }))
    setMode(WHATSAPP_MODE.DISCONNECTED)
  }, [])

  const setRouteEnabled = useCallback((agent: AgentRoute, enabled: string) => {
    setRouteConfigs((prev) =>
      prev.map((r) => (r.agent === agent ? { ...r, enabled } : r))
    )
  }, [])

  const setRouteThrottle = useCallback((agent: AgentRoute, throttleMs: number) => {
    setRouteConfigs((prev) =>
      prev.map((r) => (r.agent === agent ? { ...r, throttleMs } : r))
    )
  }, [])

  const sendMessage = useCallback(
    async (
      kind: MessageKind,
      agentSource: AgentRoute,
      content: string,
      template?: TemplateName,
      metadata?: Record<string, string>
    ) => {
      // Check if phone is connected
      if (session.connectionStatus !== WHATSAPP_MODE.CONNECTED) return
      if (!session.phoneNumber) return

      // Check route config
      const routeConfig = routeConfigs.find((r) => r.agent === agentSource)
      if (routeConfig) {
        if (routeConfig.enabled === 'DISABLED') return
        // URGENT_ONLY — only allow CRITICAL/ERROR severity messages
        if (routeConfig.enabled === 'URGENT_ONLY') {
          const isUrgent = kind === MESSAGE_KIND.BUG_REPORT || kind === MESSAGE_KIND.TRANSACTION || kind === MESSAGE_KIND.SYSTEM
          if (!isUrgent) return
        }

        // Throttle check
        if (routeConfig.throttleMs > 0) {
          const now = Date.now()
          const lastSent = rateLimitRef.current.get(agentSource) || 0
          if (now - lastSent < routeConfig.throttleMs) return
          rateLimitRef.current.set(agentSource, now)
        }
      }

      const message: WhatsAppMessage = {
        id: 'wa_' + Math.random().toString(36).slice(2, 10),
        kind,
        agentSource,
        content: content.slice(0, 4096),
        template: template || null,
        deliveryStatus: DELIVERY_STATUS.QUEUED,
        direction: SYNC_DIRECTION.OUTBOUND,
        timestamp: Date.now(),
        metadata: metadata || {},
      }

      // Add to queue
      setMessageQueue((prev) => [...prev, message])

      // Send to API
      try {
        const response = await fetch('/api/agent/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SEND',
            phoneNumber: session.phoneNumber,
            message: {
              kind: message.kind,
              agentSource: message.agentSource,
              content: message.content,
              template: message.template,
              metadata: message.metadata,
            },
            timestamp: Date.now(),
          }),
          keepalive: true,
        })

        const data = await response.json()

        // Update delivery status
        const newStatus = data.verdict === 'SENT' ? DELIVERY_STATUS.SENT : DELIVERY_STATUS.FAILED
        setMessageQueue((prev) =>
          prev.map((m) => (m.id === message.id ? { ...m, deliveryStatus: newStatus } : m))
        )

        // Move to history
        setMessageHistory((prev) =>
          [{ ...message, deliveryStatus: newStatus }, ...prev].slice(0, 200)
        )
        setMessageQueue((prev) => prev.filter((m) => m.id !== message.id))

        // Update session stats
        if (newStatus === DELIVERY_STATUS.SENT) {
          setSession((prev) => ({
            ...prev,
            messagesSent: prev.messagesSent + 1,
            lastActivity: Date.now(),
          }))
        }
      } catch {
        // Move to history as failed
        setMessageHistory((prev) =>
          [{ ...message, deliveryStatus: DELIVERY_STATUS.FAILED }, ...prev].slice(0, 200)
        )
        setMessageQueue((prev) => prev.filter((m) => m.id !== message.id))
      }
    },
    [session.connectionStatus, session.phoneNumber, routeConfigs]
  )

  const pendingCount = messageQueue.filter((m) => m.deliveryStatus === DELIVERY_STATUS.QUEUED).length
  const deliveredCount = messageHistory.filter((m) => m.deliveryStatus === DELIVERY_STATUS.SENT || m.deliveryStatus === DELIVERY_STATUS.DELIVERED).length

  return (
    <AgentWhatsAppContext.Provider
      value={{
        mode,
        setMode,
        session,
        connectPhone,
        disconnectPhone,
        sendMessage,
        messageQueue,
        messageHistory,
        routeConfigs,
        setRouteEnabled,
        setRouteThrottle,
        pendingCount,
        deliveredCount,
      }}
    >
      {children}
    </AgentWhatsAppContext.Provider>
  )
}
