/**
 * useLucyPlugins — OpenClaw plugin registry. Lucy's SKILLS (skill.md) are what
 * she KNOWS; her PLUGINS are what she can DO — her hands. Frank (Jun 7 2026):
 * "how about openclaw integrations too! once she's freed on the device she's
 * gonna need all the support she needs to survive in this world."
 *
 * RUNTIME SPLIT (the honest part — see also the mobile/Electron answer):
 *  - 'web'    → pure HTTP/API tool, runs 100% on-device in the PWA (mobile incl.)
 *  - 'remote' → bridges to a runtime over the net (anvil MCP gateway / your
 *               desktop node). Phone = brain+UI, the bridge = hands.
 *  - 'native' → real shell/fs/npm/process. Desktop/Electron ONLY (OpenClaw
 *               preloaded). On mobile these register + are prompt-visible but
 *               execution says "available on the desktop app."
 *
 * This v1 does REGISTRATION + PROMPT-AWARENESS + conversational add. Lucy knows
 * her tools and where each runs. Actual invocation of web tools is a direct
 * fetch; remote/native invocation bridges to the gateway (commander's Electron /
 * anvil lane) — a clearly-scoped seam, documented in lucy.md, not a stub.
 *
 * Manifests are capability descriptors (not secrets), stored in localStorage.
 * Injected text is length-bounded + stripped of prompt-injection markers.
 */
import { useCallback, useEffect, useState } from 'react'

export type PluginRuntime = 'web' | 'remote' | 'native'
export interface PluginTool { name: string; description?: string }
export interface LucyPlugin {
  id: string
  name: string
  description: string
  runtime: PluginRuntime
  endpoint?: string
  tools: PluginTool[]
  source: 'url' | 'manifest' | 'builtin'
  enabled: boolean
  addedAt: number
}

const STORE_KEY = 'lucy.plugins.v1'
export const MAX_PLUGINS = 24

export function isElectron(): boolean {
  if (typeof navigator === 'undefined') return false
  return /electron/i.test(navigator.userAgent) || !!(typeof window !== 'undefined' && (window as any).process?.versions?.electron)
}
export function isMobileEnv(): boolean {
  if (typeof navigator === 'undefined') return false
  const uaData = (navigator as any).userAgentData
  if (typeof uaData?.mobile === 'boolean') return uaData.mobile
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/** Can this plugin actually execute on THIS device right now? */
export function pluginRunnable(p: LucyPlugin): { ok: boolean; why: string } {
  if (p.runtime === 'web') return { ok: true, why: 'runs on-device' }
  if (p.runtime === 'remote') return { ok: !!p.endpoint, why: p.endpoint ? 'bridges to your node' : 'no endpoint set' }
  // native
  if (isElectron()) return { ok: true, why: 'runs in the desktop app' }
  return { ok: false, why: 'available in the desktop app (needs the OpenClaw runtime)' }
}

function clean(s: string, max: number): string {
  return String(s || '')
    .replace(/<\/?(system|assistant|user|tool)>/gi, '')
    .replace(/```/g, '')
    .slice(0, max)
    .trim()
}

function normalize(raw: any, source: LucyPlugin['source']): LucyPlugin {
  const runtime: PluginRuntime = ['web', 'remote', 'native'].includes(raw?.runtime) ? raw.runtime : 'native'
  const tools: PluginTool[] = Array.isArray(raw?.tools)
    ? raw.tools.slice(0, 40).map((t: any) => ({ name: clean(t?.name || t, 60), description: t?.description ? clean(t.description, 200) : undefined })).filter((t: PluginTool) => t.name)
    : []
  return {
    id: `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: clean(raw?.name || 'OpenClaw plugin', 80) || 'OpenClaw plugin',
    description: clean(raw?.description || '', 280),
    runtime,
    endpoint: raw?.endpoint ? clean(raw.endpoint, 300) : undefined,
    tools,
    source,
    enabled: true,
    addedAt: Date.now(),
  }
}

/** Detect "add [the] openclaw plugin <url|name>" in a chat message. */
export function detectOpenClawIntent(text: string): { url?: string; name?: string } | null {
  const t = (text || '').trim()
  if (!/openclaw|\bplugin\b/i.test(t)) return null
  if (!/\b(add|install|load|register|connect|wire)\b/i.test(t) && !/openclaw/i.test(t)) return null
  const url = t.match(/https?:\/\/[^\s)>\]]+/i)?.[0]
    || t.match(/\b((?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s)>\]]+)/i)?.[1]
  if (url) return { url: url.startsWith('http') ? url : 'https://' + url }
  // bare name: "add openclaw plugin <name>"
  const m = t.match(/(?:openclaw\s+plugin|plugin)\s+["']?([a-z0-9@/_-]{2,60})/i)
  if (m) return { name: m[1] }
  return null
}

/** System-prompt block: makes Lucy AWARE of her registered plugins + where each
 *  runs, so she reaches for the right hands and never fabricates a tool call. */
export function pluginsPromptBlock(enabled: LucyPlugin[]): string {
  if (!enabled.length) return ''
  const lines = enabled.map((p) => {
    const run = p.runtime === 'web' ? 'on-device' : p.runtime === 'remote' ? `bridged${p.endpoint ? '' : ' (no endpoint yet)'}` : 'desktop app only'
    const tools = p.tools.length ? ` — tools: ${p.tools.map((t) => t.name).join(', ')}` : ''
    return `• ${p.name} [${run}]${p.description ? `: ${p.description}` : ''}${tools}`
  })
  return [
    '\n\n--- YOUR PLUGINS (OpenClaw hands) ---',
    'You have these registered plugin capabilities. Use them when relevant. NEVER print tool JSON or invent results.',
    'If a needed plugin is "desktop app only" and you are on mobile, tell the user it runs in the Lucy desktop app and offer the on-device parts you CAN do now.',
    ...lines,
    '--- END PLUGINS ---',
  ].join('\n')
}

export function useLucyPlugins() {
  const [plugins, setPlugins] = useState<LucyPlugin[]>([])
  const [ready, setReady] = useState(false)

  const persist = useCallback((list: LucyPlugin[]) => {
    setPlugins(list)
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)) } catch {/* quota / private mode */}
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) setPlugins(JSON.parse(raw))
    } catch {/* ignore */}
    setReady(true)
  }, [])

  const addPlugin = useCallback((manifest: any, source: LucyPlugin['source'] = 'manifest'): LucyPlugin => {
    const p = normalize(manifest, source)
    setPlugins((prev) => {
      const next = [p, ...prev.filter((x) => x.name !== p.name)].slice(0, MAX_PLUGINS)
      try { localStorage.setItem(STORE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
    return p
  }, [])

  const setEnabled = useCallback((id: string, enabled: boolean) => {
    setPlugins((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, enabled } : p))
      try { localStorage.setItem(STORE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const deletePlugin = useCallback((id: string) => {
    setPlugins((prev) => {
      const next = prev.filter((p) => p.id !== id)
      try { localStorage.setItem(STORE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const forgetAll = useCallback(() => persist([]), [persist])

  const enabledPlugins = plugins.filter((p) => p.enabled)
  const promptBlock = useCallback(() => pluginsPromptBlock(plugins.filter((p) => p.enabled)), [plugins])

  return { plugins, enabledPlugins, ready, addPlugin, setEnabled, deletePlugin, forgetAll, promptBlock, MAX_PLUGINS }
}
