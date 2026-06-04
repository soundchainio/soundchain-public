/* global northstar */
const feed = document.getElementById('feed')
const textEl = document.getElementById('text')
const sendEl = document.getElementById('send')
const identEl = document.getElementById('ident')
const peerLabel = document.getElementById('peerLabel')
const dot = document.getElementById('dot')

let me = { nodeId: '', name: '' }
const seen = new Set()

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (_) {
    return ''
  }
}

function render(post, prepend) {
  if (seen.has(post.id)) return
  seen.add(post.id)
  const empty = feed.querySelector('.empty')
  if (empty) empty.remove()
  const el = document.createElement('div')
  el.className = 'post' + (post.nodeId === me.nodeId ? ' mine' : '')
  const who = document.createElement('div')
  who.className = 'who'
  who.innerHTML = `<span class="name"></span><span class="t"></span>`
  who.querySelector('.name').textContent = post.name + (post.nodeId === me.nodeId ? ' (you)' : '')
  who.querySelector('.t').textContent = fmtTime(post.ts)
  const txt = document.createElement('div')
  txt.className = 'text'
  txt.textContent = post.text
  el.appendChild(who)
  el.appendChild(txt)
  feed.appendChild(el)
  feed.scrollTop = feed.scrollHeight
}

function renderPeers(peers) {
  const n = peers.length
  if (n === 0) {
    dot.className = 'dot solo'
    peerLabel.textContent = 'solo — no peers found yet (open the app on another laptop)'
  } else {
    dot.className = 'dot'
    const names = peers.map((p) => p.name).join(', ')
    peerLabel.textContent = `${n} peer${n > 1 ? 's' : ''} · no server · ${names}`
  }
}

async function send() {
  const text = textEl.value.trim()
  if (!text) return
  textEl.value = ''
  const post = await northstar.createPost(text)
  render(post)
}

sendEl.addEventListener('click', send)
textEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
    e.preventDefault()
    send()
  }
})

northstar.onPost((post) => render(post))
northstar.onPeers((peers) => renderPeers(peers))

;(async () => {
  me = await northstar.me()
  identEl.textContent = `this node: ${me.name} · ${me.nodeId} — no server, no cloud`
  const posts = await northstar.getPosts()
  posts.forEach((p) => render(p))
  renderPeers(await northstar.getPeers())
})()
