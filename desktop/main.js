// SoundChain desktop wrapper (cloud-connected v1).
// One codebase → four branded installers (soundchain / lucy / arena / mint).
// The target is chosen at build time via scripts/prep.js writing app.config.json.
//
// HONEST NOTE: this loads the live site over the network — it does NOT make the
// app cloud-free. The sovereign, no-server path is northstar-node/ (separate).
const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const fs = require('fs')

function cfg() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'app.config.json'), 'utf8'))
  } catch (_) {
    return { productName: 'SoundChain', url: 'https://soundchain.io' }
  }
}

let win = null

function createWindow() {
  const c = cfg()
  win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 380,
    minHeight: 480,
    backgroundColor: '#06070f',
    title: c.productName,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })
  win.loadURL(c.url)

  // Keep same-origin nav in the app; send foreign links to the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (new URL(url).origin !== new URL(c.url).origin) {
        shell.openExternal(url)
        return { action: 'deny' }
      }
    } catch (_) {}
    return { action: 'allow' }
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
