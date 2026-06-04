// SoundChain · North Star — sovereign node (Electron main process).
// Loads a LOCAL file (no remote URL), runs a local store + LAN p2p net.
// No Vercel, no Atlas, no server of any kind.
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const crypto = require('crypto')
const Store = require('./src/store')
const { NorthStarNet } = require('./src/peernet')

let win = null
let net = null
let store = null

// Stable per-node identity, persisted on disk. (Real version: this becomes an
// NFT/OGUN-backed keypair — the license IS the identity.)
function loadIdentity() {
  const file = path.join(app.getPath('userData'), 'identity.json')
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (_) {
    const id = { nodeId: 'sc_' + crypto.randomBytes(6).toString('hex'), name: os.hostname() }
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, JSON.stringify(id))
    } catch (_) {}
    return id
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 520,
    height: 780,
    minWidth: 380,
    minHeight: 480,
    backgroundColor: '#06070f',
    title: 'SoundChain · North Star',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
}

app.whenReady().then(() => {
  const ident = loadIdentity()
  store = new Store(path.join(app.getPath('userData'), 'posts.json'))
  net = new NorthStarNet({ nodeId: ident.nodeId, name: ident.name, store })

  net.on('post', (post) => win && win.webContents.send('post:new', post))
  net.on('peers', (peers) => win && win.webContents.send('peers:update', peers))
  net.on('error', (e) => console.error('[peernet]', e.message))
  net.start()

  ipcMain.handle('me:get', () => ({ nodeId: ident.nodeId, name: ident.name }))
  ipcMain.handle('posts:get', () => store.all())
  ipcMain.handle('peers:get', () => net.peerList())
  ipcMain.handle('post:create', (_e, text) => net.createPost(text))

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('before-quit', () => {
  try {
    net && net.stop()
  } catch (_) {}
})
