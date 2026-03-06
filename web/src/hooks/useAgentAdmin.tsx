/**
 * Agent ADMIN — Account/User/Profile Page Agent
 * The control panel. Manages user settings, profile, preferences, permissions.
 * Powered by OGUN.
 *
 * ZERO BOOLEANS — all state uses typed string enums.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// ─── Enums ───────────────────────────────────────────────────────────

export const ADMIN_MODE = {
  DASHBOARD: 'DASHBOARD',
  SETTINGS: 'SETTINGS',
  SECURITY: 'SECURITY',
  BILLING: 'BILLING',
  IDLE: 'IDLE',
} as const
export type AdminMode = typeof ADMIN_MODE[keyof typeof ADMIN_MODE]

export const PERMISSION_LEVEL = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
} as const
export type PermissionLevel = typeof PERMISSION_LEVEL[keyof typeof PERMISSION_LEVEL]

export const NOTIFICATION_CHANNEL = {
  WEB_PUSH: 'WEB_PUSH',
  NOSTR: 'NOSTR',
  EMAIL: 'EMAIL',
  IN_APP: 'IN_APP',
  WHATSAPP: 'WHATSAPP',
} as const
export type NotificationChannel = typeof NOTIFICATION_CHANNEL[keyof typeof NOTIFICATION_CHANNEL]

export const PROFILE_VISIBILITY = {
  PUBLIC: 'PUBLIC',
  FOLLOWERS_ONLY: 'FOLLOWERS_ONLY',
  PRIVATE: 'PRIVATE',
} as const
export type ProfileVisibility = typeof PROFILE_VISIBILITY[keyof typeof PROFILE_VISIBILITY]

export const AGENT_PERMISSION = {
  FULL_ACCESS: 'FULL_ACCESS',
  READ_ONLY: 'READ_ONLY',
  DISABLED: 'DISABLED',
  CUSTOM: 'CUSTOM',
} as const
export type AgentPermission = typeof AGENT_PERMISSION[keyof typeof AGENT_PERMISSION]

// ─── Types ───────────────────────────────────────────────────────────

export interface AgentPermissions {
  eye: AgentPermission
  designer: AgentPermission
  social: AgentPermission
  video: AgentPermission
  music: AgentPermission
  art: AgentPermission
  gamer: AgentPermission
  arcade: AgentPermission
  marko: AgentPermission
}

export interface UserPreferences {
  theme: string
  visibility: ProfileVisibility
  notifications: NotificationChannel[]
  agentPermissions: AgentPermissions
  ogunAutoStake: string // 'ENABLED' | 'DISABLED'
  language: string
}

interface AgentAdminContextValue {
  mode: AdminMode
  setMode: (mode: AdminMode) => void
  preferences: UserPreferences
  updatePreference: (key: keyof UserPreferences, value: unknown) => void
  setAgentPermission: (agent: keyof AgentPermissions, permission: AgentPermission) => void
  permissionLevel: PermissionLevel
}

// ─── Defaults ────────────────────────────────────────────────────────

const DEFAULT_AGENT_PERMISSIONS: AgentPermissions = {
  eye: AGENT_PERMISSION.FULL_ACCESS,
  designer: AGENT_PERMISSION.FULL_ACCESS,
  social: AGENT_PERMISSION.FULL_ACCESS,
  video: AGENT_PERMISSION.FULL_ACCESS,
  music: AGENT_PERMISSION.FULL_ACCESS,
  art: AGENT_PERMISSION.FULL_ACCESS,
  gamer: AGENT_PERMISSION.FULL_ACCESS,
  arcade: AGENT_PERMISSION.FULL_ACCESS,
  marko: AGENT_PERMISSION.READ_ONLY,
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'CYBERPUNK',
  visibility: PROFILE_VISIBILITY.PUBLIC,
  notifications: [NOTIFICATION_CHANNEL.WEB_PUSH, NOTIFICATION_CHANNEL.IN_APP],
  agentPermissions: DEFAULT_AGENT_PERMISSIONS,
  ogunAutoStake: 'DISABLED',
  language: 'en',
}

// ─── Context ─────────────────────────────────────────────────────────

const AgentAdminContext = createContext<AgentAdminContextValue>({
  mode: ADMIN_MODE.IDLE,
  setMode: () => {},
  preferences: DEFAULT_PREFERENCES,
  updatePreference: () => {},
  setAgentPermission: () => {},
  permissionLevel: PERMISSION_LEVEL.OWNER,
})

export const useAgentAdmin = () => useContext(AgentAdminContext)

// ─── Provider ────────────────────────────────────────────────────────

export function AgentAdminProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AdminMode>(ADMIN_MODE.IDLE)
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [permissionLevel] = useState<PermissionLevel>(PERMISSION_LEVEL.OWNER)

  const updatePreference = useCallback((key: keyof UserPreferences, value: unknown) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }, [])

  const setAgentPermission = useCallback((agent: keyof AgentPermissions, permission: AgentPermission) => {
    setPreferences((prev) => ({
      ...prev,
      agentPermissions: { ...prev.agentPermissions, [agent]: permission },
    }))
  }, [])

  return (
    <AgentAdminContext.Provider
      value={{ mode, setMode, preferences, updatePreference, setAgentPermission, permissionLevel }}
    >
      {children}
    </AgentAdminContext.Provider>
  )
}
