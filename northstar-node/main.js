// SoundChain · North Star — sovereign node (Electron main process).
// Loads a LOCAL file (no remote URL), runs a local store + LAN p2p net.
// No Vercel, no Atlas, no server of any kind.
//
// Pass gate: when PASS_GATE_ENABLED=1, the app shows the activation screen until
// the device proves (via a signed challenge + on-chain Pass balance) that it
// holds a North Star Pass. Ships OFF by default so the beta runs ungated.
const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const crypto = require('crypto')
const Store = require('./src/store')
const { NorthStarNet } = require('./src/peernet')
const pass = require('./src/pass')
const activation = require('./src/activation')

let win = null
let net = null
let store = null
let currentChallenge = null

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

function gateActive() {
  return pass.cfg.enabled && process.env.NORTHSTAR_DEV_UNLOCK !== '1' && !activation.isActivated(app.getPath('userData'))
}

function createWindow(page) {
  win = new BrowserWindow({
    width: 520,
    height: 780,
    minWidth: 380,
    minHeight: 480,
    backgroundColor: '#06070f',
    title: 'SoundChain · North Star',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.loadFile(path.join(__dirname, 'renderer', page))
}

function enterApp() {
  if (win) win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
}

app.whenReady().then(() => {
  const ident = loadIdentity()
  store = new Store(path.join(app.getPath('userData'), 'posts.json'))
  net = new NorthStarNet({ nodeId: ident.nodeId, name: ident.name, store })

  net.on('post', (post) => win && win.webContents.send('post:new', post))
  net.on('peers', (peers) => win && win.webContents.send('peers:update', peers))
  net.on('error', (e) => console.error('[peernet]', e.message))
  net.start()

  // ---- feed API ----
  ipcMain.handle('me:get', () => ({ nodeId: ident.nodeId, name: ident.name }))
  ipcMain.handle('posts:get', () => store.all())
  ipcMain.handle('peers:get', () => net.peerList())
  ipcMain.handle('post:create', (_e, text) => net.createPost(text))

  // ---- Pass activation API ----
  ipcMain.handle('activation:state', () => ({
    enabled: pass.cfg.enabled,
    hasContract: !!pass.cfg.contract, // gate is "live" only when a Pass contract is wired
    activated: activation.isActivated(app.getPath('userData')),
    record: activation.load(app.getPath('userData')),
    buyUrl: pass.cfg.buyUrl,
  }))
  ipcMain.handle('activation:challenge', () => {
    currentChallenge = pass.makeChallenge()
    return currentChallenge
  })
  ipcMain.handle('activation:verify', async (_e, signature) => {
    if (!currentChallenge) return { ok: false, reason: 'no-challenge' }
    const result = await pass.verify(currentChallenge, signature)
    if (result.ok && result.address) {
      activation.activate(app.getPath('userData'), result.address)
    }
    return result
  })
  ipcMain.handle('activation:continueBeta', () => {
    enterApp()
    return { ok: true }
  })
  ipcMain.handle('activation:enterApp', () => {
    enterApp()
    return { ok: true }
  })
  ipcMain.handle('activation:openBuy', () => {
    shell.openExternal(pass.cfg.buyUrl)
    return { ok: true }
  })

  createWindow(gateActive() ? 'activate.html' : 'index.html')
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(gateActive() ? 'activate.html' : 'index.html')
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
