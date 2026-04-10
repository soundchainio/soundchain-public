/**
 * Managed Agents — Public API
 *
 * Usage:
 *   import { streamManagedSession, AGENT_REGISTRY } from 'lib/managed-agents'
 *
 * Zero booleans.
 */

export { resolveClient, KEY_SOURCE } from './client'
export { AGENT_REGISTRY, getAgentDefinition, getAllAgentHandles } from './agents'
export { ALL_CUSTOM_TOOLS, TOOLS_BY_ROLE } from './tools'
export { handleCustomTool } from './tool-handlers'
export { streamManagedSession, getCachedAgents, clearAgentCache } from './session'
export {
  AGENT_ROLE,
  SESSION_STATUS,
  SSE_EVENT_TYPE,
  type AgentDefinition,
  type ManagedSession,
  type SessionStatus,
  type CustomToolResult,
} from './types'
