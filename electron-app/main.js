/**
 * SoundChain Electron App — The Ghost in Your Shell
 *
 * P2P decentralized music network as a standalone desktop app.
 * Each install is a full node: streams music, makes calls,
 * runs FURL, earns OGUN.
 *
 * Features:
 * - System tray with now playing
 * - Native notifications for incoming calls + DMs
 * - Background audio (music never stops)
 * - Auto-start on login
 * - Full WebRTC calling support
 * - OGUN streaming rewards
 */

const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, shell, ipcMain } = require('electron')
const path = require('path')

const APP_URL = 'https://soundchain.io'
const PULSE_URL = 'https://soundchain.io/dex/pulse'
const RADIO_URL = 'https://soundchain.io/radio'

let mainWindow = null
let tray = null
let isQuitting = false

// Single instance lock — only one SoundChain app at a time
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 375,
    minHeight: 600,
    title: 'SoundChain',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'hiddenInset', // Clean macOS title bar
    trafficLightPosition: { x: 12, y: 12 },
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // Enable WebRTC for voice calls
      webSecurity: true,
      // Allow media (microphone for calls)
      defaultFontFamily: { standard: 'system-ui' },
    },
  })

  // Load SoundChain
  mainWindow.loadURL(APP_URL)

  // Handle popups — allow Magic OAuth + SoundChain, open others externally
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow Magic OAuth popups (required for Google/Discord/Twitch login)
    if (url.includes('magic.link') || url.includes('accounts.google.com') ||
        url.includes('discord.com/oauth') || url.includes('id.twitch.tv')) {
      return { action: 'allow' }
    }
    // Allow SoundChain URLs in same window
    if (url.startsWith(APP_URL) || url.startsWith('https://soundchain.io')) {
      return { action: 'allow' }
    }
    // Everything else opens in default browser
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Auto-grant microphone permission for WebRTC calls
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPerms = ['media', 'mediaKeySystem', 'notifications', 'clipboard-read']
    callback(allowedPerms.includes(permission))
  })

  // Handle page title updates — show track info in title bar
  mainWindow.webContents.on('page-title-updated', (event, title) => {
    if (tray && title.includes('|')) {
      tray.setToolTip(title)
    }
  })

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
      return false
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Inject custom CSS for electron-specific tweaks
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      /* Hide download banners — we ARE the app */
      .install-banner, [class*="install-banner"], [class*="InstallBanner"] {
        display: none !important;
      }
      /* Draggable title bar area */
      body { -webkit-app-region: no-drag; }
      nav { -webkit-app-region: drag; }
      nav button, nav a, nav input { -webkit-app-region: no-drag; }
    `)
  })
}

function createTray() {
  // Create tray icon
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png')
  let trayIcon
  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 })
  } catch {
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('SoundChain')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open SoundChain',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Feed',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.loadURL(`${APP_URL}/dex/feed`)
        }
      },
    },
    {
      label: 'Radio',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.loadURL(RADIO_URL)
        }
      },
    },
    {
      label: 'Pulse (DMs + Calls)',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.loadURL(PULSE_URL)
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit SoundChain',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
      }
    }
  })
}

// App lifecycle
app.whenReady().then(() => {
  createWindow()
  createTray()

  // macOS: re-create window when dock icon clicked
  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
    } else {
      createWindow()
    }
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle IPC from preload
ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.handle('show-notification', (event, { title, body, url }) => {
  const notif = new Notification({ title, body, icon: path.join(__dirname, 'assets', 'icon.png') })
  notif.on('click', () => {
    if (mainWindow && url) {
      mainWindow.show()
      mainWindow.loadURL(url.startsWith('/') ? `${APP_URL}${url}` : url)
    }
  })
  notif.show()
})
