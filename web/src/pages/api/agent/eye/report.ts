/**
 * Agent Eye — Bug Report Receiver
 * POST /api/agent/eye/report
 *
 * Receives bug reports from useAgentEye hook running in every visitor's browser.
 * Stores in in-memory circular buffer (200 max, 1hr TTL).
 * Zero booleans — all validation uses typed string enum checks.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// ─── Enums ───────────────────────────────────────────────────────────

const TRIGGER_KIND = {
  JS_ERROR: 'JS_ERROR',
  UNHANDLED_REJECTION: 'UNHANDLED_REJECTION',
  CONSOLE_ERROR: 'CONSOLE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const

const BUG_SEVERITY = {
  CRITICAL: 'CRITICAL',
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const

const REPORT_VERDICT = {
  ACCEPTED: 'ACCEPTED',
  RATE_LIMITED: 'RATE_LIMITED',
  REJECTED: 'REJECTED',
} as const

type TriggerKind = typeof TRIGGER_KIND[keyof typeof TRIGGER_KIND]
type BugSeverity = typeof BUG_SEVERITY[keyof typeof BUG_SEVERITY]
type ReportVerdict = typeof REPORT_VERDICT[keyof typeof REPORT_VERDICT]

// ─── Bug Store (In-Memory Circular Buffer) ───────────────────────────

interface StoredBug {
  id: string
  trigger: TriggerKind
  severity: BugSeverity
  message: string
  stack?: string
  filename?: string
  line?: number
  col?: number
  url: string
  userAgent: string
  viewport: { w: number; h: number }
  actions: Array<{
    kind: string
    timestamp: number
    selector: string
    tag: string
    text?: string
    url?: string
  }>
  timestamp: number
  receivedAt: number
}

const MAX_BUGS = 200
const TTL_MS = 60 * 60 * 1000 // 1 hour

// Global store survives across API calls on same serverless instance
const bugStore: StoredBug[] = (global as any).__agentEyeBugStore || []
if (!(global as any).__agentEyeBugStore) {
  ;(global as any).__agentEyeBugStore = bugStore
}

// Server-side rate limit: max 30 reports per minute per IP
const RATE_WINDOW = 60_000
const RATE_MAX = 30
const ipTimestamps: Map<string, number[]> = (global as any).__agentEyeIpRates || new Map()
if (!(global as any).__agentEyeIpRates) {
  ;(global as any).__agentEyeIpRates = ipTimestamps
}

function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function pruneExpired(): void {
  const cutoff = Date.now() - TTL_MS
  while (bugStore.length > 0 && bugStore[0].receivedAt < cutoff) {
    bugStore.shift()
  }
}

function checkRateLimit(ip: string): string {
  const now = Date.now()
  const timestamps = ipTimestamps.get(ip) || []
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW)
  if (recent.length >= RATE_MAX) return 'RATE_LIMITED'
  recent.push(now)
  ipTimestamps.set(ip, recent)
  return 'ALLOWED'
}

// ─── Validate trigger against known values ───────────────────────────

function validateTrigger(trigger: string): string {
  if (trigger === TRIGGER_KIND.JS_ERROR) return 'VALID'
  if (trigger === TRIGGER_KIND.UNHANDLED_REJECTION) return 'VALID'
  if (trigger === TRIGGER_KIND.CONSOLE_ERROR) return 'VALID'
  if (trigger === TRIGGER_KIND.NETWORK_ERROR) return 'VALID'
  return 'INVALID'
}

function validateSeverity(severity: string): string {
  if (severity === BUG_SEVERITY.CRITICAL) return 'VALID'
  if (severity === BUG_SEVERITY.ERROR) return 'VALID'
  if (severity === BUG_SEVERITY.WARNING) return 'VALID'
  if (severity === BUG_SEVERITY.INFO) return 'VALID'
  return 'INVALID'
}

// ─── Handler ─────────────────────────────────────────────────────────

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ verdict: REPORT_VERDICT.REJECTED, reason: 'Method not allowed' })
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'

  if (checkRateLimit(ip) !== 'ALLOWED') {
    return res.status(429).json({ verdict: REPORT_VERDICT.RATE_LIMITED })
  }

  const body = req.body
  if (!body || !body.trigger || !body.message) {
    return res.status(400).json({ verdict: REPORT_VERDICT.REJECTED, reason: 'Missing trigger or message' })
  }

  if (validateTrigger(body.trigger) !== 'VALID') {
    return res.status(400).json({ verdict: REPORT_VERDICT.REJECTED, reason: 'Unknown trigger kind' })
  }

  if (validateSeverity(body.severity) !== 'VALID') {
    return res.status(400).json({ verdict: REPORT_VERDICT.REJECTED, reason: 'Unknown severity' })
  }

  pruneExpired()

  const bug: StoredBug = {
    id: generateId(),
    trigger: body.trigger,
    severity: body.severity,
    message: String(body.message).slice(0, 2000),
    stack: body.stack ? String(body.stack).slice(0, 5000) : undefined,
    filename: body.filename ? String(body.filename).slice(0, 500) : undefined,
    line: typeof body.line === 'number' ? body.line : undefined,
    col: typeof body.col === 'number' ? body.col : undefined,
    url: String(body.url || '').slice(0, 1000),
    userAgent: String(body.userAgent || '').slice(0, 500),
    viewport: body.viewport || { w: 0, h: 0 },
    actions: Array.isArray(body.actions) ? body.actions.slice(-50) : [],
    timestamp: typeof body.timestamp === 'number' ? body.timestamp : Date.now(),
    receivedAt: Date.now(),
  }

  bugStore.push(bug)

  // Enforce circular buffer max
  while (bugStore.length > MAX_BUGS) {
    bugStore.shift()
  }

  return res.status(200).json({
    verdict: REPORT_VERDICT.ACCEPTED,
    id: bug.id,
    bufferSize: bugStore.length,
  })
}
