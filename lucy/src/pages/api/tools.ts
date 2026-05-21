/**
 * Lucy's tool schema — Phase 13 of the Lucy stack.
 *
 * Maps llama3.1's tool-calling spec to SoundChain's existing agent gateway
 * endpoints (web/public/skill.md). When Lucy emits a tool_call, the
 * dispatcher below executes it and returns a structured result Lucy can
 * weave into her next response.
 *
 * llama3.1 supports OpenAI-style function calling natively. Ollama exposes
 * it via the `tools` param on /api/chat. We define the tools once; Lucy
 * decides when to call them based on the user's question.
 *
 * Tool design rules:
 *  - READ tools are unconditional. WRITE tools (post to feed, transfer
 *    OGUN, etc.) are gated behind explicit user confirmation in the
 *    chat — Lucy must ASK before doing anything that mutates state.
 *  - Tool results are JSON-serializable, truncated to ~2000 chars to
 *    keep context lean.
 *  - Errors are returned as `{ error: "..." }` so Lucy can recover
 *    gracefully ("I couldn't fetch that — can you try again?").
 *
 * Origin for SC agent calls is the same web app — internal fetch loop.
 * If/when SC has rate limits on agent endpoints, this becomes the
 * single rate-limited consumer instead of having Lucy hammer them
 * blindly from the model side.
 */
import type { NextApiRequest } from 'next'

export interface OllamaTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, { type: string; description: string; enum?: string[] }>
      required?: string[]
    }
  }
}

export const LUCY_TOOLS: OllamaTool[] = [
  {
    type: 'function',
    function: {
      name: 'sc_radio_now_playing',
      description: 'Get what is currently broadcasting on OGUN Radio (SoundChain\'s automated NFT music broadcast). Use when the user asks about current music, what\'s playing, or radio status.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sc_feed_recent',
      description: 'Get the most recent posts from SoundChain\'s public feed. Use when the user asks "what\'s happening on SoundChain", "show me the feed", "what are people posting".',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'How many posts to fetch (1-20, default 10)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sc_tracks_search',
      description: 'Search SoundChain\'s music catalog by title, artist, or keyword. Returns matching tracks with metadata.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search keyword — track title, artist name, or genre' },
          limit: { type: 'number', description: 'Max results (1-20, default 10)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sc_trending',
      description: 'Get currently trending content on SoundChain (top tracks, artists, posts by recent activity).',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sc_top_tracks',
      description: 'Get the all-time top tracks on SoundChain by stream count.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'How many to fetch (1-25, default 10)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sc_stats',
      description: 'Get global SoundChain platform statistics — total tracks, users, OGUN distributed, etc.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sc_user_profile',
      description: 'Look up a SoundChain user\'s public profile by handle. Returns bio, follower count, track count.',
      parameters: {
        type: 'object',
        properties: {
          handle: { type: 'string', description: 'The user\'s @handle, without the @ symbol' },
        },
        required: ['handle'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sc_discover',
      description: 'Get a curated random discovery feed of SoundChain content — surfaces things the user might not have seen.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sc_post_to_feed',
      description: 'Post a public message to the user\'s SoundChain feed AS the user. THIS IS A WRITE ACTION — handle carefully. Two-step ceremony: FIRST call without confirmed=true to show the user a preview of what you intend to post and ask them to confirm in plain English. ONLY after the user explicitly confirms (e.g. "yes post it", "go ahead", "do it") should you call again with confirmed=true to actually post. Never assume confirmation. If the user dictates a post out loud, propose it back to them first, even if they said "post X to my feed" — they may want to tweak it.',
      parameters: {
        type: 'object',
        properties: {
          body: { type: 'string', description: 'The post text. Keep concise — feed posts are public and brief.' },
          confirmed: { type: 'boolean', description: 'Must be true to actually post. Default false = preview only — returns the proposed post for the user to approve.' },
        },
        required: ['body'],
      },
    },
  },
]

/** Origin for internal agent-endpoint calls. Vercel function calling itself. */
function originFromReq(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-proto']
  const proto = (Array.isArray(forwarded) ? forwarded[0] : forwarded) || 'https'
  const host = req.headers.host || 'soundchain.io'
  return `${proto}://${host}`
}

/** Truncate a stringified result to keep token cost sane. */
function truncate(s: string, max = 2000): string {
  if (s.length <= max) return s
  return s.slice(0, max) + `\n…[truncated ${s.length - max} chars]`
}

/**
 * Execute a tool call. Returns a string Lucy can ingest as a tool-role
 * message. Catches all errors so a failing tool never crashes the chat
 * loop — Lucy can read the error and try a different approach.
 *
 * Phase 13.2 — also handles WRITE tools with confirmation gates. Write
 * tools require `confirmed: true` arg before any actual mutation; without
 * it, returns a preview the user must explicitly approve in chat.
 */
export async function executeToolCall(
  req: NextApiRequest,
  name: string,
  args: Record<string, any>
): Promise<string> {
  const origin = originFromReq(req)
  const ctl = new AbortController()
  const timeout = setTimeout(() => ctl.abort(), 10_000)
  try {
    // ─── WRITE TOOLS — confirmation-gated ───
    if (name === 'sc_post_to_feed') {
      const body = String(args?.body || '').trim()
      if (!body) return JSON.stringify({ error: 'body parameter required' })
      if (!args?.confirmed) {
        // Preview-only — Lucy must show this to the user and wait for an
        // explicit "yes" before calling again with confirmed:true.
        return JSON.stringify({
          status: 'preview',
          message: `PREVIEW (not posted yet): "${body}"`,
          instruction: 'Show this preview to the user and ask them to confirm in plain English (e.g. "yes post it"). Only call sc_post_to_feed again with confirmed:true after they explicitly approve.',
        })
      }
      // Forward the user's auth cookie so /api/feed/create writes as them
      const cookieHeader = req.headers.cookie || ''
      const r = await fetch(`${origin}/api/feed/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({ body }),
        signal: ctl.signal,
      })
      if (!r.ok) {
        const text = await r.text().catch(() => '')
        return JSON.stringify({ error: `post failed: ${r.status}`, detail: text.slice(0, 300) })
      }
      const data = await r.json().catch(() => ({}))
      return JSON.stringify({
        status: 'posted',
        message: `Successfully posted "${body}" to the feed.`,
        post: data,
      })
    }

    // ─── READ TOOLS — no confirmation needed ───
    let url = ''
    let result: any = null
    switch (name) {
      case 'sc_radio_now_playing':
        url = `${origin}/api/agent/radio`
        break
      case 'sc_feed_recent': {
        const limit = Math.max(1, Math.min(20, Number(args?.limit) || 10))
        url = `${origin}/api/agent/feed?limit=${limit}`
        break
      }
      case 'sc_tracks_search': {
        const q = String(args?.query || '').trim()
        if (!q) return JSON.stringify({ error: 'query parameter required' })
        const limit = Math.max(1, Math.min(20, Number(args?.limit) || 10))
        url = `${origin}/api/agent/tracks?q=${encodeURIComponent(q)}&limit=${limit}`
        break
      }
      case 'sc_trending':
        url = `${origin}/api/agent/trending`
        break
      case 'sc_top_tracks': {
        const limit = Math.max(1, Math.min(25, Number(args?.limit) || 10))
        url = `${origin}/api/agent/tracks?sort=top&limit=${limit}`
        break
      }
      case 'sc_stats':
        url = `${origin}/api/agent/stats`
        break
      case 'sc_user_profile': {
        const handle = String(args?.handle || '').trim().replace(/^@/, '')
        if (!handle) return JSON.stringify({ error: 'handle parameter required' })
        url = `${origin}/api/agent/profile/${encodeURIComponent(handle)}`
        break
      }
      case 'sc_discover':
        url = `${origin}/api/agent/discover`
        break
      default:
        return JSON.stringify({ error: `unknown tool: ${name}` })
    }

    const r = await fetch(url, { signal: ctl.signal })
    if (!r.ok) {
      return JSON.stringify({ error: `tool returned ${r.status}`, tool: name })
    }
    result = await r.json().catch(() => ({ error: 'invalid JSON from tool' }))
    return truncate(JSON.stringify(result))
  } catch (err: any) {
    return JSON.stringify({
      error: err?.name === 'AbortError' ? 'tool timed out' : err?.message || 'tool execution failed',
      tool: name,
    })
  } finally {
    clearTimeout(timeout)
  }
}
