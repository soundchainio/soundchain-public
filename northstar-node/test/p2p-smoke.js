// Proves the thesis with NO server: two independent nodes, two separate stores,
// a post created on A must arrive at B over LAN multicast. Pure Node, no Electron.
const os = require('os')
const path = require('path')
const fs = require('fs')
const Store = require('../src/store')
const { NorthStarNet } = require('../src/peernet')

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-smoke-'))
const a = new NorthStarNet({ nodeId: 'sc_aaaaaa', name: 'LaptopA', store: new Store(path.join(tmp, 'a.json')) })
const b = new NorthStarNet({ nodeId: 'sc_bbbbbb', name: 'LaptopB', store: new Store(path.join(tmp, 'b.json')) })

let done = false
function finish(ok, msg) {
  if (done) return
  done = true
  console.log((ok ? '✅ PASS — ' : '❌ FAIL — ') + msg)
  try {
    a.stop()
    b.stop()
  } catch (_) {}
  process.exit(ok ? 0 : 1)
}

const PAYLOAD = 'hello from A, no server'
b.on('post', (post) => {
  if (post.text === PAYLOAD) finish(true, "Node B received Node A's post over LAN multicast — zero server, zero cloud")
})
a.on('error', (e) => finish(false, 'A socket error: ' + e.message))
b.on('error', (e) => finish(false, 'B socket error: ' + e.message))

let ready = 0
function go() {
  if (++ready < 2) return
  setTimeout(() => {
    const p = a.createPost(PAYLOAD)
    console.log('Node A published:', p.id)
  }, 400)
}
a.on('ready', go)
b.on('ready', go)

a.start()
b.start()
setTimeout(() => finish(false, "timeout — B never received A's post (multicast may be blocked on this interface)"), 5000)
