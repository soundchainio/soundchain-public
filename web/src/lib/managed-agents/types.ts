/**
 * Managed Agents — Type Definitions
 *
 * Covers agent configs, session state, custom tool schemas,
 * and SSE event types for FURL ↔ Managed Agent communication.
 *
 * Zero booleans.
 */

// ─── Agent Identity ──────────────────────────────────────────────

export const AGENT_ROLE = {
  ORCHESTRATOR: 'ORCHESTRATOR',
  FEATURE: 'FEATURE',
  UTILITY: 'UTILITY',
  SOCIAL: 'SOCIAL',
} as const

export type AgentRole = typeof AGENT_ROLE[keyof typeof AGENT_ROLE]

export interface AgentDefinition {
  name: string
  handle: string
  model: string
  role: AgentRole
  system: string
  description: string
  customTools: readonly CustomToolDefinition[]
  builtinToolsEnabled: string[]
  builtinToolsDisabled: string[]
}

// ─── Custom Tools ────────────────────────────────────────────────

export interface CustomToolDefinition {
  type: 'custom'
  name: string
  description: string
  input_schema: Record<string, unknown>
}

// ─── Session State ───────────────────────────────────────────────

export const SESSION_STATUS = {
  CREATING: 'CREATING',
  STREAMING: 'STREAMING',
  IDLE: 'IDLE',
  TOOL_CALL: 'TOOL_CALL',
  DONE: 'DONE',
  ERROR: 'ERROR',
} as const

export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS]

export interface ManagedSession {
  sessionId: string
  agentId: string
  agentName: string
  status: SessionStatus
  createdAt: number
}

// ─── SSE Events (FURL ↔ Server) ─────────────────────────────────

export const SSE_EVENT_TYPE = {
  START: 'start',
  DELTA: 'delta',
  TOOL_START: 'tool_start',
  TOOL_RESULT: 'tool_result',
  STATUS: 'status',
  DONE: 'done',
  ERROR: 'error',
} as const

export interface SSEEvent {
  type: string
  [key: string]: unknown
}

// ─── Custom Tool Result ──────────────────────────────────────────

export interface CustomToolResult {
  success: string // 'YES' | 'NO' — zero booleans
  data: unknown
  error?: string
}
