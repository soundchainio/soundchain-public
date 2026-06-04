// Local-first append store. One JSON file on disk. No server, no DB.
// Dedupe by post id; persists across restarts. This is the node's "database".
const fs = require('fs')
const path = require('path')

class Store {
  constructor(filePath) {
    this.filePath = filePath
    this.posts = new Map() // id -> post
    this._load()
  }

  _load() {
    try {
      const arr = JSON.parse(fs.readFileSync(this.filePath, 'utf8'))
      for (const p of arr) if (p && p.id) this.posts.set(p.id, p)
    } catch (_) {
      /* fresh node, no file yet */
    }
  }

  _save() {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
      fs.writeFileSync(this.filePath, JSON.stringify([...this.posts.values()]))
    } catch (_) {
      /* best-effort persistence */
    }
  }

  has(id) {
    return this.posts.has(id)
  }

  get(id) {
    return this.posts.get(id)
  }

  ids() {
    return [...this.posts.keys()]
  }

  // returns true only if this is a NEW post (drives dedup + "is this novel?" gossip)
  add(post) {
    if (!post || !post.id || this.posts.has(post.id)) return false
    this.posts.set(post.id, post)
    this._save()
    return true
  }

  all() {
    return [...this.posts.values()].sort((a, b) => a.ts - b.ts)
  }
}

module.exports = Store
