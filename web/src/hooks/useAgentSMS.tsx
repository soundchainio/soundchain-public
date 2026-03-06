/**
 * Agent SMS — Text Message Gateway
 * Provider-agnostic SMS delivery. Plug in any backend: Twilio, AWS SNS,
 * Vonage, Plivo — or queue locally until configured.
 * Routes agent alerts, OGUN rewards, Wall activity, and DMs to SMS.
 * The last-resort channel — reaches every phone on Earth. No app needed.
 * Powered by OGUN.
 *
 * ZERO BOOLEANS — all state uses typed string enums.
 */

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'

// ─── Enums ───────────────────────────────────────────────────────────

export const SMS_MODE = {
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  SENDING: 'SENDING',
  RATE_LIMITED: 'RATE_LIMITED',
  IDLE: 'IDLE',
} as const
export type SmsMode = typeof SMS_MODE[keyof typeof SMS_MODE]

export const SMS_PROVIDER = {
  TWILIO: 'TWILIO',
  AWS_SNS: 'AWS_SNS',
  VONAGE: 'VONAGE',
  PLIVO: 'PLIVO',
  META: 'META',
  LOCAL_QUEUE: 'LOCAL_QUEUE',
} as const
export type SmsProvider = typeof SMS_PROVIDER[keyof typeof SMS_PROVIDER]

export const SMS_KIND = {
  AGENT_ALERT: 'AGENT_ALERT',
  OGUN_REWARD: 'OGUN_REWARD',
  TRANSACTION: 'TRANSACTION',
  WALL_ACTIVITY: 'WALL_ACTIVITY',
  DM_FORWARD: 'DM_FORWARD',
  MARKET_ALERT: 'MARKET_ALERT',
  BUG_REPORT: 'BUG_REPORT',
  SECURITY: 'SECURITY',
  VERIFICATION: 'VERIFICATION',
  SYSTEM: 'SYSTEM',
} as const
export type SmsKind = typeof SMS_KIND[keyof typeof SMS_KIND]

export const DELIVERY_STATUS = {
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
} as const
export type DeliveryStatus = typeof DELIVERY_STATUS[keyof typeof DELIVERY_STATUS]

export const SMS_PRIORITY = {
  URGENT: 'URGENT',
  NORMAL: 'NORMAL',
  LOW: 'LOW',
} as const
export type SmsPriority = typeof SMS_PRIORITY[keyof typeof SMS_PRIORITY]

export const AGENT_SOURCE = {
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
  WHATSAPP: 'WHATSAPP',
  NOSTR: 'NOSTR',
  WALL: 'WALL',
  FEED: 'FEED',
  DM: 'DM',
} as const
export type AgentSource = typeof AGENT_SOURCE[keyof typeof AGENT_SOURCE]

// ─── Types ───────────────────────────────────────────────────────────

export interface SmsMessage {
  id: string
  kind: SmsKind
  agentSource: AgentSource
  content: string
  toPhone: string
  priority: SmsPriority
  deliveryStatus: DeliveryStatus
  provider: SmsProvider
  timestamp: number
  costEstimate: string // e.g. '$0.0075' or 'FREE' or 'QUEUED'
}

export interface AgentRouteConfig {
  agent: AgentSource
  enabled: string // 'ENABLED' | 'DISABLED' | 'URGENT_ONLY'
  dailyLimit: number
  sentToday: number
}

export interface SmsSession {
  phoneNumber: string | null
  provider: SmsProvider
  messagesSent: number
  messagesFailed: number
  dailyBudgetCents: number
  spentTodayCents: number
  lastActivity: number
}

interface AgentSMSContextValue {
  mode: SmsMode
  setMode: (mode: SmsMode) => void
  session: SmsSession
  registerPhone: (phoneNumber: string) => void
  unregisterPhone: () => void
  sendSMS: (kind: SmsKind, agentSource: AgentSource, content: string, priority?: SmsPriority) => Promise<void>
  messageHistory: SmsMessage[]
  routeConfigs: AgentRouteConfig[]
  setRouteEnabled: (agent: AgentSource, enabled: string) => void
  pendingCount: number
  deliveredCount: number
  dailyRemaining: number
}

// ─── Default Route Configs ──────────────────────────────────────────
// SMS is expensive — default most agents to DISABLED or URGENT_ONLY

const DEFAULT_ROUTES: AgentRouteConfig[] = [
  { agent: AGENT_SOURCE.EYE, enabled: 'URGENT_ONLY', dailyLimit: 5, sentToday: 0 },
  { agent: AGENT_SOURCE.DESIGNER, enabled: 'DISABLED', dailyLimit: 0, sentToday: 0 },
  { agent: AGENT_SOURCE.SOCIAL, enabled: 'DISABLED', dailyLimit: 0, sentToday: 0 },
  { agent: AGENT_SOURCE.VIDEO, enabled: 'DISABLED', dailyLimit: 0, sentToday: 0 },
  { agent: AGENT_SOURCE.MUSIC, enabled: 'DISABLED', dailyLimit: 0, sentToday: 0 },
  { agent: AGENT_SOURCE.ART, enabled: 'DISABLED', dailyLimit: 0, sentToday: 0 },
  { agent: AGENT_SOURCE.GAMER, enabled: 'DISABLED', dailyLimit: 0, sentToday: 0 },
  { agent: AGENT_SOURCE.ARCADE, enabled: 'DISABLED', dailyLimit: 0, sentToday: 0 },
  { agent: AGENT_SOURCE.MANAGER, enabled: 'URGENT_ONLY', dailyLimit: 3, sentToday: 0 },
  { agent: AGENT_SOURCE.ADMIN, enabled: 'URGENT_ONLY', dailyLimit: 5, sentToday: 0 },
  { agent: AGENT_SOURCE.MARKO, enabled: 'URGENT_ONLY', dailyLimit: 10, sentToday: 0 },
  { agent: AGENT_SOURCE.FORGE, enabled: 'DISABLED', dailyLimit: 0, sentToday: 0 },
  { agent: AGENT_SOURCE.WHATSAPP, enabled: 'DISABLED', dailyLimit: 0, sentToday: 0 },
  { agent: AGENT_SOURCE.NOSTR, enabled: 'DISABLED', dailyLimit: 0, sentToday: 0 },
  { agent: AGENT_SOURCE.WALL, enabled: 'DISABLED', dailyLimit: 0, sentToday: 0 },
  { agent: AGENT_SOURCE.FEED, enabled: 'DISABLED', dailyLimit: 0, sentToday: 0 },
  { agent: AGENT_SOURCE.DM, enabled: 'URGENT_ONLY', dailyLimit: 10, sentToday: 0 },
]

// ─── Context ─────────────────────────────────────────────────────────

const AgentSMSContext = createContext<AgentSMSContextValue>({
  mode: SMS_MODE.IDLE,
  setMode: () => {},
  session: {
    phoneNumber: null,
    provider: SMS_PROVIDER.LOCAL_QUEUE,
    messagesSent: 0,
    messagesFailed: 0,
    dailyBudgetCents: 100, // $1/day default cap
    spentTodayCents: 0,
    lastActivity: 0,
  },
  registerPhone: () => {},
  unregisterPhone: () => {},
  sendSMS: async () => {},
  messageHistory: [],
  routeConfigs: DEFAULT_ROUTES,
  setRouteEnabled: () => {},
  pendingCount: 0,
  deliveredCount: 0,
  dailyRemaining: 100,
})

export const useAgentSMS = () => useContext(AgentSMSContext)

// ─── Cost Estimator ──────────────────────────────────────────────────

function estimateCost(provider: SmsProvider): string {
  const costs: Record<string, string> = {
    TWILIO: '$0.0079',
    AWS_SNS: '$0.00645',
    VONAGE: '$0.0068',
    PLIVO: '$0.0050',
    META: '$0.0050',
    LOCAL_QUEUE: 'QUEUED',
  }
  return costs[provider] || 'UNKNOWN'
}

// ─── Provider ────────────────────────────────────────────────────────

export function AgentSMSProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SmsMode>(SMS_MODE.IDLE)
  const [session, setSession] = useState<SmsSession>({
    phoneNumber: null,
    provider: SMS_PROVIDER.LOCAL_QUEUE,
    messagesSent: 0,
    messagesFailed: 0,
    dailyBudgetCents: 100,
    spentTodayCents: 0,
    lastActivity: 0,
  })
  const [messageHistory, setMessageHistory] = useState<SmsMessage[]>([])
  const [routeConfigs, setRouteConfigs] = useState<AgentRouteConfig[]>(DEFAULT_ROUTES)
  const throttleRef = useRef<Map<string, number>>(new Map())

  const registerPhone = useCallback((phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/[^0-9+]/g, '')
    if (cleaned.length < 10) return

    setSession((prev) => ({
      ...prev,
      phoneNumber: cleaned,
      lastActivity: Date.now(),
    }))
    setMode(SMS_MODE.CONNECTED)

    // Register with backend
    try {
      fetch('/api/agent/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REGISTER', phoneNumber: cleaned }),
        keepalive: true,
      }).catch(() => {})
    } catch { /* silent */ }
  }, [])

  const unregisterPhone = useCallback(() => {
    setSession((prev) => ({ ...prev, phoneNumber: null }))
    setMode(SMS_MODE.DISCONNECTED)
  }, [])

  const setRouteEnabled = useCallback((agent: AgentSource, enabled: string) => {
    setRouteConfigs((prev) =>
      prev.map((r) => (r.agent === agent ? { ...r, enabled } : r))
    )
  }, [])

  const sendSMS = useCallback(
    async (kind: SmsKind, agentSource: AgentSource, content: string, priority?: SmsPriority) => {
      if (!session.phoneNumber) return

      const msgPriority = priority || SMS_PRIORITY.NORMAL

      // Check route config
      const route = routeConfigs.find((r) => r.agent === agentSource)
      if (route) {
        if (route.enabled === 'DISABLED') return
        if (route.enabled === 'URGENT_ONLY' && msgPriority !== SMS_PRIORITY.URGENT) return
        if (route.dailyLimit > 0 && route.sentToday >= route.dailyLimit) return
      }

      // Throttle: min 30s between SMS from same agent
      const now = Date.now()
      const lastSent = throttleRef.current.get(agentSource) || 0
      if (now - lastSent < 30_000) return
      throttleRef.current.set(agentSource, now)

      // Daily budget check
      const costCents = session.provider === SMS_PROVIDER.LOCAL_QUEUE ? 0 : 1 // ~$0.01 estimate
      if (session.spentTodayCents + costCents > session.dailyBudgetCents) return

      // Truncate to SMS length (160 chars) with agent prefix
      const prefix = `[${agentSource}] `
      const truncated = `${prefix}${content}`.slice(0, 160)

      const message: SmsMessage = {
        id: 'sm_' + Math.random().toString(36).slice(2, 10),
        kind,
        agentSource,
        content: truncated,
        toPhone: session.phoneNumber,
        priority: msgPriority,
        deliveryStatus: DELIVERY_STATUS.QUEUED,
        provider: session.provider,
        timestamp: Date.now(),
        costEstimate: estimateCost(session.provider),
      }

      // Send to API
      try {
        setMode(SMS_MODE.SENDING)

        const response = await fetch('/api/agent/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SEND',
            phoneNumber: session.phoneNumber,
            message: {
              kind: message.kind,
              agentSource: message.agentSource,
              content: message.content,
              priority: message.priority,
            },
          }),
          keepalive: true,
        })

        const data = await response.json()
        const status = data.verdict === 'SENT' ? DELIVERY_STATUS.SENT : DELIVERY_STATUS.QUEUED

        setMessageHistory((prev) =>
          [{ ...message, deliveryStatus: status }, ...prev].slice(0, 200)
        )

        if (status === DELIVERY_STATUS.SENT) {
          setSession((prev) => ({
            ...prev,
            messagesSent: prev.messagesSent + 1,
            spentTodayCents: prev.spentTodayCents + costCents,
            lastActivity: Date.now(),
          }))
          // Increment daily counter for this agent
          setRouteConfigs((prev) =>
            prev.map((r) => (r.agent === agentSource ? { ...r, sentToday: r.sentToday + 1 } : r))
          )
        }

        setMode(SMS_MODE.CONNECTED)
      } catch {
        setMessageHistory((prev) =>
          [{ ...message, deliveryStatus: DELIVERY_STATUS.FAILED }, ...prev].slice(0, 200)
        )
        setSession((prev) => ({ ...prev, messagesFailed: prev.messagesFailed + 1 }))
        setMode(SMS_MODE.CONNECTED)
      }
    },
    [session.phoneNumber, session.provider, session.spentTodayCents, session.dailyBudgetCents, routeConfigs]
  )

  const pendingCount = messageHistory.filter((m) => m.deliveryStatus === DELIVERY_STATUS.QUEUED).length
  const deliveredCount = messageHistory.filter((m) => m.deliveryStatus === DELIVERY_STATUS.SENT || m.deliveryStatus === DELIVERY_STATUS.DELIVERED).length
  const dailyRemaining = session.dailyBudgetCents - session.spentTodayCents

  return (
    <AgentSMSContext.Provider
      value={{
        mode,
        setMode,
        session,
        registerPhone,
        unregisterPhone,
        sendSMS,
        messageHistory,
        routeConfigs,
        setRouteEnabled,
        pendingCount,
        deliveredCount,
        dailyRemaining,
      }}
    >
      {children}
    </AgentSMSContext.Provider>
  )
}
