/**
 * SoundChain Electron Preload — IPC bridge between web and native
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('soundchainElectron', {
  // App info
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  isElectron: true,
  platform: process.platform,

  // Native notifications (for incoming calls when window is hidden)
  showNotification: (title, body, url) =>
    ipcRenderer.invoke('show-notification', { title, body, url }),
})
