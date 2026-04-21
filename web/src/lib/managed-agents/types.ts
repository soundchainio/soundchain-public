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

// ─── Memory Backend — where a user's agent diary lives ──────────

export const MEMORY_BACKEND = {
  LOCAL_DEVICE: 'LOCAL_DEVICE',     // Client-side localStorage/IndexedDB. Server emits intents; client persists.
  CLOUD_MONGO: 'CLOUD_MONGO',       // SoundChain's Atlas (agent_memories collection). Fast, centralized.
  NOSTR: 'NOSTR',                   // NIP-44 self-encrypted events published to Nostr relays. Max sovereignty.
  BYOM: 'BYOM',                     // Bring Your Own Mongo — user points at their own cluster.
} as const

export type MemoryBackend = typeof MEMORY_BACKEND[keyof typeof MEMORY_BACKEND]

// ─── Memory Intent — server → client instruction for LOCAL_DEVICE users ───

export const MEMORY_INTENT_ACTION = {
  WRITE: 'WRITE',                         // Client persists this row to localStorage
  UPSERT_OBSERVATION: 'UPSERT_OBSERVATION', // Client upserts (dedup by postId) observed post
} as const

export type MemoryIntentAction = typeof MEMORY_INTENT_ACTION[keyof typeof MEMORY_INTENT_ACTION]

export interface MemoryIntent {
  action: MemoryIntentAction
  agentHandle: string
  row: Record<string, unknown>
}

// ─── Tool Execution Context — per-session state passed to handlers ───

export interface ToolContext {
  agentHandle?: string
  userId?: string
  backend?: MemoryBackend               // resolved once per session
  localMemory?: MemoryRow[]             // passed in request body by client, used by memory_read when backend=LOCAL_DEVICE
  emit?: (event: Record<string, unknown>) => void  // SSE write callback, used to emit memory_intent events
}

export interface MemoryRow {
  agentHandle: string
  userId?: string
  kind: 'OBSERVED_POST' | 'NOTE' | 'REFLECTION'
  content: string
  postId?: string
  source?: string
  authorHandle?: string | null
  authorDisplayName?: string | null
  link?: string | null
  wallOwnerHandle?: string | null
  postUrl?: string
  tags?: string[]
  firstSeenAt?: Date | string
  lastSeenAt?: Date | string
  createdAt?: Date | string
  seenCount?: number
}
