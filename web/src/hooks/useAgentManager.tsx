/**
 * Agent MANAGER — Orchestrates All 15 Agents
 * The conductor. Monitors, coordinates, prioritizes the entire agent suite.
 * Wraps all other agents as the single entry point in _app.tsx.
 * Powered by OGUN.
 *
 * ZERO BOOLEANS — all state uses typed string enums.
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

// Import all agent providers
import { AgentEyeProvider } from './useAgentEye'
import { AgentDesignerProvider } from './useAgentDesigner'
import { AgentSocialProvider } from './useAgentSocial'
import { AgentVideoProvider } from './useAgentVideo'
import { AgentMusicProvider } from './useAgentMusic'
import { AgentArtProvider } from './useAgentArt'
import { AgentGamerProvider } from './useAgentGamer'
import { AgentArcadeProvider } from './useAgentArcade'
import { AgentAdminProvider } from './useAgentAdmin'
import { AgentMarkoProvider } from './useAgentMarko'
import { AgentForgeProvider } from './useAgentForge'
import { AgentWhatsAppProvider } from './useAgentWhatsApp'
import { AgentNostrProvider } from './useAgentNostr'
import { AgentSMSProvider } from './useAgentSMS'

// ─── Enums ───────────────────────────────────────────────────────────

export const MANAGER_MODE = {
  ORCHESTRATING: 'ORCHESTRATING',
  MONITORING: 'MONITORING',
  MAINTENANCE: 'MAINTENANCE',
  IDLE: 'IDLE',
} as const
export type ManagerMode = typeof MANAGER_MODE[keyof typeof MANAGER_MODE]

export const AGENT_NAME = {
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
  SMS: 'SMS',
} as const
export type AgentName = typeof AGENT_NAME[keyof typeof AGENT_NAME]

export const AGENT_STATUS = {
  ACTIVE: 'ACTIVE',
  IDLE: 'IDLE',
  ERROR: 'ERROR',
  DISABLED: 'DISABLED',
} as const
export type AgentStatus = typeof AGENT_STATUS[keyof typeof AGENT_STATUS]

export const PRIORITY_LEVEL = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  NORMAL: 'NORMAL',
  LOW: 'LOW',
  BACKGROUND: 'BACKGROUND',
} as const
export type PriorityLevel = typeof PRIORITY_LEVEL[keyof typeof PRIORITY_LEVEL]

// ─── Types ───────────────────────────────────────────────────────────

export interface AgentInfo {
  name: AgentName
  status: AgentStatus
  priority: PriorityLevel
  description: string
  lastActivity: number
  taskCount: number
  ogunConsumed: number
}

interface AgentManagerContextValue {
  mode: ManagerMode
  setMode: (mode: ManagerMode) => void
  agents: AgentInfo[]
  getAgent: (name: AgentName) => AgentInfo | undefined
  setAgentStatus: (name: AgentName, status: AgentStatus) => void
  setAgentPriority: (name: AgentName, priority: PriorityLevel) => void
  activeAgentCount: number
  totalOgunConsumed: number
  suiteVersion: string
}

// ─── Default Agent Registry ──────────────────────────────────────────

const INITIAL_AGENTS: AgentInfo[] = [
  { name: AGENT_NAME.EYE, status: AGENT_STATUS.ACTIVE, priority: PRIORITY_LEVEL.HIGH, description: 'Bug catcher, error tracking', lastActivity: Date.now(), taskCount: 0, ogunConsumed: 0 },
  { name: AGENT_NAME.DESIGNER, status: AGENT_STATUS.IDLE, priority: PRIORITY_LEVEL.NORMAL, description: 'Custom pages, layouts, themes', lastActivity: 0, taskCount: 0, ogunConsumed: 0 },
  { name: AGENT_NAME.SOCIAL, status: AGENT_STATUS.IDLE, priority: PRIORITY_LEVEL.NORMAL, description: 'Engagement, scheduling, analytics', lastActivity: 0, taskCount: 0, ogunConsumed: 0 },
  { name: AGENT_NAME.VIDEO, status: AGENT_STATUS.IDLE, priority: PRIORITY_LEVEL.NORMAL, description: 'Clip editing, thumbnails, reels', lastActivity: 0, taskCount: 0, ogunConsumed: 0 },
  { name: AGENT_NAME.MUSIC, status: AGENT_STATUS.IDLE, priority: PRIORITY_LEVEL.NORMAL, description: 'Beat matching, playlists, stems', lastActivity: 0, taskCount: 0, ogunConsumed: 0 },
  { name: AGENT_NAME.ART, status: AGENT_STATUS.IDLE, priority: PRIORITY_LEVEL.NORMAL, description: 'Generative covers, NFT visuals', lastActivity: 0, taskCount: 0, ogunConsumed: 0 },
  { name: AGENT_NAME.GAMER, status: AGENT_STATUS.IDLE, priority: PRIORITY_LEVEL.NORMAL, description: 'Code-gen game building', lastActivity: 0, taskCount: 0, ogunConsumed: 0 },
  { name: AGENT_NAME.ARCADE, status: AGENT_STATUS.IDLE, priority: PRIORITY_LEVEL.NORMAL, description: 'Play games, leaderboards, tournaments', lastActivity: 0, taskCount: 0, ogunConsumed: 0 },
  { name: AGENT_NAME.MANAGER, status: AGENT_STATUS.ACTIVE, priority: PRIORITY_LEVEL.CRITICAL, description: 'Orchestrates all agents', lastActivity: Date.now(), taskCount: 0, ogunConsumed: 0 },
  { name: AGENT_NAME.ADMIN, status: AGENT_STATUS.IDLE, priority: PRIORITY_LEVEL.HIGH, description: 'Account, profile, settings', lastActivity: 0, taskCount: 0, ogunConsumed: 0 },
  { name: AGENT_NAME.MARKO, status: AGENT_STATUS.ACTIVE, priority: PRIORITY_LEVEL.HIGH, description: 'Markets, crypto, headlines — never sleeps', lastActivity: Date.now(), taskCount: 0, ogunConsumed: 0 },
  { name: AGENT_NAME.FORGE, status: AGENT_STATUS.IDLE, priority: PRIORITY_LEVEL.NORMAL, description: 'Source code search engine — scans every open source repo on Earth', lastActivity: 0, taskCount: 0, ogunConsumed: 0 },
  { name: AGENT_NAME.WHATSAPP, status: AGENT_STATUS.IDLE, priority: PRIORITY_LEVEL.HIGH, description: 'Real-time messaging bridge — syncs agents, Wall, Feed, DMs to WhatsApp', lastActivity: 0, taskCount: 0, ogunConsumed: 0 },
  { name: AGENT_NAME.NOSTR, status: AGENT_STATUS.ACTIVE, priority: PRIORITY_LEVEL.HIGH, description: 'Decentralized messaging — NIP-17 DMs, location chat, relay network. FREE FOREVER.', lastActivity: Date.now(), taskCount: 0, ogunConsumed: 0 },
  { name: AGENT_NAME.SMS, status: AGENT_STATUS.IDLE, priority: PRIORITY_LEVEL.NORMAL, description: 'Provider-agnostic SMS gateway — Twilio, AWS SNS, Vonage, Plivo. Last-resort channel.', lastActivity: 0, taskCount: 0, ogunConsumed: 0 },
]

// ─── Context ─────────────────────────────────────────────────────────

const AgentManagerContext = createContext<AgentManagerContextValue>({
  mode: MANAGER_MODE.ORCHESTRATING,
  setMode: () => {},
  agents: INITIAL_AGENTS,
  getAgent: () => undefined,
  setAgentStatus: () => {},
  setAgentPriority: () => {},
  activeAgentCount: 3,
  totalOgunConsumed: 0,
  suiteVersion: '1.0.0',
})

export const useAgentManager = () => useContext(AgentManagerContext)

// ─── Provider (wraps ALL agent providers) ────────────────────────────

export function AgentManagerProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ManagerMode>(MANAGER_MODE.ORCHESTRATING)
  const [agents, setAgents] = useState<AgentInfo[]>(INITIAL_AGENTS)

  const getAgent = useCallback(
    (name: AgentName) => agents.find((a) => a.name === name),
    [agents]
  )

  const setAgentStatus = useCallback((name: AgentName, status: AgentStatus) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.name === name ? { ...a, status, lastActivity: Date.now() } : a
      )
    )
  }, [])

  const setAgentPriority = useCallback((name: AgentName, priority: PriorityLevel) => {
    setAgents((prev) =>
      prev.map((a) => (a.name === name ? { ...a, priority } : a))
    )
  }, [])

  const activeAgentCount = agents.filter((a) => a.status === AGENT_STATUS.ACTIVE).length
  const totalOgunConsumed = agents.reduce((sum, a) => sum + a.ogunConsumed, 0)

  // Report suite status to /api/agent/manager/status every 5 minutes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const reportStatus = () => {
      try {
        fetch('/api/agent/manager/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode,
            agents: agents.map((a) => ({ name: a.name, status: a.status, priority: a.priority })),
            activeCount: activeAgentCount,
            timestamp: Date.now(),
          }),
          keepalive: true,
        }).catch(() => {})
      } catch {
        // silent
      }
    }

    reportStatus()
    const interval = setInterval(reportStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [mode, agents, activeAgentCount])

  return (
    <AgentManagerContext.Provider
      value={{
        mode, setMode, agents, getAgent, setAgentStatus, setAgentPriority,
        activeAgentCount, totalOgunConsumed, suiteVersion: '1.0.0',
      }}
    >
      <AgentEyeProvider>
        <AgentDesignerProvider>
          <AgentSocialProvider>
            <AgentVideoProvider>
              <AgentMusicProvider>
                <AgentArtProvider>
                  <AgentGamerProvider>
                    <AgentArcadeProvider>
                      <AgentAdminProvider>
                        <AgentMarkoProvider>
                          <AgentForgeProvider>
                            <AgentWhatsAppProvider>
                              <AgentNostrProvider>
                                <AgentSMSProvider>
                                  {children}
                                </AgentSMSProvider>
                              </AgentNostrProvider>
                            </AgentWhatsAppProvider>
                          </AgentForgeProvider>
                        </AgentMarkoProvider>
                      </AgentAdminProvider>
                    </AgentArcadeProvider>
                  </AgentGamerProvider>
                </AgentArtProvider>
              </AgentMusicProvider>
            </AgentVideoProvider>
          </AgentSocialProvider>
        </AgentDesignerProvider>
      </AgentEyeProvider>
    </AgentManagerContext.Provider>
  )
}
