#!/usr/bin/env npx tsx
/**
 * SoundChain PTY Server — ttyd replacement
 *
 * A stable Node.js WebSocket-to-PTY bridge that replaces ttyd.
 * ttyd 1.7.7 on Apple Silicon has a known libwebsockets segfault bug
 * (383+ crashes). This server uses node-pty instead and is crash-free.
 *
 * Wire protocol (ttyd-compatible):
 *   Client → Server:
 *     - First message: JSON { AuthToken: '', columns: N, rows: N }
 *     - Subsequent: binary with prefix byte:
 *       0x30 ('0') + data  = terminal input
 *       0x31 ('1') + JSON  = resize { columns, rows }
 *
 *   Server → Client:
 *     - binary with prefix byte:
 *       0x30 ('0') + data  = terminal output
 *       0x31 ('1') + JSON  = window title (optional)
 *
 * Listens on port 7681 (same as ttyd) with subprotocol 'tty'.
 */

import { WebSocketServer, WebSocket } from 'ws'
import * as pty from 'node-pty'
import { IncomingMessage } from 'http'

const PORT = parseInt(process.env.PTY_PORT || '7681', 10)
const SHELL = process.env.PTY_SHELL || process.env.SHELL || '/bin/zsh'
const MAX_SESSIONS = 20

interface Session {
  id: number
  ptyProcess: pty.IPty
  ws: WebSocket
  authenticated: boolean
}

let nextSessionId = 1
const sessions = new Map<number, Session>()

const wss = new WebSocketServer({
  port: PORT,
  handleProtocols: (protocols) => {
    if (protocols.has('tty')) return 'tty'
    return false
  },
})

console.log(`[pty-server] Listening on port ${PORT}`)
console.log(`[pty-server] Shell: ${SHELL}`)
console.log(`[pty-server] PID: ${process.pid}`)

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  if (sessions.size >= MAX_SESSIONS) {
    console.warn(`[pty-server] Max sessions (${MAX_SESSIONS}) reached, rejecting connection`)
    ws.close(1013, 'Max sessions reached')
    return
  }

  const sessionId = nextSessionId++
  const session: Session = {
    id: sessionId,
    ptyProcess: null as any,
    ws,
    authenticated: false,
  }
  sessions.set(sessionId, session)

  console.log(`[pty-server] New connection #${sessionId} from ${req.socket.remoteAddress} (${sessions.size} active)`)

  ws.on('message', (rawData: Buffer | string) => {
    try {
      // First message must be auth JSON
      if (!session.authenticated) {
        const msg = JSON.parse(rawData.toString())
        const cols = msg.columns || 80
        const rows = msg.rows || 24

        // Spawn PTY
        const ptyProcess = pty.spawn(SHELL, [], {
          name: 'xterm-256color',
          cols,
          rows,
          cwd: process.env.HOME || '/Users/soundchain',
          env: {
            ...process.env,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
          } as { [key: string]: string },
        })

        session.ptyProcess = ptyProcess
        session.authenticated = true

        console.log(`[pty-server] Session #${sessionId} spawned PTY (pid ${ptyProcess.pid}, ${cols}x${rows})`)

        // Forward PTY output to WebSocket with 0x30 prefix
        ptyProcess.onData((data: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            const buf = Buffer.alloc(1 + Buffer.byteLength(data))
            buf[0] = 0x30 // '0' = output data
            buf.write(data, 1)
            ws.send(buf)
          }
        })

        ptyProcess.onExit(({ exitCode, signal }) => {
          console.log(`[pty-server] Session #${sessionId} PTY exited (code=${exitCode}, signal=${signal})`)
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'PTY exited')
          }
          sessions.delete(sessionId)
        })

        return
      }

      // Authenticated — handle binary data with prefix byte
      const buf = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData as string)
      if (buf.length === 0) return

      const prefix = buf[0]
      const payload = buf.subarray(1)

      if (prefix === 0x30) {
        // '0' = terminal input
        session.ptyProcess.write(payload.toString())
      } else if (prefix === 0x31) {
        // '1' = resize
        try {
          const resize = JSON.parse(payload.toString())
          const cols = resize.columns || resize.cols || 80
          const rows = resize.rows || 24
          session.ptyProcess.resize(cols, rows)
        } catch (e) {
          // Ignore malformed resize
        }
      }
    } catch (err) {
      console.error(`[pty-server] Session #${sessionId} message error:`, (err as Error).message)
    }
  })

  ws.on('close', (code, reason) => {
    console.log(`[pty-server] Session #${sessionId} WebSocket closed (${code}: ${reason?.toString() || ''})`)
    if (session.ptyProcess) {
      try {
        session.ptyProcess.kill()
      } catch {}
    }
    sessions.delete(sessionId)
    console.log(`[pty-server] ${sessions.size} active sessions remaining`)
  })

  ws.on('error', (err) => {
    console.error(`[pty-server] Session #${sessionId} WebSocket error:`, err.message)
  })

  ws.on('ping', () => ws.pong())
})

wss.on('error', (err) => {
  console.error('[pty-server] Server error:', err.message)
})

// Graceful shutdown
function cleanup() {
  console.log(`[pty-server] Shutting down, killing ${sessions.size} sessions...`)
  for (const [id, session] of sessions) {
    try {
      session.ptyProcess?.kill()
      session.ws?.close(1001, 'Server shutting down')
    } catch {}
  }
  sessions.clear()
  wss.close(() => {
    console.log('[pty-server] Server closed')
    process.exit(0)
  })
  // Force exit after 3 seconds if graceful shutdown hangs
  setTimeout(() => process.exit(0), 3000)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
process.on('uncaughtException', (err) => {
  console.error('[pty-server] Uncaught exception:', err.message, err.stack)
  // Do NOT exit — keep running. This is the whole point of replacing ttyd.
})
process.on('unhandledRejection', (reason) => {
  console.error('[pty-server] Unhandled rejection:', reason)
  // Do NOT exit.
})

console.log('[pty-server] Ready. Waiting for connections...')
