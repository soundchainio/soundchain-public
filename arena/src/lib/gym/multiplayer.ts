/**
 * Phase 16.47 — WebRTC 1-on-1 gym multiplayer.
 *
 * Two peers exchange SDPs + ICE via the /api/gym/signal Mongo-backed
 * endpoint. Once the data channels open, all gameplay state flows
 * peer-to-peer over WebRTC — no server hop, no rate limits, low latency.
 *
 * Two data channels:
 *   - 'state'  — unreliable + unordered, 15Hz. Position, rotation, clip,
 *                ball-held flag. Stale packets dropped silently.
 *   - 'events' — reliable + ordered. Shot fired, score, possession
 *                transfer, handshake hello. Won't be re-sent if stale
 *                but won't be silently dropped either.
 *
 * Possession model: simple last-touch authority. Whoever has
 * `ballHeld = true` in their state broadcast is the ball owner. After
 * a score, possession alternates via 'passToOther' event.
 *
 * Public API: `connectAsHost` + `connectAsGuest` both return a
 * `GymPeer` handle. Caller wires:
 *   - onStateMsg(msg)       remote position/rotation/clip every tick
 *   - onEventMsg(msg)       discrete events (shot, score, hello)
 *   - onOpen()              data channels open, ready for gameplay
 *   - onClose()             other side disconnected
 * and calls `sendState(msg)` / `sendEvent(msg)` from the local sim.
 */

const STUN_SERVERS = [
  // Public STUN servers — free, no signup
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
]

export type GymStateMsg = {
  pos: [number, number, number]
  rot: number
  clip: string
  ballHeld: boolean
  ballPos?: [number, number, number]
  ballVel?: [number, number, number]
  t: number
}

export type GymEventMsg =
  | { type: 'hello'; profile: unknown; handle: string }
  | { type: 'shotFired'; startPos: [number, number, number]; targetPos: [number, number, number]; isDunk: boolean; isThree: boolean }
  | { type: 'score'; player: 'me' | 'them' }
  | { type: 'passToOther' }
  | { type: 'crowdCheer' }
  | { type: 'bye' }

export type GymPeerHooks = {
  onStateMsg?: (msg: GymStateMsg) => void
  onEventMsg?: (msg: GymEventMsg) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (err: Error) => void
}

export type GymPeer = {
  role: 'host' | 'guest'
  code: string
  remoteHandle: string
  remoteProfile: unknown
  sendState: (msg: GymStateMsg) => void
  sendEvent: (msg: GymEventMsg) => void
  close: () => void
}

async function postSignal(body: Record<string, unknown>) {
  const r = await fetch('/api/gym/signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e.error || `signal failed (${r.status})`)
  }
  return r.json()
}

async function pollSignal(code: string, role: 'host' | 'guest', since: number) {
  const r = await fetch(`/api/gym/signal?code=${encodeURIComponent(code)}&role=${role}&since=${since}`)
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e.error || `poll failed (${r.status})`)
  }
  return r.json()
}

function createPeerConnection() {
  return new RTCPeerConnection({ iceServers: STUN_SERVERS })
}

function wireDataChannel(
  channel: RTCDataChannel,
  isStateChannel: boolean,
  hooks: GymPeerHooks,
) {
  channel.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (isStateChannel) hooks.onStateMsg?.(msg as GymStateMsg)
      else hooks.onEventMsg?.(msg as GymEventMsg)
    } catch (err) {
      // Bad packet — drop silently for state, log for events
      if (!isStateChannel) console.warn('[gym/multiplayer] bad event msg', err)
    }
  }
}

async function exchangeIceCandidates(
  pc: RTCPeerConnection,
  code: string,
  role: 'host' | 'guest',
  abort: { aborted: boolean },
) {
  // Local candidates → upload to signal endpoint
  pc.onicecandidate = (ev) => {
    if (ev.candidate) {
      postSignal({
        action: 'candidate',
        code,
        role,
        candidate: ev.candidate.toJSON(),
      }).catch(() => {})
    }
  }
  // Remote candidates → poll signal endpoint
  let since = 0
  while (!abort.aborted) {
    try {
      const data = await pollSignal(code, role, since)
      if (data.peerCandidates && Array.isArray(data.peerCandidates)) {
        for (const entry of data.peerCandidates) {
          if (entry.c) {
            await pc.addIceCandidate(entry.c).catch(() => {})
            since = Math.max(since, entry.t)
          }
        }
      }
      if (data.now) since = Math.max(since, data.now - 500)  // small overlap
    } catch (err) {
      // Polling errors are non-fatal during setup; keep trying
      console.warn('[gym/multiplayer] poll error', err)
    }
    await new Promise((r) => setTimeout(r, 700))
    // Exit once peer connection is fully established
    if (pc.connectionState === 'connected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      break
    }
  }
}

export async function connectAsHost(
  hooks: GymPeerHooks,
  meta: { profile: unknown; handle: string },
): Promise<GymPeer> {
  const pc = createPeerConnection()
  const stateChannel = pc.createDataChannel('state', { ordered: false, maxRetransmits: 0 })
  const eventChannel = pc.createDataChannel('events', { ordered: true })

  let openedCount = 0
  let resolvedRemoteMeta = { handle: 'Player 2', profile: null as unknown }
  const abort = { aborted: false }

  const peer: GymPeer = {
    role: 'host',
    code: '',
    remoteHandle: '',
    remoteProfile: null,
    sendState: (msg) => {
      if (stateChannel.readyState === 'open') stateChannel.send(JSON.stringify(msg))
    },
    sendEvent: (msg) => {
      if (eventChannel.readyState === 'open') eventChannel.send(JSON.stringify(msg))
    },
    close: () => {
      abort.aborted = true
      try { peer.sendEvent({ type: 'bye' }) } catch {}
      try { pc.close() } catch {}
      postSignal({ action: 'close', code: peer.code }).catch(() => {})
    },
  }

  wireDataChannel(stateChannel, true, hooks)
  wireDataChannel(eventChannel, false, hooks)

  const markOpen = () => {
    openedCount += 1
    if (openedCount === 2) hooks.onOpen?.()
  }
  stateChannel.onopen = markOpen
  eventChannel.onopen = markOpen

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
      hooks.onClose?.()
    }
  }

  // Create offer + push to signal endpoint
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  const createRes = await postSignal({
    action: 'create',
    sdp: offer,
    profile: meta.profile,
    handle: meta.handle,
  })
  peer.code = createRes.code

  // Poll for guest answer
  let since = 0
  let answerSet = false
  ;(async () => {
    while (!abort.aborted && !answerSet) {
      try {
        const data = await pollSignal(peer.code, 'host', since)
        if (data.peerSDP && data.peerSDP.type === 'answer') {
          await pc.setRemoteDescription(data.peerSDP)
          resolvedRemoteMeta = { handle: data.peerHandle || 'Player 2', profile: data.peerProfile }
          peer.remoteHandle = resolvedRemoteMeta.handle
          peer.remoteProfile = resolvedRemoteMeta.profile
          answerSet = true
          break
        }
        if (data.now) since = Math.max(since, data.now - 500)
      } catch (err) {
        console.warn('[gym/multiplayer] host poll error', err)
      }
      await new Promise((r) => setTimeout(r, 700))
    }
  })()

  // Run ICE exchange in parallel
  exchangeIceCandidates(pc, peer.code, 'host', abort).catch(() => {})

  return peer
}

export async function connectAsGuest(
  code: string,
  hooks: GymPeerHooks,
  meta: { profile: unknown; handle: string },
): Promise<GymPeer> {
  const pc = createPeerConnection()
  const abort = { aborted: false }
  let openedCount = 0
  let stateChannel: RTCDataChannel | null = null
  let eventChannel: RTCDataChannel | null = null

  const peer: GymPeer = {
    role: 'guest',
    code,
    remoteHandle: 'Player 1',
    remoteProfile: null,
    sendState: (msg) => {
      if (stateChannel && stateChannel.readyState === 'open') stateChannel.send(JSON.stringify(msg))
    },
    sendEvent: (msg) => {
      if (eventChannel && eventChannel.readyState === 'open') eventChannel.send(JSON.stringify(msg))
    },
    close: () => {
      abort.aborted = true
      try { peer.sendEvent({ type: 'bye' }) } catch {}
      try { pc.close() } catch {}
    },
  }

  // Guest receives data channels from the host
  pc.ondatachannel = (ev) => {
    const ch = ev.channel
    const isState = ch.label === 'state'
    if (isState) stateChannel = ch; else eventChannel = ch
    wireDataChannel(ch, isState, hooks)
    ch.onopen = () => {
      openedCount += 1
      if (openedCount === 2) hooks.onOpen?.()
    }
  }

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
      hooks.onClose?.()
    }
  }

  // Get host SDP, set as remote, create + send answer
  let dummyOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: '' }
  // We don't have the offer yet — we POST join with our local SDP (answer-shaped),
  // and the join response gives us the host SDP. But WebRTC needs offer set first.
  // Workaround: create a placeholder local description after we have the host SDP.
  // So: fetch host SDP via a one-shot join with our answer (chicken+egg avoided
  // because we set remote BEFORE local for guest).
  // Simplification: we POST 'join' with an empty SDP placeholder; server returns
  // host SDP; we setRemote(hostSDP), createAnswer, setLocal(answer), then POST a
  // second time to publish our answer. But /api/gym/signal join takes our SDP as
  // input. To keep one POST: host's SDP IS in the room when we join, so we can
  // GET it first. Cleanest path:
  //   1. GET room data (via poll endpoint) to fetch host SDP
  //   2. setRemoteDescription(hostSDP)
  //   3. createAnswer + setLocalDescription
  //   4. POST 'join' with answer SDP
  // Do that.
  void dummyOffer

  // 1. Fetch host SDP by polling once
  const initial = await pollSignal(code, 'guest', 0)
  if (!initial.peerSDP) throw new Error('Room not found or host SDP not ready')
  peer.remoteHandle = initial.peerHandle || 'Player 1'
  peer.remoteProfile = initial.peerProfile
  await pc.setRemoteDescription(initial.peerSDP)

  // 2. Create answer + set local
  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)

  // 3. POST 'join' to publish our answer
  await postSignal({
    action: 'join',
    code,
    sdp: answer,
    profile: meta.profile,
    handle: meta.handle,
  })

  // 4. ICE exchange
  exchangeIceCandidates(pc, code, 'guest', abort).catch(() => {})

  return peer
}
