/**
 * Managed Agents — Session Manager
 *
 * Orchestrates the full lifecycle of a Managed Agent session:
 * 1. Create or reuse an agent definition on Anthropic
 * 2. Create an environment (cloud container)
 * 3. Start a session
 * 4. Stream events, handling custom tool calls
 * 5. Pipe results back as SSE to FURL
 *
 * The key insight: Anthropic runs the agent loop (including built-in tools
 * like bash, file I/O, web search). We only get called back for custom tools
 * (MongoDB, OGUN contracts, IPFS, radio).
 *
 * Zero booleans.
 */

import type { NextApiResponse } from 'next'
import type Anthropic from '@anthropic-ai/sdk'
import { resolveClient } from './client'
import { getAgentDefinition } from './agents'
import { handleCustomTool } from './tool-handlers'
import { SESSION_STATUS, SSE_EVENT_TYPE, type SessionStatus } from './types'

// ─── Agent ID Cache ──────────────────────────────────────────────
// Cache created agent IDs so we don't re-create on every request.
// In-memory, global across serverless invocations (same as SMITH cache pattern).

interface CachedAgent {
  agentId: string
  version: number
  environmentId: string
  createdAt: number
}

const agentCache: Map<string, CachedAgent> = (global as any).__managedAgentCache || new Map()
if (!(global as any).__managedAgentCache) {
  ;(global as any).__managedAgentCache = agentCache
}

// ─── Create or Retrieve Agent ────────────────────────────────────

async function ensureAgent(client: Anthropic, handle: string): Promise<CachedAgent> {
  const cached = agentCache.get(handle)
  if (cached) return cached

  const def = getAgentDefinition(handle)
  if (!def) throw new Error(`No agent definition for handle: ${handle}`)

  // Build tool configs for built-in toolset
  const builtinConfigs: Array<{ name: string; enabled: boolean }> = []
  for (const name of def.builtinToolsEnabled) {
    builtinConfigs.push({ name, enabled: true })
  }
  for (const name of def.builtinToolsDisabled) {
    builtinConfigs.push({ name, enabled: false })
  }

  // Create the agent on Anthropic
  const agent = await (client.beta as any).agents.create({
    name: def.name,
    model: def.model,
    description: def.description,
    system: def.system,
    tools: [
      // Built-in toolset with per-tool config
      ...(builtinConfigs.length > 0
        ? [
            {
              type: 'agent_toolset_20260401',
              ...(def.builtinToolsDisabled.length > 0
                ? { default_config: { enabled: true }, configs: builtinConfigs }
                : { configs: builtinConfigs }),
            },
          ]
        : []),
      // Custom tools (our domain logic)
      ...def.customTools,
    ],
  })

  // Create an environment for this agent
  const environment = await (client.beta as any).environments.create({
    name: `${handle}-env`,
    config: {
      type: 'cloud',
      networking: { type: 'unrestricted' },
    },
  })

  const entry: CachedAgent = {
    agentId: agent.id,
    version: agent.version || 1,
    environmentId: environment.id,
    createdAt: Date.now(),
  }

  agentCache.set(handle, entry)
  return entry
}

// ─── Stream a Managed Agent Session ──────────────────────────────

export async function streamManagedSession(
  res: NextApiResponse,
  handle: string,
  messages: Array<{ role: string; content: string }>,
  userKey?: string,
): Promise<void> {
  // Resolve client (BYOK or platform)
  const resolved = resolveClient(userKey)
  if (!resolved) {
    return res.status(400).json({
      verdict: 'REJECTED',
      reason: 'No API key. Run: smith key sk-ant-... or set ANTHROPIC_API_KEY',
    })
  }

  const { client, keySource } = resolved

  // Set SSE headers early
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const writeSSE = (event: Record<string, unknown>) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    } catch {}
  }

  writeSSE({ type: SSE_EVENT_TYPE.START, provider: 'MANAGED_AGENT', agent: handle, keySource })

  try {
    // 1. Ensure agent exists on Anthropic
    writeSSE({ type: SSE_EVENT_TYPE.STATUS, status: SESSION_STATUS.CREATING, message: 'Creating managed agent...' })
    const { agentId, environmentId } = await ensureAgent(client, handle)

    // 2. Create session
    const session = await (client.beta as any).sessions.create({
      agent: agentId,
      environment_id: environmentId,
      title: `${handle} session ${Date.now()}`,
    })

    writeSSE({ type: SSE_EVENT_TYPE.STATUS, status: SESSION_STATUS.STREAMING, sessionId: session.id })

    // 3. Open event stream FIRST (before sending message — avoids race)
    const stream = await (client.beta as any).sessions.events.stream(session.id)

    // 4. Send the user's message(s)
    const lastMessage = messages[messages.length - 1]
    await (client.beta as any).sessions.events.send(session.id, {
      events: [
        {
          type: 'user.message',
          content: [{ type: 'text', text: lastMessage.content }],
        },
      ],
    })

    // 5. Process streaming events
    const eventsById = new Map<string, any>()

    for await (const event of stream) {
      eventsById.set(event.id, event)

      // Agent text response
      if (event.type === 'agent.message') {
        for (const block of event.content || []) {
          if (block.type === 'text') {
            writeSSE({ type: SSE_EVENT_TYPE.DELTA, text: block.text })
          }
        }
      }

      // Agent used a built-in tool (bash, file, web) — just log it
      if (event.type === 'agent.tool_use') {
        writeSSE({
          type: SSE_EVENT_TYPE.TOOL_START,
          tool: event.name,
          input: typeof event.input === 'object' ? JSON.stringify(event.input).slice(0, 200) : '',
        })
      }

      // Agent wants a custom tool — we execute it
      if (event.type === 'agent.custom_tool_use') {
        writeSSE({ type: SSE_EVENT_TYPE.TOOL_START, tool: event.name, custom: 'YES' })
      }

      // Session paused — check why
      if (event.type === 'session.status_idle') {
        const stopReason = event.stop_reason

        if (stopReason?.type === 'requires_action') {
          // Execute custom tools and send results back
          for (const eventId of stopReason.event_ids || []) {
            const toolEvent = eventsById.get(eventId)
            if (!toolEvent || toolEvent.type !== 'agent.custom_tool_use') continue

            const result = await handleCustomTool(toolEvent.name, toolEvent.input || {})
            writeSSE({
              type: SSE_EVENT_TYPE.TOOL_RESULT,
              tool: toolEvent.name,
              success: result.success,
              preview: JSON.stringify(result.data).slice(0, 200),
            })

            // Send result back to agent so it can continue
            await (client.beta as any).sessions.events.send(session.id, {
              events: [
                {
                  type: 'user.custom_tool_result',
                  custom_tool_use_id: eventId,
                  content: [{ type: 'text', text: JSON.stringify(result) }],
                },
              ],
            })
          }
        } else if (stopReason?.type === 'end_turn') {
          // Agent finished its task
          writeSSE({ type: SSE_EVENT_TYPE.DONE })
          break
        } else if (stopReason?.type === 'max_turns') {
          writeSSE({ type: SSE_EVENT_TYPE.DONE, reason: 'max_turns' })
          break
        }
      }

      // Session terminated
      if (event.type === 'session.status_terminated') {
        writeSSE({ type: SSE_EVENT_TYPE.ERROR, text: 'Session terminated unexpectedly' })
        break
      }
    }
  } catch (err: any) {
    writeSSE({
      type: SSE_EVENT_TYPE.ERROR,
      text: err.message || 'Managed agent session failed',
    })
  }

  res.end()
}

// ─── Get Cached Agent Info ───────────────────────────────────────

export function getCachedAgents(): Array<{ handle: string; agentId: string; version: number; createdAt: number }> {
  const result: Array<{ handle: string; agentId: string; version: number; createdAt: number }> = []
  agentCache.forEach((value, key) => {
    result.push({ handle: key, ...value })
  })
  return result
}

export function clearAgentCache(): void {
  agentCache.clear()
}
