// LAN p2p transport — UDP multicast discovery + gossip/anti-entropy sync.
// NO server, NO relay, NO internet required. Laptops on the same Wi-Fi find
// each other and converge on the same set of posts.
//
// This is the swappable transport: the internet-wide version later replaces
// the dgram layer with libp2p/Hyperswarm behind this same interface — the
// store + UI never change.
const dgram = require('dgram')
const os = require('os')
const { EventEmitter } = require('events')

const GROUP = '239.255.42.99' // link-local multicast group (stays on the LAN)
const PORT = 48420
const HELLO_MS = 5000 // presence heartbeat
const DIGEST_MS = 8000 // anti-entropy: advertise what we have so drops self-heal
const PEER_TTL = 16000 // drop a peer we haven't heard from in this long

class NorthStarNet extends EventEmitter {
  constructor({ nodeId, name, store }) {
    super()
    this.nodeId = nodeId
    this.name = name || os.hostname()
    this.store = store
    this.peers = new Map() // nodeId -> { name, last }
    this.socket = null
    this._timers = []
  }

  start() {
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true })
    this.socket = sock
    sock.on('error', (err) => this.emit('error', err))
    sock.on('message', (buf, rinfo) => this._onMessage(buf, rinfo))
    sock.bind(PORT, () => {
      try {
        sock.addMembership(GROUP)
        sock.setMulticastLoopback(true) // so 2 nodes on one machine still sync
        sock.setMulticastTTL(1) // never leave the local network
      } catch (e) {
        this.emit('error', e)
      }
      this._announce()
      this._timers.push(setInterval(() => this._announce(), HELLO_MS))
      this._timers.push(setInterval(() => this._sendDigest(), DIGEST_MS))
      this._timers.push(setInterval(() => this._prunePeers(), HELLO_MS))
      this.emit('ready')
    })
  }

  stop() {
    this._timers.forEach(clearInterval)
    this._timers = []
    try {
      this.socket && this.socket.close()
    } catch (_) {}
  }

  _send(obj) {
    const buf = Buffer.from(JSON.stringify(obj))
    try {
      this.socket.send(buf, 0, buf.length, PORT, GROUP)
    } catch (_) {}
  }

  _announce() {
    this._send({ t: 'HELLO', id: this.nodeId, name: this.name })
  }

  createPost(text) {
    const post = {
      id: this.nodeId + ':' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      nodeId: this.nodeId,
      name: this.name,
      text: String(text || '').slice(0, 1000),
      ts: Date.now(),
    }
    this.store.add(post)
    this._send({ t: 'POST', post })
    return post
  }

  _sendDigest() {
    this._send({ t: 'DIGEST', id: this.nodeId, ids: this.store.ids().slice(-300) })
  }

  _onMessage(buf) {
    let msg
    try {
      msg = JSON.parse(buf.toString())
    } catch (_) {
      return
    }
    if (!msg || !msg.t) return
    switch (msg.t) {
      case 'HELLO':
        this._touchPeer(msg.id, msg.name)
        break
      case 'POST':
        if (msg.post && this.store.add(msg.post)) {
          this._touchPeer(msg.post.nodeId, msg.post.name)
          this.emit('post', msg.post)
        }
        break
      case 'DIGEST': {
        if (!msg.id || msg.id === this.nodeId) break
        this._touchPeer(msg.id)
        const theirs = new Set(msg.ids || [])
        // repair: push them anything they're missing
        for (const id of this.store.ids()) {
          if (!theirs.has(id)) this._send({ t: 'POST', post: this.store.get(id) })
        }
        // request: ask for anything I'm missing
        const mine = new Set(this.store.ids())
        const want = (msg.ids || []).filter((id) => !mine.has(id))
        if (want.length) this._send({ t: 'WANT', ids: want })
        break
      }
      case 'WANT':
        for (const id of msg.ids || []) {
          if (this.store.has(id)) this._send({ t: 'POST', post: this.store.get(id) })
        }
        break
    }
  }

  _touchPeer(id, name) {
    if (!id || id === this.nodeId) return
    const prev = this.peers.get(id)
    this.peers.set(id, { name: name || (prev && prev.name) || 'node', last: Date.now() })
    if (!prev) this._emitPeers()
  }

  _prunePeers() {
    const now = Date.now()
    let changed = false
    for (const [id, p] of this.peers) {
      if (now - p.last > PEER_TTL) {
        this.peers.delete(id)
        changed = true
      }
    }
    if (changed) this._emitPeers()
  }

  _emitPeers() {
    this.emit('peers', this.peerList())
  }

  peerList() {
    return [...this.peers.entries()].map(([id, p]) => ({ id, name: p.name }))
  }
}

module.exports = { NorthStarNet, GROUP, PORT }
