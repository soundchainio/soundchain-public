/**
 * Agent NOSTR — Decentralized Messaging & Relay Network
 * NIP-17 encrypted DMs, location chat via geohash, agent alerts via relays.
 * No corporate API. No rate limits. No monthly fees. FREE FOREVER.
 * Every message is cryptographically signed. Every relay is community-run.
 * Bridges all 13 agents to the Nostr network. The anti-WhatsApp.
 * Powered by OGUN.
 *
 * ZERO BOOLEANS — all state uses typed string enums.
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react'

// ─── Enums ───────────────────────────────────────────────────────────

export const NOSTR_MODE = {
  CONNECTED: 'CONNECTED',
  CONNECTING: 'CONNECTING',
  DISCONNECTED: 'DISCONNECTED',
  RECONNECTING: 'RECONNECTING',
  IDLE: 'IDLE',
} as const
export type NostrMode = typeof NOSTR_MODE[keyof typeof NOSTR_MODE]

export const RELAY_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  ERROR: 'ERROR',
  CONNECTING: 'CONNECTING',
} as const
export type RelayStatus = typeof RELAY_STATUS[keyof typeof RELAY_STATUS]

export const EVENT_KIND = {
  METADATA: 'METADATA',
  TEXT_NOTE: 'TEXT_NOTE',
  DM_SEALED: 'DM_SEALED',
  DM_GIFT_WRAP: 'DM_GIFT_WRAP',
  LOCATION_CHAT: 'LOCATION_CHAT',
  AGENT_ALERT: 'AGENT_ALERT',
  REACTION: 'REACTION',
  ZAP: 'ZAP',
} as const
export type EventKind = typeof EVENT_KIND[keyof typeof EVENT_KIND]

// Nostr event kind numbers
export const KIND_NUMBER: Record<string, number> = {
  METADATA: 0,
  TEXT_NOTE: 1,
  DM_SEALED: 13,
  DM_GIFT_WRAP: 1059,
  LOCATION_CHAT: 20000,
  REACTION: 7,
  ZAP: 9735,
  AGENT_ALERT: 30078,
}

export const DM_ENCRYPTION = {
  NIP_04: 'NIP_04',
  NIP_44: 'NIP_44',
  NIP_17: 'NIP_17',
} as const
export type DmEncryption = typeof DM_ENCRYPTION[keyof typeof DM_ENCRYPTION]

export const GEOHASH_PRECISION = {
  CITY: 'CITY',
  NEIGHBORHOOD: 'NEIGHBORHOOD',
  VENUE: 'VENUE',
  STAGE: 'STAGE',
} as const
export type GeohashPrecision = typeof GEOHASH_PRECISION[keyof typeof GEOHASH_PRECISION]

export const PRECISION_VALUES: Record<string, number> = {
  CITY: 4,
  NEIGHBORHOOD: 5,
  VENUE: 6,
  STAGE: 7,
}

export const ALERT_PRIORITY = {
  URGENT: 'URGENT',
  NORMAL: 'NORMAL',
  LOW: 'LOW',
} as const
export type AlertPriority = typeof ALERT_PRIORITY[keyof typeof ALERT_PRIORITY]

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
  WALL: 'WALL',
  FEED: 'FEED',
  DM: 'DM',
} as const
export type AgentSource = typeof AGENT_SOURCE[keyof typeof AGENT_SOURCE]

// ─── Default Relays ─────────────────────────────────────────────────

// Re-export the canonical list from lib/nostr/concertChat. Keeping a
// `DEFAULT_RELAYS` alias here so existing AgentNostr callers don't break, but
// the list itself comes from one place — kills the dead-relay reconnect storm
// when one of them dies (Frank May 7: relay.snort.social + relay.nostr.band).
import { NOSTR_RELAYS } from 'lib/nostr/concertChat'
export const DEFAULT_RELAYS = NOSTR_RELAYS

// ─── Types ───────────────────────────────────────────────────────────

export interface RelayInfo {
  url: string
  status: RelayStatus
  connectedAt: number
  messagesSent: number
  messagesReceived: number
  lastActivity: number
  latencyMs: number
}

export interface NostrIdentity {
  pubkey: string | null
  npub: string | null
  hasPrivateKey: string // 'YES' | 'NO' | 'EXTERNAL' (NIP-07 extension)
}

export interface NostrEvent {
  id: string
  kind: EventKind
  kindNumber: number
  content: string
  pubkey: string
  agentSource: AgentSource | null
  timestamp: number
  tags: string[][]
}

export interface DirectMessage {
  id: string
  from: string
  to: string
  content: string
  encryption: DmEncryption
  timestamp: number
  direction: string // 'SENT' | 'RECEIVED'
}

export interface LocationChannel {
  geohash: string
  precision: GeohashPrecision
  messageCount: number
  lastActivity: number
  activeUsers: number
}

export interface AgentRouteConfig {
  agent: AgentSource
  enabled: string // 'ENABLED' | 'DISABLED' | 'URGENT_ONLY'
  lastSent: number
}

interface AgentNostrContextValue {
  mode: NostrMode
  setMode: (mode: NostrMode) => void
  identity: NostrIdentity
  relays: RelayInfo[]
  addRelay: (url: string) => void
  removeRelay: (url: string) => void
  connectedRelayCount: number
  // Messaging
  sendNote: (content: string, tags?: string[][]) => Promise<void>
  sendDM: (recipientPubkey: string, content: string) => Promise<void>
  sendAgentAlert: (source: AgentSource, content: string, priority: AlertPriority) => Promise<void>
  // Location chat
  joinLocationChannel: (geohash: string, precision: GeohashPrecision) => void
  sendLocationMessage: (content: string) => Promise<void>
  activeChannel: LocationChannel | null
  // History
  eventHistory: NostrEvent[]
  dmHistory: DirectMessage[]
  // Agent routing
  routeConfigs: AgentRouteConfig[]
  setRouteEnabled: (agent: AgentSource, enabled: string) => void
  // Stats
  totalEventsSent: number
  totalEventsReceived: number
}

// ─── Default Route Configs ──────────────────────────────────────────

const DEFAULT_ROUTES: AgentRouteConfig[] = [
  { agent: AGENT_SOURCE.EYE, enabled: 'URGENT_ONLY', lastSent: 0 },
  { agent: AGENT_SOURCE.DESIGNER, enabled: 'DISABLED', lastSent: 0 },
  { agent: AGENT_SOURCE.SOCIAL, enabled: 'ENABLED', lastSent: 0 },
  { agent: AGENT_SOURCE.VIDEO, enabled: 'DISABLED', lastSent: 0 },
  { agent: AGENT_SOURCE.MUSIC, enabled: 'DISABLED', lastSent: 0 },
  { agent: AGENT_SOURCE.ART, enabled: 'DISABLED', lastSent: 0 },
  { agent: AGENT_SOURCE.GAMER, enabled: 'DISABLED', lastSent: 0 },
  { agent: AGENT_SOURCE.ARCADE, enabled: 'ENABLED', lastSent: 0 },
  { agent: AGENT_SOURCE.MANAGER, enabled: 'URGENT_ONLY', lastSent: 0 },
  { agent: AGENT_SOURCE.ADMIN, enabled: 'ENABLED', lastSent: 0 },
  { agent: AGENT_SOURCE.MARKO, enabled: 'ENABLED', lastSent: 0 },
  { agent: AGENT_SOURCE.FORGE, enabled: 'DISABLED', lastSent: 0 },
  { agent: AGENT_SOURCE.WHATSAPP, enabled: 'DISABLED', lastSent: 0 },
  { agent: AGENT_SOURCE.WALL, enabled: 'ENABLED', lastSent: 0 },
  { agent: AGENT_SOURCE.FEED, enabled: 'ENABLED', lastSent: 0 },
  { agent: AGENT_SOURCE.DM, enabled: 'ENABLED', lastSent: 0 },
]

// ─── Context ─────────────────────────────────────────────────────────

const AgentNostrContext = createContext<AgentNostrContextValue>({
  mode: NOSTR_MODE.IDLE,
  setMode: () => {},
  identity: { pubkey: null, npub: null, hasPrivateKey: 'NO' },
  relays: [],
  addRelay: () => {},
  removeRelay: () => {},
  connectedRelayCount: 0,
  sendNote: async () => {},
  sendDM: async () => {},
  sendAgentAlert: async () => {},
  joinLocationChannel: () => {},
  sendLocationMessage: async () => {},
  activeChannel: null,
  eventHistory: [],
  dmHistory: [],
  routeConfigs: DEFAULT_ROUTES,
  setRouteEnabled: () => {},
  totalEventsSent: 0,
  totalEventsReceived: 0,
})

export const useAgentNostr = () => useContext(AgentNostrContext)

// ─── Provider ────────────────────────────────────────────────────────

export function AgentNostrProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<NostrMode>(NOSTR_MODE.IDLE)
  const [identity, setIdentity] = useState<NostrIdentity>({
    pubkey: null, npub: null, hasPrivateKey: 'NO',
  })
  const [relays, setRelays] = useState<RelayInfo[]>(
    DEFAULT_RELAYS.map((url) => ({
      url,
      status: RELAY_STATUS.CLOSED,
      connectedAt: 0,
      messagesSent: 0,
      messagesReceived: 0,
      lastActivity: 0,
      latencyMs: 0,
    }))
  )
  const [eventHistory, setEventHistory] = useState<NostrEvent[]>([])
  const [dmHistory, setDmHistory] = useState<DirectMessage[]>([])
  const [activeChannel, setActiveChannel] = useState<LocationChannel | null>(null)
  const [routeConfigs, setRouteConfigs] = useState<AgentRouteConfig[]>(DEFAULT_ROUTES)
  const [totalEventsSent, setTotalEventsSent] = useState(0)
  const [totalEventsReceived, setTotalEventsReceived] = useState(0)
  const socketsRef = useRef<Map<string, WebSocket>>(new Map())
  const reconnectTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // ─── Relay Management ──────────────────────────────────────────

  const connectRelay = useCallback((url: string) => {
    if (typeof window === 'undefined') return
    if (socketsRef.current.has(url)) return

    try {
      const ws = new WebSocket(url)
      const startTime = Date.now()

      ws.onopen = () => {
        setRelays((prev) =>
          prev.map((r) =>
            r.url === url
              ? { ...r, status: RELAY_STATUS.OPEN, connectedAt: Date.now(), latencyMs: Date.now() - startTime }
              : r
          )
        )
      }

      ws.onmessage = (event) => {
        setRelays((prev) =>
          prev.map((r) =>
            r.url === url
              ? { ...r, messagesReceived: r.messagesReceived + 1, lastActivity: Date.now() }
              : r
          )
        )
        setTotalEventsReceived((prev) => prev + 1)

        // Parse Nostr event
        try {
          const data = JSON.parse(event.data)
          if (Array.isArray(data) && data[0] === 'EVENT') {
            const nostrEvent = data[2]
            if (nostrEvent) {
              const parsed: NostrEvent = {
                id: nostrEvent.id || '',
                kind: EVENT_KIND.TEXT_NOTE,
                kindNumber: nostrEvent.kind || 1,
                content: (nostrEvent.content || '').slice(0, 4096),
                pubkey: nostrEvent.pubkey || '',
                agentSource: null,
                timestamp: (nostrEvent.created_at || 0) * 1000,
                tags: nostrEvent.tags || [],
              }
              setEventHistory((prev) => [parsed, ...prev].slice(0, 200))
            }
          }
        } catch {
          // ignore parse errors
        }
      }

      ws.onerror = () => {
        setRelays((prev) =>
          prev.map((r) => (r.url === url ? { ...r, status: RELAY_STATUS.ERROR } : r))
        )
      }

      ws.onclose = () => {
        socketsRef.current.delete(url)
        setRelays((prev) =>
          prev.map((r) => (r.url === url ? { ...r, status: RELAY_STATUS.CLOSED } : r))
        )

        // Auto-reconnect after 30 seconds
        const timer = setTimeout(() => {
          connectRelay(url)
        }, 30_000)
        reconnectTimers.current.set(url, timer)
      }

      socketsRef.current.set(url, ws)
    } catch {
      setRelays((prev) =>
        prev.map((r) => (r.url === url ? { ...r, status: RELAY_STATUS.ERROR } : r))
      )
    }
  }, [])

  const addRelay = useCallback((url: string) => {
    const normalized = url.trim()
    if (!normalized.startsWith('wss://') && !normalized.startsWith('ws://')) return

    setRelays((prev) => {
      if (prev.some((r) => r.url === normalized)) return prev
      return [...prev, {
        url: normalized,
        status: RELAY_STATUS.CLOSED,
        connectedAt: 0,
        messagesSent: 0,
        messagesReceived: 0,
        lastActivity: 0,
        latencyMs: 0,
      }]
    })

    connectRelay(normalized)
  }, [connectRelay])

  const removeRelay = useCallback((url: string) => {
    const ws = socketsRef.current.get(url)
    if (ws) {
      ws.close()
      socketsRef.current.delete(url)
    }
    const timer = reconnectTimers.current.get(url)
    if (timer) {
      clearTimeout(timer)
      reconnectTimers.current.delete(url)
    }
    setRelays((prev) => prev.filter((r) => r.url !== url))
  }, [])

  // ─── Publishing ────────────────────────────────────────────────

  const publishToRelays = useCallback((eventJson: string) => {
    const message = `["EVENT",${eventJson}]`
    let sentCount = 0

    socketsRef.current.forEach((ws, url) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message)
          sentCount++
          setRelays((prev) =>
            prev.map((r) =>
              r.url === url
                ? { ...r, messagesSent: r.messagesSent + 1, lastActivity: Date.now() }
                : r
            )
          )
        } catch {
          // silent
        }
      }
    })

    if (sentCount > 0) {
      setTotalEventsSent((prev) => prev + 1)
    }

    return sentCount
  }, [])

  const sendNote = useCallback(async (content: string, tags?: string[][]) => {
    // Post to API for server-side signing and relay publishing
    try {
      await fetch('/api/agent/nostr/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: KIND_NUMBER.TEXT_NOTE,
          content: content.slice(0, 4096),
          tags: tags || [],
          timestamp: Date.now(),
        }),
        keepalive: true,
      })

      const event: NostrEvent = {
        id: 'ne_' + Math.random().toString(36).slice(2, 10),
        kind: EVENT_KIND.TEXT_NOTE,
        kindNumber: KIND_NUMBER.TEXT_NOTE,
        content,
        pubkey: identity.pubkey || '',
        agentSource: null,
        timestamp: Date.now(),
        tags: tags || [],
      }
      setEventHistory((prev) => [event, ...prev].slice(0, 200))
    } catch {
      // silent
    }
  }, [identity.pubkey])

  const sendDM = useCallback(async (recipientPubkey: string, content: string) => {
    try {
      await fetch('/api/agent/nostr/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: KIND_NUMBER.DM_GIFT_WRAP,
          content: content.slice(0, 4096),
          recipientPubkey,
          encryption: DM_ENCRYPTION.NIP_17,
          timestamp: Date.now(),
        }),
        keepalive: true,
      })

      const dm: DirectMessage = {
        id: 'dm_' + Math.random().toString(36).slice(2, 10),
        from: identity.pubkey || '',
        to: recipientPubkey,
        content,
        encryption: DM_ENCRYPTION.NIP_17,
        timestamp: Date.now(),
        direction: 'SENT',
      }
      setDmHistory((prev) => [dm, ...prev].slice(0, 100))
    } catch {
      // silent
    }
  }, [identity.pubkey])

  const sendAgentAlert = useCallback(async (source: AgentSource, content: string, priority: AlertPriority) => {
    // Check route config
    const config = routeConfigs.find((r) => r.agent === source)
    if (config) {
      if (config.enabled === 'DISABLED') return
      if (config.enabled === 'URGENT_ONLY' && priority !== ALERT_PRIORITY.URGENT) return
    }

    try {
      await fetch('/api/agent/nostr/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: KIND_NUMBER.AGENT_ALERT,
          content: `[${source}] ${content}`.slice(0, 4096),
          tags: [
            ['agent', source],
            ['priority', priority],
            ['t', 'soundchain-agent-alert'],
          ],
          timestamp: Date.now(),
        }),
        keepalive: true,
      })

      const event: NostrEvent = {
        id: 'na_' + Math.random().toString(36).slice(2, 10),
        kind: EVENT_KIND.AGENT_ALERT,
        kindNumber: KIND_NUMBER.AGENT_ALERT,
        content: `[${source}] ${content}`,
        pubkey: identity.pubkey || '',
        agentSource: source,
        timestamp: Date.now(),
        tags: [['agent', source], ['priority', priority]],
      }
      setEventHistory((prev) => [event, ...prev].slice(0, 200))
    } catch {
      // silent
    }
  }, [identity.pubkey, routeConfigs])

  // ─── Location Chat ─────────────────────────────────────────────

  const joinLocationChannel = useCallback((geohash: string, precision: GeohashPrecision) => {
    const trimmed = geohash.slice(0, PRECISION_VALUES[precision] || 6)

    setActiveChannel({
      geohash: trimmed,
      precision,
      messageCount: 0,
      lastActivity: Date.now(),
      activeUsers: 0,
    })

    // Subscribe to geohash channel on connected relays
    const subId = 'geo_' + trimmed
    const filter = JSON.stringify(['REQ', subId, {
      kinds: [KIND_NUMBER.LOCATION_CHAT],
      '#g': [trimmed],
      limit: 50,
    }])

    socketsRef.current.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(filter) } catch { /* silent */ }
      }
    })
  }, [])

  const sendLocationMessage = useCallback(async (content: string) => {
    if (!activeChannel) return

    try {
      await fetch('/api/agent/nostr/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: KIND_NUMBER.LOCATION_CHAT,
          content: content.slice(0, 4096),
          tags: [
            ['g', activeChannel.geohash],
            ['t', 'soundchain-location'],
          ],
          timestamp: Date.now(),
        }),
        keepalive: true,
      })

      setActiveChannel((prev) =>
        prev ? { ...prev, messageCount: prev.messageCount + 1, lastActivity: Date.now() } : null
      )
    } catch {
      // silent
    }
  }, [activeChannel])

  // ─── Route Config ──────────────────────────────────────────────

  const setRouteEnabled = useCallback((agent: AgentSource, enabled: string) => {
    setRouteConfigs((prev) =>
      prev.map((r) => (r.agent === agent ? { ...r, enabled } : r))
    )
  }, [])

  const connectedRelayCount = relays.filter((r) => r.status === RELAY_STATUS.OPEN).length

  // ─── Auto-connect on mount ─────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check for NIP-07 extension (nos2x, Alby, etc.)
    const checkExtension = async () => {
      if ((window as any).nostr) {
        try {
          const pubkey = await (window as any).nostr.getPublicKey()
          if (pubkey) {
            setIdentity({
              pubkey,
              npub: null, // Would need bech32 encoding
              hasPrivateKey: 'EXTERNAL',
            })
          }
        } catch {
          // Extension exists but user denied
        }
      }
    }

    checkExtension()

    // Connect to default relays
    setMode(NOSTR_MODE.CONNECTING)
    for (const url of DEFAULT_RELAYS) {
      connectRelay(url)
    }

    // Report status
    const reportInterval = setInterval(() => {
      try {
        fetch('/api/agent/nostr/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode,
            connectedRelays: relays.filter((r) => r.status === RELAY_STATUS.OPEN).map((r) => r.url),
            totalEventsSent,
            totalEventsReceived,
            hasIdentity: identity.pubkey ? 'YES' : 'NO',
            timestamp: Date.now(),
          }),
          keepalive: true,
        }).catch(() => {})
      } catch {
        // silent
      }
    }, 5 * 60 * 1000)

    return () => {
      clearInterval(reportInterval)
      // Close all sockets
      socketsRef.current.forEach((ws) => { try { ws.close() } catch { /* */ } })
      socketsRef.current.clear()
      reconnectTimers.current.forEach((timer) => clearTimeout(timer))
      reconnectTimers.current.clear()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update mode based on relay connections
  useEffect(() => {
    if (connectedRelayCount > 0) {
      setMode(NOSTR_MODE.CONNECTED)
    } else if (mode === NOSTR_MODE.CONNECTED) {
      setMode(NOSTR_MODE.RECONNECTING)
    }
  }, [connectedRelayCount]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AgentNostrContext.Provider
      value={{
        mode,
        setMode,
        identity,
        relays,
        addRelay,
        removeRelay,
        connectedRelayCount,
        sendNote,
        sendDM,
        sendAgentAlert,
        joinLocationChannel,
        sendLocationMessage,
        activeChannel,
        eventHistory,
        dmHistory,
        routeConfigs,
        setRouteEnabled,
        totalEventsSent,
        totalEventsReceived,
      }}
    >
      {children}
    </AgentNostrContext.Provider>
  )
}
