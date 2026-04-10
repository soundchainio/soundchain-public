#!/usr/bin/env npx tsx
/**
 * SoundChain Tunnel Agent — MacBook bridge
 * Connects to EC2 relay as "host", multiplexes FURL browser
 * terminal sessions to local ttyd (localhost:7681).
 */

import WebSocket from 'ws'

const RELAY_URL = process.env.RELAY_URL || 'wss://tunnel.soundchain.io'
const RELAY_IP = process.env.RELAY_IP || '44.209.136.62'
const TTYD_URL = process.env.TTYD_URL || 'ws://localhost:7681/ws'
const HOST_SECRET = process.env.TUNNEL_HOST_SECRET || ''

if (!HOST_SECRET) {
  console.error('[agent] FATAL: TUNNEL_HOST_SECRET env var required')
  process.exit(1)
}

const RECONNECT_BASE_MS = 2000
const RECONNECT_MAX_MS = 30000
let useFallbackIp = false

const ttydSessions = new Map<string, WebSocket>()
let relayWs: WebSocket | null = null
let reconnectAttempt = 0
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let pingTimer: ReturnType<typeof setInterval> | null = null

function connectToRelay(): void {
  let connectUrl: string
  let wsOptions: WebSocket.ClientOptions

  if (useFallbackIp) {
    connectUrl = `wss://${RELAY_IP}?role=host&secret=${encodeURIComponent(HOST_SECRET)}`
    wsOptions = { headers: { Host: 'tunnel.soundchain.io' }, servername: 'tunnel.soundchain.io', rejectUnauthorized: true }
  } else {
    connectUrl = `${RELAY_URL}?role=host&secret=${encodeURIComponent(HOST_SECRET)}`
    wsOptions = { rejectUnauthorized: process.env.NODE_ENV === 'production' }
  }

  console.log(`[agent] Connecting to relay: ${useFallbackIp ? RELAY_IP : RELAY_URL}`)
  const ws = new WebSocket(connectUrl, wsOptions)

  ws.on('open', () => {
    console.log('[agent] Connected to relay')
    relayWs = ws
    reconnectAttempt = 0
    if (pingTimer) clearInterval(pingTimer)
    pingTimer = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.ping() }, 30_000)
  })

  ws.on('pong', () => {})
  ws.on('ping', () => ws.pong())

  ws.on('message', (rawData) => {
    try {
      const msg = JSON.parse(rawData.toString())
      if (msg.type === 'session.open') openTtydSession(msg.sessionId)
      else if (msg.type === 'session.data') forwardToTtyd(msg.sessionId, msg.d)
      else if (msg.type === 'session.close') closeTtydSession(msg.sessionId)
    } catch {}
  })

  ws.on('close', (code, reason) => {
    console.log(`[agent] Relay disconnected (${code}: ${reason?.toString() || 'unknown'})`)
    if (relayWs === ws) relayWs = null
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null }
    for (const [, ttyd] of ttydSessions) ttyd.close()
    ttydSessions.clear()
    scheduleReconnect()
  })

  ws.on('error', (err) => {
    console.error('[agent] Relay error:', err.message)
    if (err.message.includes('ENOTFOUND') && !useFallbackIp) useFallbackIp = true
  })
}

function scheduleReconnect(): void {
  if (reconnectTimer) return
  const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt), RECONNECT_MAX_MS)
  reconnectAttempt++
  console.log(`[agent] Reconnecting in ${delay}ms (attempt ${reconnectAttempt})`)
  reconnectTimer = setTimeout(() => { reconnectTimer = null; connectToRelay() }, delay)
}

function openTtydSession(sessionId: string): void {
  if (ttydSessions.has(sessionId)) return
  console.log(`[agent] Opening ttyd session ${sessionId}`)
  const ttyd = new WebSocket(TTYD_URL, ['tty'])

  ttyd.on('open', () => {
    ttyd.send(JSON.stringify({ AuthToken: '', columns: 80, rows: 24 }))
    ttydSessions.set(sessionId, ttyd)
    console.log(`[agent] ttyd session ${sessionId} ready (${ttydSessions.size} active)`)
  })

  ttyd.on('message', (data) => {
    if (relayWs && relayWs.readyState === WebSocket.OPEN) {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer)
      relayWs.send(JSON.stringify({ type: 'session.data', sessionId, d: buf.toString('base64') }))
    }
  })

  ttyd.on('ping', () => ttyd.pong())

  ttyd.on('close', () => {
    ttydSessions.delete(sessionId)
    if (relayWs && relayWs.readyState === WebSocket.OPEN) {
      relayWs.send(JSON.stringify({ type: 'session.close', sessionId }))
    }
    console.log(`[agent] ttyd session ${sessionId} closed (${ttydSessions.size} active)`)
  })

  ttyd.on('error', (err) => {
    console.error(`[agent] ttyd session ${sessionId} error:`, err.message)
    ttydSessions.delete(sessionId)
  })
}

function forwardToTtyd(sessionId: string, base64Data: string): void {
  const ttyd = ttydSessions.get(sessionId)
  if (ttyd && ttyd.readyState === WebSocket.OPEN) ttyd.send(Buffer.from(base64Data, 'base64'))
}

function closeTtydSession(sessionId: string): void {
  const ttyd = ttydSessions.get(sessionId)
  if (ttyd) { ttyd.close(); ttydSessions.delete(sessionId) }
}

process.on('SIGINT', () => { process.exit(0) })
process.on('SIGTERM', () => { process.exit(0) })

console.log('[agent] Tunnel agent starting')
console.log(`[agent]   Relay: ${RELAY_URL}`)
console.log(`[agent]   ttyd:  ${TTYD_URL}`)
connectToRelay()
